import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminToggleRole, adminStats, adminCronStatus, checkIsAdmin, adminRealRevenue } from "@/lib/admin.functions";
import { Shield, Users, Trophy, Layers, ListChecks, Loader2, ShieldOff, ShieldCheck, DollarSign, Activity, AlertTriangle, CheckCircle2, Wallet, RefreshCw } from "lucide-react";
import { useState } from "react";
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

  const revenueFn = useServerFn(adminRealRevenue);
  const [revEnv, setRevEnv] = useState<"live" | "sandbox">("live");
  const { data: revenue, isFetching: revLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ["admin-real-revenue", revEnv],
    queryFn: async () => await revenueFn({ data: { environment: revEnv } }),
    enabled: isAdmin,
    staleTime: 60_000,
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

      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Receita real (Stripe)</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
              <button
                onClick={() => setRevEnv("live")}
                className={`px-3 py-1 ${revEnv === "live" ? "bg-primary text-primary-foreground" : "bg-input/40 hover:bg-input"}`}
              >
                Live
              </button>
              <button
                onClick={() => setRevEnv("sandbox")}
                className={`px-3 py-1 ${revEnv === "sandbox" ? "bg-primary text-primary-foreground" : "bg-input/40 hover:bg-input"}`}
              >
                Sandbox
              </button>
            </div>
            <button
              onClick={() => refetchRevenue()}
              disabled={revLoading}
              className="inline-flex items-center gap-1 text-xs rounded-md border border-border px-2 py-1 hover:bg-input disabled:opacity-50"
            >
              {revLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar
            </button>
          </div>
        </div>

        {revLoading && !revenue && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando Stripe...
          </div>
        )}

        {revenue && !revenue.ok && (
          <div className="text-sm text-destructive">Erro: {revenue.error}</div>
        )}

        {revenue && revenue.ok && (
          <>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-3">
              <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
                <div className="text-xs text-muted-foreground mb-1">Mês atual (MTD)</div>
                <div className="font-display text-2xl font-bold text-primary">
                  {revenue.mtd.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="rounded-md border border-border bg-input/40 p-4">
                <div className="text-xs text-muted-foreground mb-1">Últimos 30 dias</div>
                <div className="font-display text-2xl font-bold">
                  {revenue.last30.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="rounded-md border border-border bg-input/40 p-4">
                <div className="text-xs text-muted-foreground mb-1">Total arrecadado</div>
                <div className="font-display text-2xl font-bold">
                  {revenue.allTime.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Soma de {revenue.invoiceCount} fatura(s) paga(s) no Stripe ({revenue.environment}).
              {Object.keys(revenue.byCurrency).length > 1 && (
                <> Atenção: há faturas em múltiplas moedas — valores em BRL exibidos assumem que todas são BRL. Detalhe por moeda: {Object.entries(revenue.byCurrency).map(([c, v]) => `${c.toUpperCase()} ${v.toFixed(2)}`).join(" · ")}.</>
              )}
            </div>
          </>
        )}
      </div>



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

      <AffiliateAdminSection isAdmin={isAdmin} />
    </div>
  );
}

function AffiliateAdminSection({ isAdmin }: { isAdmin: boolean }) {
  const listFn = useServerFn(adminListCommissions);
  const markFn = useServerFn(adminMarkCommissionPaid);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "paid" | "all">("pending");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-commissions", status],
    queryFn: async () => await listFn({ data: { status } }),
    enabled: isAdmin,
  });

  const markMut = useMutation({
    mutationFn: async (id: string) => await markFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Comissão marcada como paga.");
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (!isAdmin) return null;

  const pending = data.filter((c) => c.status === "pending");
  const totalPending = pending.reduce((s, c) => s + c.amount_cents, 0);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const exportCSV = () => {
    const rows = [
      ["Data", "Afiliado", "Email Pix?", "Chave Pix", "Tipo Pix", "Indicado", "Valor (R$)", "Status", "Pago em"],
      ...data.map((c) => [
        new Date(c.created_at).toLocaleDateString("pt-BR"),
        c.referrer_email ?? "",
        c.referrer_pix ? "Sim" : "Não",
        c.referrer_pix ?? "",
        c.referrer_pix_type ?? "",
        c.referred_email ?? "",
        (c.amount_cents / 100).toFixed(2).replace(".", ","),
        c.status,
        c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissoes-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-surface p-5 mt-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-medium inline-flex items-center gap-2"><Gift className="h-4 w-4" /> Comissões de afiliados</h2>
        <div className="flex gap-1 text-xs items-center">
          {(["pending", "paid", "all"] as const).map((s) => (
            <button key={s}
              onClick={() => setStatus(s)}
              className={`px-2 py-1 rounded-md border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {s === "pending" ? "Pendentes" : s === "paid" ? "Pagas" : "Todas"}
            </button>
          ))}
          <button
            onClick={exportCSV}
            disabled={!data.length}
            className="ml-2 px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </div>
      </div>
      {status === "pending" && (
        <p className="text-sm text-muted-foreground mb-3">
          Total a pagar: <strong className="text-foreground">{(totalPending / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
        </p>
      )}
      {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : !data.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma comissão.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr>
                <th className="py-2">Data</th>
                <th>Afiliado</th>
                <th>Chave Pix</th>
                <th>Indicado</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="text-muted-foreground">{c.referrer_email ?? "—"}</td>
                  <td>
                    {c.referrer_pix ? (
                      <button onClick={() => copy(c.referrer_pix!)} className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary">
                        <Copy className="h-3 w-3" /> {c.referrer_pix} <span className="text-muted-foreground">({c.referrer_pix_type})</span>
                      </button>
                    ) : <span className="text-xs text-amber-400">Sem chave Pix</span>}
                  </td>
                  <td className="text-muted-foreground">{c.referred_email ?? "—"}</td>
                  <td className="font-medium">{(c.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>
                    {c.status === "paid" ? (
                      <span className="text-xs text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pago</span>
                    ) : (
                      <span className="text-xs text-amber-400">Pendente</span>
                    )}
                  </td>
                  <td>
                    {c.status === "pending" && (
                      <button
                        onClick={() => markMut.mutate(c.id)}
                        disabled={markMut.isPending || !c.referrer_pix}
                        className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 disabled:opacity-40"
                      >
                        Marcar como pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
