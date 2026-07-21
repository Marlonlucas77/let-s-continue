import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

// Preço da liga adicional (assinatura recorrente mensal) — R$5,00/mês.
const EXTRA_LEAGUE_LOOKUP_KEY = "extra_league_monthly";

type CheckoutResult = { url: string } | { error: string };
type PortalResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const c = existing.data[0];
      if (c.metadata?.userId !== options.userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: options.userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Preço não encontrado");
      const stripePrice = prices.data[0];
      const { data: { user } } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: context.userId,
      });
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        success_url: data.returnUrl,
        cancel_url: data.returnUrl,
        customer: customerId,
        metadata: { userId: context.userId },
        subscription_data: { metadata: { userId: context.userId } },
      });
      return { url: session.url ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "Nenhuma assinatura encontrada" };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// -----------------------------------------------------------------
// Liga adicional — assinatura recorrente R$5/mês por liga
// -----------------------------------------------------------------
// O usuário atingiu o limite do plano e quer +1 liga. Abrimos um Checkout
// Stripe em modo "subscription" (cartão/Pix) usando o preço recorrente
// `extra_league_monthly`. A metadata da subscription carrega os dados da
// liga para que o webhook consiga liberar / atualizar / remover ela ao
// longo do ciclo de vida da assinatura.

const extraLeagueSchema = z.object({
  leagueId: z.number().int(),
  season: z.number().int(),
  leagueName: z.string(),
  country: z.string().optional().nullable(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

export const createExtraLeagueCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => extraLeagueSchema.parse(d))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [EXTRA_LEAGUE_LOOKUP_KEY] });
      if (!prices.data.length) throw new Error("Preço da liga extra não encontrado");
      const stripePrice = prices.data[0];

      const { data: { user } } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: context.userId,
      });
      const extraLeagueMetadata = {
        userId: context.userId,
        kind: "extra_league",
        leagueId: String(data.leagueId),
        season: String(data.season),
        leagueName: data.leagueName,
        country: data.country ?? "",
      };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        success_url: `${data.returnUrl}${data.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: data.returnUrl,
        metadata: extraLeagueMetadata,
        subscription_data: {
          description: `Liga adicional: ${data.leagueName}`,
          metadata: extraLeagueMetadata,
        },
      });
      return { url: session.url ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const confirmExtraLeaguePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sessionId: z.string().min(3), environment: z.enum(["sandbox", "live"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Idempotência: se já processamos essa session, retorna sem inserir de novo.
    const { data: already } = await supabase
      .from("tracked_leagues")
      .select("id, league_name")
      .eq("user_id", userId)
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (already) {
      return { ok: true, alreadyProcessed: true, league: { leagueName: already.league_name } };
    }

    let session;
    try {
      const stripe = createStripeClient(data.environment);
      session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription"],
      });
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
    // Pix pode ficar "processing" por alguns minutos; consideramos ok também.
    const okStatuses = new Set(["paid", "no_payment_required"]);
    if (!okStatuses.has(session.payment_status ?? "")) {
      return { ok: false, error: `Pagamento ainda não confirmado (status: ${session.payment_status}).` };
    }
    const m = session.metadata ?? {};
    if (m.kind !== "extra_league") return { ok: false, error: "Checkout inválido." };
    if (m.userId !== userId) return { ok: false, error: "Esse checkout é de outro usuário." };
    const leagueId = Number(m.leagueId);
    const season = Number(m.season);
    if (!leagueId || !season || !m.leagueName) return { ok: false, error: "Dados da liga faltando no checkout." };

    const subscription: any = session.subscription;
    const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id ?? null;
    const item = subscription?.items?.data?.[0];
    const periodEndSeconds = item?.current_period_end ?? subscription?.current_period_end ?? null;
    const currentPeriodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null;

    const { error } = await supabase.from("tracked_leagues").upsert({
      user_id: userId,
      league_id: leagueId,
      season,
      league_name: m.leagueName,
      country: m.country || null,
      include_stats: false,
      is_locked: false,
      is_paid_extra: true,
      stripe_session_id: data.sessionId,
      extra_stripe_subscription_id: subscriptionId,
      extra_current_period_end: currentPeriodEnd,
      extra_status: subscription?.status ?? "active",
    }, { onConflict: "user_id,league_id,season" });
    if (error) return { ok: false, error: error.message };
    return { ok: true, league: { leagueId, season, leagueName: m.leagueName, country: m.country || null } };
  });
