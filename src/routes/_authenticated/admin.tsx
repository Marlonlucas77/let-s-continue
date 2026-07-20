import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminToggleRole, adminStats, adminCronStatus, checkIsAdmin } from "@/lib/admin.functions";
import { Shield, Users, Trophy, Layers, ListChecks, Loader2, ShieldOff, ShieldCheck, DollarSign, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(adminListUsers);
  const statsFn = useServerFn(adminStats);
  const toggleFn = useServerFn(adminToggleRole);
  const qc = useQueryClient();

  const { data: check, isLoading: checking } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => await checkFn(),
  });

  const isAdmin = check?.isAdmin === true;

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => await statsFn(),
    enabled: isAdmin,
  });

  const cronFn = useServerFn(adminCronStatus);
  const { data: cron } = useQuery({
    queryKey: ["admin-cron"],
    queryFn: async () => await cronFn(),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => await listFn(),
    enabled: isAdmin,
  });

  const toggleMut = useMutation({
    mutationFn: async (v: { userId: string; role: "admin" | "moderator"; grant: boolean }) =>
      await toggleFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Papel atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (checking) return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verificando permissões...</div>;

  if (!isAdmin) return (
    <div className="max-w-lg card-surface p-8 text-center">
      <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h1 className="font-display text-xl font-bold mb-1">Acesso restrito</h1>
      <p className="text-sm text-muted-foreground">Apenas administradores podem ver esta página.</p>
    </div>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Painel admin
        </h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários, papéis e visão geral do sistema.</p>
      </div>

      {stats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard icon={Users} label="Usuários" value={stats.users} />
          <StatCard icon={Trophy} label="Jogos" value={stats.matches} />
          <StatCard icon={ListChecks} label="Previsões" value={stats.predictions} />
          <StatCard icon={Layers} label="Times" value={stats.teams} />
          <StatCard icon={Layers} label="Ligas rastreadas" value={stats.trackedLeagues} />
          <div className="card-surface p-4 border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Receita estimada/mês
            </div>
            <div className="font-display text-2xl font-bold text-primary">
              {stats.monthlyRevenueBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>
        </div>
      )}

      {stats && Object.keys(stats.plans).length > 0 && (
        <div className="card-surface p-4">
          <h2 className="text-sm font-medium mb-1">Assinaturas ativas por plano</h2>
          <p className="text-[11px] text-muted-foreground mb-2">
            Receita é uma estimativa (assinantes ativos × preço atual em /pricing) — o valor exato cobrado fica no Stripe.
          </p>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.plans).map(([plan, count]) => (
              <div key={plan} className="rounded-md border border-border bg-input/40 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">{plan}:</span> <span className="font-mono font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cron && (
        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Saúde do cron</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-4">
            <div className="rounded-md border border-border bg-input/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">Última execução</div>
              <div className="text-sm font-medium">
                {cron.lastRun ? new Date(cron.lastRun.started_at).toLocaleString("pt-BR") : "Nunca rodou"}
              </div>
            </div>
            <div className="rounded-md border border-border bg-input/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">Ligas nunca processadas</div>
              <div className={`text-sm font-medium ${cron.neverRunLeagues > 0 ? "text-amber-400" : ""}`}>
                {cron.neverRunLeagues} de {cron.totalLeagues}
              </div>
            </div>
            <div className="rounded-md border border-border bg-input/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">Ligas desatualizadas (+12h)</div>
              <div className={`text-sm font-medium ${cron.staleLeagues > 0 ? "text-amber-400" : ""}`}>
                {cron.staleLeagues}
              </div>
            </div>
            <div className="rounded-md border border-border bg-input/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <div className="text-sm font-medium flex items-center gap-1">
                {cron.lastRun?.error ? (
                  <><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> <span className="text-destructive">Erro na última execução</span></>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Saudável</>
                )}
              </div>
            </div>
          </div>
          {cron.recentRuns.length > 0 && (
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">Últimas execuções</h3>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {cron.recentRuns.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-xs rounded-md bg-input/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString("pt-BR")}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${r.triggered_by === "manual" ? "bg-blue-500/20 text-blue-400" : "bg-muted text-muted-foreground"}`}>
                        {r.triggered_by === "manual" ? "manual" : "agendado"}
                      </span>
                    </div>
                    {r.error ? (
                      <span className="text-destructive truncate max-w-[50%]">{r.error}</span>
                    ) : r.finished_at ? (
                      <span className="text-primary">{r.processed_count ?? 0} liga(s), {r.live_fixtures_updated ?? 0} jogo(s) ao vivo</span>
                    ) : (
                      <span className="text-muted-foreground">Em andamento...</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium">Usuários ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-input/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-left p-3">Papéis</th>
                <th className="text-left p-3">Último login</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isAdm = u.roles.includes("admin");
                return (
                  <tr key={u.id}>
                    <td className="p-3 font-mono text-xs">{u.email}</td>
                    <td className="p-3">{u.display_name ?? "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.plan === "free" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map((r) => (
                          <span key={r} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${r === "admin" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toggleMut.mutate({ userId: u.id, role: "admin", grant: !isAdm })}
                        disabled={toggleMut.isPending}
                        className="text-xs inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-input disabled:opacity-50"
                      >
                        {isAdm ? <><ShieldOff className="h-3 w-3" /> Remover admin</> : <><ShieldCheck className="h-3 w-3" /> Tornar admin</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="font-display text-2xl font-bold">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}
