import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CreditCard, Trophy, Target, Sparkles, Crown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getMyAccount } from "@/lib/account.functions";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Minha conta — Placar Certo" },
      { name: "description", content: "Plano atual, uso de hoje e histórico de acertos." },
    ],
  }),
});

const PLAN_LABEL: Record<string, string> = {
  free: "Grátis",
  basic: "Básico",
  pro: "Pro",
  elite: "Elite",
};

function AccountPage() {
  const getAccountFn = useServerFn(getMyAccount);
  const portalFn = useServerFn(createPortalSession);

  const { data, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: async () => await getAccountFn(),
  });

  const portalMut = useMutation({
    mutationFn: async () => {
      const res: any = await portalFn({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in res) throw new Error(res.error);
      return res.url as string;
    },
    onSuccess: (url) => window.open(url, "_blank"),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  const { email, plan, limits, usage, subscription, stats } = data;
  const pctLeagues = limits.leagues ? Math.min(100, (usage.leagues / limits.leagues) * 100) : 100;
  const pctAI = limits.dailyPredictions ? Math.min(100, (usage.aiPredictions / limits.dailyPredictions) * 100) : 100;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      {/* Plano */}
      <div className="card-surface p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Plano atual</div>
            <div className="mt-1 flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-display text-2xl font-bold">{PLAN_LABEL[plan] ?? plan}</span>
            </div>
            {subscription?.currentPeriodEnd && (
              <div className="text-xs text-muted-foreground mt-2">
                {subscription.cancelAtPeriodEnd ? "Acesso até " : "Renova em "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                {subscription.status === "past_due" && (
                  <span className="ml-2 rounded bg-yellow-500/20 text-yellow-500 px-2 py-0.5">Pagamento pendente</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {subscription ? (
              <button
                onClick={() => portalMut.mutate()}
                disabled={portalMut.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {portalMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Gerenciar plano
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : (
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Crown className="h-4 w-4" /> Fazer upgrade
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Uso de hoje */}
      <div className="card-surface p-5 space-y-4">
        <h2 className="font-display font-semibold">Uso de hoje</h2>
        <UsageBar label="Ligas monitoradas" value={usage.leagues} limit={limits.leagues} pct={pctLeagues} />
        <UsageBar label="Previsões IA" value={usage.aiPredictions} limit={limits.dailyPredictions} pct={pctAI} />
      </div>

      {/* Estatísticas pessoais */}
      <div className="card-surface p-5">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Meu desempenho
        </h2>
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda sem previsões conferidas. Faça previsões em <Link to="/predictions" className="text-primary underline">Previsão IA</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={Target} label="Precisão" value={`${stats.accuracy.toFixed(1)}%`} />
            <Stat icon={Sparkles} label="Acertos" value={`${stats.correct}/${stats.total}`} />
            <Stat icon={Trophy} label="Últimos 30d" value={`${stats.last30Correct}/${stats.last30Total}`} />
            <Stat icon={Crown} label="Badge" value={badgeFor(stats.accuracy, stats.total)} />
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBar({ label, value, limit, pct }: { label: string; value: number; limit: number | null; pct: number }) {
  const critical = pct >= 90;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value}{limit !== null ? ` / ${limit}` : " (ilimitado)"}</span>
      </div>
      <div className="h-2 rounded-full bg-input overflow-hidden">
        <div
          className={`h-full ${critical ? "bg-destructive" : "bg-primary"}`}
          style={{ width: limit === null ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function badgeFor(acc: number, total: number): string {
  if (total < 10) return "—";
  if (acc >= 70) return "🏆 Ouro";
  if (acc >= 55) return "🥈 Prata";
  if (acc >= 40) return "🥉 Bronze";
  return "Iniciante";
}
