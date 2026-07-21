// Limites por plano de assinatura. Servidor-only.
export type PlanId = "free" | "basic" | "pro" | "elite";

export interface PlanLimits {
  leagues: number; // Infinity = ilimitado
  dailyPredictions: number; // Infinity = ilimitado
}

// Limite DIÁRIO de previsões com IA (antes era mensal — trocado a pedido).
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { leagues: 1, dailyPredictions: 2 },
  basic: { leagues: 3, dailyPredictions: 8 },
  pro: { leagues: 15, dailyPredictions: 25 },
  elite: { leagues: Infinity, dailyPredictions: Infinity },
};

// Preços mensais (mesmos valores exibidos em /pricing) — usado pra
// calcular a receita estimada no painel admin. Se o preço mudar lá,
// atualize aqui também.
export const PLAN_PRICES_BRL: Record<PlanId, number> = {
  free: 0,
  basic: 19.99,
  pro: 34.99,
  elite: 64.99,
};

function priceIdToPlan(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId.startsWith("elite")) return "elite";
  if (priceId.startsWith("pro")) return "pro";
  if (priceId.startsWith("basic")) return "basic";
  return "free";
}

function paidStatusIsActive(status: string | null | undefined, currentPeriodEnd: string | null | undefined) {
  const statusKeepsAccess = ["active", "trialing", "past_due"].includes(status ?? "");
  const notExpired = !currentPeriodEnd || new Date(currentPeriodEnd) > new Date();
  return statusKeepsAccess && notExpired;
}

export async function getUserPlan(
  supabase: any,
  userId: string,
): Promise<{ plan: PlanId; limits: PlanLimits }> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, price_id, status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  let plan: PlanId = "free";
  const activeSub = (data ?? []).find((sub: any) => paidStatusIsActive(sub.status, sub.current_period_end));
  if (activeSub) {
    plan = priceIdToPlan(activeSub.plan ?? activeSub.price_id);
  }
  return { plan, limits: PLAN_LIMITS[plan] };
}

export async function assertLeagueQuota(supabase: any, userId: string, adding = 1) {
  const { limits, plan } = await getUserPlan(supabase, userId);
  if (limits.leagues === Infinity) return;
  const { count } = await supabase
    .from("tracked_leagues")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const current = count ?? 0;
  if (current + adding > limits.leagues) {
    throw new Error(
      `Limite do plano ${plan.toUpperCase()} atingido: ${limits.leagues} liga(s). Faça upgrade em /pricing.`,
    );
  }
}

export async function assertPredictionQuota(supabase: any, userId: string) {
  const { limits, plan } = await getUserPlan(supabase, userId);
  if (limits.dailyPredictions === Infinity) return;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_prediction_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  const current = count ?? 0;
  if (current >= limits.dailyPredictions) {
    throw new Error(
      `Limite do plano ${plan.toUpperCase()} atingido: ${limits.dailyPredictions} previsões IA/dia. Faça upgrade em /pricing.`,
    );
  }
}
