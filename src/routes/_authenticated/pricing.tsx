import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { paymentsConfigured, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession, createPortalSession } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const currentPlan = sub?.plan ?? "free";
  const isPremium = currentPlan === "premium" && (sub?.status === "active" || sub?.status === "trialing");

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const plans = [
    {
      id: "basic_monthly",
      name: "Básico",
      price: "R$ 14,99",
      period: "por mês",
      priceId: "basic_monthly" as string | null,
      features: [
        "Até 3 ligas monitoradas",
        "8 previsões de IA por dia",
        "Estatísticas básicas",
        "Alertas de jogos do dia",
      ],
    },
    {
      id: "pro_monthly",
      name: "Pro",
      price: "R$ 29,99",
      period: "por mês",
      priceId: "pro_monthly" as string | null,
      highlight: true,
      features: [
        "Até 15 ligas monitoradas",
        "25 previsões de IA por dia",
        "Comparação entre times avançada",
        "Nível de confiança da IA",
        "Previsões de escanteios e cartões",
      ],
    },
    {
      id: "elite_monthly",
      name: "Elite",
      price: "R$ 59,99",
      period: "por mês",
      priceId: "elite_monthly" as string | null,
      features: [
        "Ligas e previsões ilimitadas",
        "Previsões de escanteios e cartões",
        "Odds ao vivo e valor esperado",
        "Análises comparativas ilimitadas",
        "Suporte prioritário 24/7",
      ],
    },
  ];

  return (
    <>
      <PaymentTestModeBanner />
      <div className="max-w-5xl">
        <h1 className="font-display text-3xl font-bold">Planos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plano atual: <span className="text-primary font-semibold">{isPremium ? "Premium" : "Grátis"}</span>
          {isPremium && (
            <button onClick={openPortal} disabled={portalLoading} className="ml-3 text-xs underline text-muted-foreground hover:text-primary">
              {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          )}
        </p>

        <div className="grid gap-6 mt-8 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = (p.id === "free" && !isPremium) || (p.priceId && sub?.plan === p.id && isPremium);
            return (
              <div key={p.id} className={`card-surface p-6 relative ${p.highlight ? "border-primary/50" : ""}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3" />Mais popular
                  </div>
                )}
                <h2 className="font-display text-2xl font-bold">{p.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">/ {p.period}</span>
                </div>
                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={!!isCurrent || !p.priceId || !paymentsConfigured() || loadingPrice === p.priceId}
                  onClick={async () => {
                    if (!p.priceId) return;
                    setLoadingPrice(p.priceId);
                    try {
                      const result = await createCheckoutSession({
                        data: {
                          priceId: p.priceId,
                          environment: getStripeEnvironment(),
                          returnUrl: `${window.location.origin}/pricing`,
                        },
                      });
                      if ("error" in result) throw new Error(result.error);
                      window.location.href = result.url;
                    } catch (e: any) {
                      alert(e.message);
                      setLoadingPrice(null);
                    }
                  }}
                  className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                    p.highlight ? "bg-primary text-primary-foreground" : "border border-border"
                  }`}
                >
                  {isCurrent ? "Plano atual" : !p.priceId ? "Grátis" : loadingPrice === p.priceId ? "Redirecionando..." : "Assinar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
