import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function planFromPrice(priceLookupKey: string | null | undefined): string {
  if (!priceLookupKey) return "free";
  if (priceLookupKey.startsWith("elite")) return "elite";
  if (priceLookupKey.startsWith("pro")) return "pro";
  if (priceLookupKey.startsWith("basic")) return "basic";
  return "free";
}

// Liga extra: mantém a linha em tracked_leagues sincronizada com o
// ciclo de vida da assinatura Stripe correspondente.
async function handleExtraLeagueUpsert(subscription: any) {
  const userId = subscription.metadata?.userId;
  const leagueId = Number(subscription.metadata?.leagueId);
  const season = Number(subscription.metadata?.season);
  if (!userId || !leagueId || !season) return;
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  await (getSupabase().from("tracked_leagues") as any)
    .update({
      extra_stripe_subscription_id: subscription.id,
      extra_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      extra_status: subscription.status,
    })
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("season", season);
}

async function handleExtraLeagueDeleted(subscription: any) {
  // Fires no fim real do período (mesmo com cancel_at_period_end=true),
  // então podemos remover a liga com segurança.
  await (getSupabase().from("tracked_leagues") as any)
    .delete()
    .eq("extra_stripe_subscription_id", subscription.id);
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  if (subscription.metadata?.kind === "extra_league") {
    await handleExtraLeagueUpsert(subscription);
    return;
  }
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceLookupKey = item?.price?.lookup_key
    ?? item?.price?.metadata?.lovable_external_id
    ?? item?.price?.id
    ?? null;
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await (getSupabase().from("subscriptions") as any).upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceLookupKey,
      plan: planFromPrice(priceLookupKey),
      payment_method: "stripe",
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId || !userId) {
    console.error("Checkout completed without subscription or userId metadata");
    return;
  }

  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"],
  });

  await handleSubscriptionUpsert(
    {
      ...subscription,
      metadata: { ...(subscription.metadata ?? {}), userId },
    },
    env,
  );

  // Comissão de afiliado: 50% do primeiro pagamento (planos, não liga extra).
  if ((subscription.metadata as any)?.kind !== "extra_league") {
    try {
      const amountTotal = Number(session.amount_total ?? 0);
      if (amountTotal > 0) {
        const { data: ref } = await getSupabase()
          .from("referrals")
          .select("referrer_id")
          .eq("referred_id", userId)
          .maybeSingle();
        const referrerId = (ref as any)?.referrer_id;
        if (referrerId) {
          const commissionCents = Math.floor(amountTotal * 0.5);
          const { data: inserted } = await (getSupabase().from("affiliate_commissions") as any).upsert(
            {
              referrer_id: referrerId,
              referred_id: userId,
              stripe_subscription_id: subscription.id,
              amount_cents: commissionCents,
              currency: (session.currency ?? "brl").toLowerCase(),
              status: "pending",
            },
            { onConflict: "stripe_subscription_id" },
          ).select("id").maybeSingle();

          // Envia e-mail de notificação ao afiliado (não bloqueante)
          if (inserted) {
            try {
              const { data: referrer } = await getSupabase()
                .from("profiles")
                .select("email, pix_key")
                .eq("id", referrerId)
                .maybeSingle();
              const { data: referred } = await getSupabase()
                .from("profiles")
                .select("email")
                .eq("id", userId)
                .maybeSingle();
              if ((referrer as any)?.email) {
                const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
                const amountBRL = (commissionCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                await sendTemplateEmail("affiliate-commission", (referrer as any).email, {
                  templateData: {
                    amount: amountBRL,
                    referredEmail: (referred as any)?.email ?? "novo cliente",
                    hasPix: Boolean((referrer as any).pix_key),
                    affiliateUrl: "https://placarcerto.ia.br/affiliate",
                  },
                  idempotencyKey: `affiliate-commission-${subscription.id}`,
                });
              }
            } catch (e) {
              console.error("Affiliate commission email error:", e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Affiliate commission error:", e);
    }
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  if (subscription.metadata?.kind === "extra_league") {
    await handleExtraLeagueDeleted(subscription);
    return;
  }
  await (getSupabase().from("subscriptions") as any)
    .update({ status: "canceled", plan: "free", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
              break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await handleSubscriptionUpsert(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object, env);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
