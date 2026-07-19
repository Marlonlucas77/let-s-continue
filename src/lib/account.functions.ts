import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserPlan } from "@/lib/plan-limits.server";

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes.user?.email ?? null;

    const { plan, limits } = await getUserPlan(supabase, userId);

    // Ligas ativas
    const { count: leaguesCount } = await supabase
      .from("tracked_leagues")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // Previsões IA do mês
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    const { count: aiCount } = await supabase
      .from("ai_prediction_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());

    // Assinatura mais recente
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, environment")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Estatísticas pessoais
    const { data: stats } = await supabase.rpc("get_my_prediction_stats", { _user: userId });
    const s = (stats as any[])?.[0] ?? { total: 0, correct: 0, accuracy: 0, last_30_correct: 0, last_30_total: 0 };

    return {
      email,
      plan,
      limits: {
        leagues: limits.leagues === Infinity ? null : limits.leagues,
        monthlyPredictions: limits.monthlyPredictions === Infinity ? null : limits.monthlyPredictions,
      },
      usage: {
        leagues: leaguesCount ?? 0,
        aiPredictions: aiCount ?? 0,
      },
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            environment: sub.environment,
          }
        : null,
      stats: {
        total: Number(s.total ?? 0),
        correct: Number(s.correct ?? 0),
        accuracy: Number(s.accuracy ?? 0),
        last30Correct: Number(s.last_30_correct ?? 0),
        last30Total: Number(s.last_30_total ?? 0),
      },
    };
  });
