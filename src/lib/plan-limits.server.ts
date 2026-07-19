// Limites por plano de assinatura. Servidor-only.
export type PlanId = "free" | "basic" | "pro" | "elite";

export interface PlanLimits {
  leagues: number; // Infinity = ilimitado
  monthlyPredictions: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { leagues: 1, monthlyPredictions: 5 },
  basic: { leagues: 3, monthlyPredictions: 20 },
  pro: { leagues: 15, monthlyPredictions: 150 },
  elite: { leagues: Infinity, monthlyPredictions: Infinity },
};

function priceIdToPlan(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId.startsWith("elite")) return "elite";
  if (priceId.startsWith("pro")) return "pro";
  if (priceId.startsWith("basic")) return "basic";
  return "free";
}

export async function getUserPlan(
  supabase: any,
  userId: string,
): Promise<{ plan: PlanId; limits: PlanLimits }> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let plan: PlanId = "free";
  if (data && (data.status === "active" || data.status === "trialing")) {
    const notExpired =
      !data.current_period_end || new Date(data.current_period_end) > new Date();
    if (notExpired) plan = priceIdToPlan(data.plan);
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
  if (limits.monthlyPredictions === Infinity) return;
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  const current = count ?? 0;
  if (current >= limits.monthlyPredictions) {
    throw new Error(
      `Limite do plano ${plan.toUpperCase()} atingido: ${limits.monthlyPredictions} previsões IA/mês. Faça upgrade em /pricing.`,
    );
  }
}
