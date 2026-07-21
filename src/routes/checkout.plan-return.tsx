import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

const PLAN_LIMITS: Record<string, { name: string; leagues: number | "unlimited"; predictions: number | "unlimited" }> = {
  basic: { name: "Básico", leagues: 3, predictions: 8 },
  pro: { name: "Pro", leagues: 15, predictions: 25 },
  elite: { name: "Elite", leagues: "unlimited", predictions: "unlimited" },
  free: { name: "Grátis", leagues: 1, predictions: 2 },
};

const search = z.object({ session_id: z.string().optional() });

export const Route = createFileRoute("/checkout/plan-return")({
  validateSearch: (s) => search.parse(s),
  component: PlanReturn,
});

function PlanReturn() {
  const qc = useQueryClient();

  // Polling: o webhook Stripe pode levar alguns segundos para chegar.
  // Buscamos a assinatura mais recente até o plano atualizar (ou timeout).
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["plan-return-subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const env = getStripeEnvironment();
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from("tracked_leagues")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      return { sub, leaguesCount: count ?? 0 };
    },
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 2000;
      const active = d.sub?.status === "active" || d.sub?.status === "trialing";
      const isPaid = d.sub?.plan && d.sub.plan !== "free";
      return active && isPaid ? false : 2000;
    },
  });

  useEffect(() => {
    // Invalida caches globais quando o plano é confirmado
    if (data?.sub?.status === "active" && data.sub.plan && data.sub.plan !== "free") {
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["my-account"] });
    }
  }, [data, qc]);

  const plan = data?.sub?.plan ?? "free";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const isConfirmed = (data?.sub?.status === "active" || data?.sub?.status === "trialing") && plan !== "free";
  const current = data?.leaguesCount ?? 0;
  const remaining = limits.leagues === "unlimited" ? Infinity : Math.max(0, limits.leagues - current);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card-surface p-8 max-w-lg w-full">
        {!isConfirmed ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="font-display text-xl font-bold mb-2">Confirmando seu pagamento…</h1>
            <p className="text-sm text-muted-foreground">
              Assim que o Stripe liberar a assinatura, seu plano será ativado aqui. Isso pode levar alguns segundos.
            </p>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="mt-6 text-xs underline text-muted-foreground hover:text-primary"
            >
              Atualizar agora
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
              <h1 className="font-display text-2xl font-bold">
                Plano {limits.name} ativado!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Obrigado! Sua assinatura já está valendo.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-4 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                Você desbloqueou:
              </div>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li>
                  •{" "}
                  <span className="text-foreground font-medium">
                    {limits.leagues === "unlimited" ? "Ligas ilimitadas" : `Até ${limits.leagues} ligas monitoradas`}
                  </span>
                </li>
                <li>
                  •{" "}
                  <span className="text-foreground font-medium">
                    {limits.predictions === "unlimited"
                      ? "Previsões de IA ilimitadas"
                      : `${limits.predictions} previsões de IA por dia`}
                  </span>
                </li>
                {plan !== "elite" && (
                  <li>• Ligas extras disponíveis por <span className="text-foreground font-medium">R$5/mês</span> cada</li>
                )}
              </ul>
            </div>

            {limits.leagues !== "unlimited" && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 mb-6">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Próximo passo:</span> escolha suas ligas.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você já tem <span className="text-foreground font-medium">{current}</span> de{" "}
                  <span className="text-foreground font-medium">{limits.leagues}</span> ligas ativas.
                  {remaining > 0 && (
                    <>
                      {" "}Você pode adicionar mais{" "}
                      <span className="text-primary font-semibold">
                        {remaining} liga{remaining > 1 ? "s" : ""}
                      </span>{" "}
                      sem custo adicional.
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/settings"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium"
              >
                Escolher minhas ligas <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
              >
                Ir para o painel
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
