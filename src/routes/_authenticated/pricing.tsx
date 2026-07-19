import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, X } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { paymentsConfigured, getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);
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
      id: "free",
      name: "Grátis",
      price: "R$ 0",
      period: "para sempre",
      priceId: null as string | null,
      features: ["Até 10 times cadastrados", "Até 50 jogos registrados", "Previsões básicas", "Histórico de acertos"],
    },
    {
      id: "premium_monthly",
      name: "Premium Mensal",
      price: "R$ 14,90",
      period: "por mês",
      priceId: "premium_monthly" as string | null,
      highlight: true,
      features: ["Times e jogos ilimitados", "Importação CSV em massa", "Estatísticas avançadas e H2H", "Confiança da previsão", "Suporte prioritário"],
    },
    {
      id: "premium_yearly",
      name: "Premium Anual",
      price: "R$ 149,00",
      period: "por ano",
      priceId: "premium_yearly" as string | null,
      features: ["Tudo do Premium Mensal", "2 meses grátis", "Prioridade em novas features"],
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
            const isCurrent = (p.id === "free" && !isPremium) || (p.priceId && sub?.price_id === p.priceId && isPremium);
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
                  disabled={!!isCurrent || !p.priceId || !paymentsConfigured()}
                  onClick={() => p.priceId && setCheckoutPrice(p.priceId)}
                  className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${
                    p.highlight ? "bg-primary text-primary-foreground" : "border border-border"
                  }`}
                >
                  {isCurrent ? "Plano atual" : !p.priceId ? "Grátis" : "Assinar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {checkoutPrice && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setCheckoutPrice(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm"
            >
              <X className="h-4 w-4" /> Fechar
            </button>
            <StripeEmbeddedCheckout priceId={checkoutPrice} />
          </div>
        </div>
      )}
    </>
  );
}
