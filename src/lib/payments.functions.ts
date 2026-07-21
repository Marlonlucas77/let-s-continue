import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

// Preço fixo (em centavos) de uma liga adicional além do limite do plano.
const EXTRA_LEAGUE_PRICE_CENTS = 500; // R$5,00
const EXTRA_LEAGUE_CURRENCY = "brl";

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
// Liga adicional (R$5) — pagamento avulso
// -----------------------------------------------------------------
// Usuário atingiu o limite do plano e quer adicionar mais 1 liga.
// Abrimos um Checkout Stripe one-time (BRL 5,00, cartão/Pix). No retorno,
// a página /checkout/league-return chama confirmExtraLeaguePurchase, que
// valida a Session no Stripe (payment_status = paid) e insere a liga com
// is_locked=true e is_paid_extra=true — só uma vez por session_id.

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
      const { data: { user } } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: context.userId,
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{
          price_data: {
            currency: EXTRA_LEAGUE_CURRENCY,
            product_data: {
              name: `Liga extra: ${data.leagueName}${data.country ? ` (${data.country})` : ""}`,
              description: "Adiciona 1 liga além do limite do seu plano — trava permanente.",
            },
            unit_amount: EXTRA_LEAGUE_PRICE_CENTS,
          },
          quantity: 1,
        }],
        payment_intent_data: {
          description: `Liga extra: ${data.leagueName}`,
        },
        success_url: `${data.returnUrl}${data.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: data.returnUrl,
        metadata: {
          userId: context.userId,
          kind: "extra_league",
          leagueId: String(data.leagueId),
          season: String(data.season),
          leagueName: data.leagueName,
          country: data.country ?? "",
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
    // Idempotência: se já processamos essa session, retorna sem cobrar/inserir de novo.
    const { data: already } = await supabase
      .from("tracked_leagues")
      .select("id")
      .eq("user_id", userId)
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    if (already) return { ok: true, alreadyProcessed: true };

    let session;
    try {
      const stripe = createStripeClient(data.environment);
      session = await stripe.checkout.sessions.retrieve(data.sessionId);
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
    if (session.payment_status !== "paid") {
      return { ok: false, error: `Pagamento ainda não confirmado (status: ${session.payment_status}).` };
    }
    const m = session.metadata ?? {};
    if (m.kind !== "extra_league") return { ok: false, error: "Checkout inválido." };
    if (m.userId !== userId) return { ok: false, error: "Esse checkout é de outro usuário." };
    const leagueId = Number(m.leagueId);
    const season = Number(m.season);
    if (!leagueId || !season || !m.leagueName) return { ok: false, error: "Dados da liga faltando no checkout." };

    const { error } = await supabase.from("tracked_leagues").upsert({
      user_id: userId,
      league_id: leagueId,
      season,
      league_name: m.leagueName,
      country: m.country || null,
      include_stats: false,
      is_locked: true,
      is_paid_extra: true,
      stripe_session_id: data.sessionId,
    }, { onConflict: "user_id,league_id,season" });
    if (error) return { ok: false, error: error.message };
    return { ok: true, league: { leagueId, season, leagueName: m.leagueName, country: m.country || null } };
  });

