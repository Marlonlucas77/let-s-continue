import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

// Mesmo valor do plano grátis em plan-limits.server.ts (dailyPredictions).
// Se mudar um, mude o outro — mantidos separados porque esse aqui roda no
// cliente e aquele é server-only.
export const FREE_PREDICTION_LIMIT = 2;

export function useSubscription() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: sub } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: monthCount = 0 } = useQuery({
    queryKey: ["predictions-month", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", start.toISOString());
      return count ?? 0;
    },
  });

  const isPremium = !!sub && ["active", "trialing", "past_due"].includes(sub.status ?? "") &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  const remaining = Math.max(0, FREE_PREDICTION_LIMIT - monthCount);
  const canSavePrediction = isPremium || remaining > 0;

  return { isPremium, monthCount, remaining, canSavePrediction, subscription: sub };
}
