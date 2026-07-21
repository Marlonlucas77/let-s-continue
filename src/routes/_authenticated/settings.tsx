import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Radio, Trash2, Loader2, Globe, Search, CheckCircle2, Sparkles, RefreshCw, Lock, ShoppingCart } from "lucide-react";
import {
  listAllLeagues, listTrackedLeagues, trackLeague, trackTopLeagues, untrackLeague, runFixturesRefreshNow,
} from "@/lib/api-sports.functions";
import { createExtraLeagueCheckout } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getMyAccount } from "@/lib/account.functions";
import { translateCountry, translateLeague } from "@/lib/country-i18n";

const searchSchema = z.object({ onboarding: z.union([z.literal("1"), z.literal(1)]).optional() });

export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (s) => searchSchema.parse(s),
  component: SettingsPage,
});

type League = { id: number; name: string; country: string; season: number };

function SettingsPage() {
  const { onboarding } = useSearch({ from: "/_authenticated/settings" });
  const qc = useQueryClient();
  const listAll = useServerFn(listAllLeagues);
  const listTracked = useServerFn(listTrackedLeagues);
  const trackFn = useServerFn(trackLeague);
  const trackAllFn = useServerFn(trackTopLeagues);
  const untrackFn = useServerFn(untrackLeague);
  const accountFn = useServerFn(getMyAccount);
  const extraCheckoutFn = useServerFn(createExtraLeagueCheckout);

  const [query, setQuery] = useState("");

  const { data: account } = useQuery({
    queryKey: ["my-account"],
    queryFn: async () => await accountFn(),
  });
  // null = ilimitado (plano Elite)
  const leagueLimit: number | null = account?.limits.leagues ?? null;

  const { data: all = [], isLoading: loadingAll, error: allErr } = useQuery({
    queryKey: ["all-leagues"],
    queryFn: async () => (await listAll({})) as League[],
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const { data: tracked = [] } = useQuery({
    queryKey: ["tracked-leagues"],
    queryFn: async () => (await listTracked({})) as any[],
  });

  const atLimit = leagueLimit != null && tracked.length >= leagueLimit;

  const trackedIds = useMemo(() => new Set(tracked.map((t: any) => Number(t.league_id))), [tracked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 200);
    return all.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      translateLeague(l.name).toLowerCase().includes(q) ||
      l.country.toLowerCase().includes(q) ||
      translateCountry(l.country).toLowerCase().includes(q)
    ).slice(0, 200);
  }, [all, query]);

  // Atualização otimista: o refetch da lista pode demorar por causa da
  // ordem serverFn -> invalidate -> nova chamada -> render. Enquanto isso
  // o usuário vê "Selecionar" ainda ali e acha que "não fixou". Aqui a
  // gente injeta a liga na cache na hora e conclui com refetch de reforço.
  const trackMut = useMutation({
    mutationFn: async (l: League) => trackFn({ data: { leagueId: l.id, season: l.season, leagueName: l.name, country: l.country } }),
    onMutate: async (l: League) => {
      await qc.cancelQueries({ queryKey: ["tracked-leagues"] });
      const previous = qc.getQueryData<any[]>(["tracked-leagues"]) ?? [];
      const optimistic = [
        { id: `optimistic-${l.id}-${l.season}`, league_id: l.id, season: l.season, league_name: l.name, country: l.country, include_stats: false, created_at: new Date().toISOString(), __optimistic: true },
        ...previous,
      ];
      qc.setQueryData(["tracked-leagues"], optimistic);
      return { previous };
    },
    onSuccess: (_r, l) => {
      toast.success(`${translateLeague(l.name)} adicionada.`);
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: any, _l, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tracked-leagues"], ctx.previous);
      toast.error(e?.message ?? "Não foi possível adicionar a liga.");
    },
  });

  const untrackMut = useMutation({
    mutationFn: async (id: string) => untrackFn({ data: { id } }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["tracked-leagues"] });
      const previous = qc.getQueryData<any[]>(["tracked-leagues"]) ?? [];
      qc.setQueryData(["tracked-leagues"], previous.filter((t) => t.id !== id));
      return { previous };
    },
    onSuccess: () => {
      toast.success("Liga removida.");
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tracked-leagues"], ctx.previous);
      toast.error(e?.message ?? "Não foi possível remover a liga.");
    },
  });

  const trackAllMut = useMutation({
    mutationFn: async () => trackAllFn({}),
    onSuccess: (r: any) => {
      toast.success(`${r.count} ligas habilitadas.`);
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Compra de liga extra: redireciona pro Stripe Checkout. Ao voltar em
  // /checkout/league-return, a session_id é validada e a liga é inserida.
  const extraMut = useMutation({
    mutationFn: async (l: League) => {
      const result = (await extraCheckoutFn({
        data: {
          leagueId: l.id,
          season: l.season,
          leagueName: l.name,
          country: l.country ?? null,
          returnUrl: `${window.location.origin}/checkout/league-return`,
          environment: getStripeEnvironment(),
        },
      })) as { url?: string; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.url) throw new Error("Stripe não retornou a URL do checkout.");
      window.location.href = result.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Não consegui abrir o checkout."),
  });

  const checkAdminFn = useServerFn(checkIsAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => await checkAdminFn({}),
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = !!adminCheck?.isAdmin;

  const cronFn = useServerFn(runFixturesRefreshNow);
  const cronMut = useMutation({
    mutationFn: async () => await cronFn({}),
    onSuccess: (r: any) => {
      toast.success(`${r.processed} liga(s) processada(s) agora.`);
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Escolha as ligas que você quer acompanhar{leagueLimit != null ? ` — seu plano permite até ${leagueLimit}` : ""}. Isso define o que aparece em Jogos e Previsão IA.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Adicione ou remova as ligas quando quiser. Ligas além do limite do plano custam <strong>R$5/mês</strong> cada — pagas por assinatura recorrente no Stripe (cartão ou Pix).
        </p>
      </div>

      {onboarding && (
        <div className="card-surface p-4 mb-6 border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display font-semibold mb-1">Bem-vindo(a)!</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {leagueLimit == null
                  ? "Seu plano permite ligas ilimitadas. Escolha abaixo quais você quer acompanhar."
                  : `Seu plano permite até ${leagueLimit} liga(s). Ligas extras custam R$5/mês cada — você pode adicionar mais quando precisar.`}
              </p>
              {leagueLimit != null && leagueLimit >= 3 && (
                <button
                  onClick={() => trackAllMut.mutate()}
                  disabled={trackAllMut.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {trackAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Preencher com as mais populares
                </button>
              )}
              <Link to="/dashboard" className="ml-3 text-xs text-muted-foreground hover:text-foreground">
                Pular por enquanto
              </Link>
            </div>
          </div>
        </div>
      )}

      {tracked.length > 0 && (
        <div className="card-surface p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">
              Ligas selecionadas ({tracked.length}{leagueLimit != null ? `/${leagueLimit}` : ""})
            </h2>
          </div>
          {atLimit && (
            <p className="text-xs text-amber-400 mb-3 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Limite do plano atingido. Ligas adicionais custam <strong className="mx-1">R$5/mês</strong> cada — busque abaixo e clique em "Adicionar por R$5/mês".
              <Link to="/pricing" className="underline ml-1">ver planos</Link>
            </p>
          )}
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {tracked.map((l: any) => {
              const isPending = l.__optimistic || typeof l.id !== "string" || !/^[0-9a-f-]{36}$/i.test(l.id);
              const isLocked = l.is_locked !== false;
              return (
                <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {translateLeague(l.league_name)} <span className="text-muted-foreground">· {l.season}</span>
                      {l.is_paid_extra && <span className="text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded">Extra</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{translateCountry(l.country) || "—"}</div>
                  </div>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Liga travada — não pode ser removida">
                      <Lock className="h-3.5 w-3.5" /> Travada
                    </span>
                  ) : (
                    <button
                      onClick={() => untrackMut.mutate(l.id)}
                      disabled={untrackMut.isPending}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-50"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}


      <div className="card-surface p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-semibold">Quer preencher rápido?</h2>
          <p className="text-xs text-muted-foreground">
            Esse botão seleciona as ligas mais populares do mundo pra você, até o limite do seu plano
            {leagueLimit != null ? ` (${leagueLimit})` : ""}. Prefere escolher uma por uma? Busca abaixo.
          </p>
        </div>
        <button
          onClick={() => trackAllMut.mutate()}
          disabled={trackAllMut.isPending || atLimit}
          className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {trackAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {trackAllMut.isPending ? "Habilitando..." : atLimit ? "Limite atingido" : "Preencher com populares"}
        </button>
      </div>

      {isAdmin && (
      <div className="card-surface p-4 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div>
            <h2 className="font-display font-semibold">Forçar importação agora (admin)</h2>
            <p className="text-xs text-muted-foreground">O cron roda sozinho de tempos em tempos — clique aqui pra rodar na hora, sem esperar. Isso afeta as ligas de todos os usuários, por isso é restrito a administradores.</p>
          </div>
          <button
            onClick={() => cronMut.mutate()}
            disabled={cronMut.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-input disabled:opacity-50 shrink-0"
          >
            {cronMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {cronMut.isPending ? "Rodando..." : "Rodar agora"}
          </button>
        </div>
        {cronMut.error && <p className="text-xs text-destructive">{(cronMut.error as Error).message}</p>}
        {cronMut.data && (
          <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1">{cronMut.data.processed} liga(s) processada(s) nessa execução:</p>
            {cronMut.data.results.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs rounded-md bg-input/40 px-2 py-1.5">
                <span className="truncate">{translateLeague(r.league)}</span>
                <span className={r.error ? "text-destructive" : "text-primary"}>
                  {r.error ? r.error : `${r.imported ?? 0} jogo(s), ${r.teamsCreated ?? 0} time(s)`}
                </span>
              </div>
            ))}
            {cronMut.data.processed === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma liga estava elegível pra rodar agora (todas rodaram nas últimas 12h).</p>
            )}
          </div>
        )}
      </div>
      )}

      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar liga ou país..."
            className="flex-1 rounded-md bg-input border border-border px-3 py-2 text-sm"
          />
        </div>
        {allErr ? (
          <p className="text-sm text-destructive py-4">{(allErr as Error).message}</p>
        ) : loadingAll ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando ligas...</div>
        ) : (
          <ul className="divide-y divide-border max-h-96 overflow-y-auto">
            {filtered.map((l) => {
              const isTracked = trackedIds.has(l.id);
              return (
                <li key={`${l.id}-${l.season}`} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{translateLeague(l.name)}</div>
                    <div className="text-xs text-muted-foreground">{translateCountry(l.country)} · {l.season}</div>
                  </div>
                  {isTracked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-4 w-4" /> Selecionada</span>
                  ) : atLimit ? (
                    <button
                      onClick={() => extraMut.mutate(l)}
                      disabled={extraMut.isPending}
                      className="text-xs rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3 py-1.5 font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
                      title="Liga extra — assinatura recorrente de R$5/mês"
                    >
                      {extraMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                      Adicionar por R$5/mês
                    </button>
                  ) : (
                    <button
                      onClick={() => trackMut.mutate(l)}
                      disabled={trackMut.isPending}
                      className="text-xs rounded-md bg-primary/10 border border-primary/40 text-primary px-3 py-1.5 font-medium disabled:opacity-50"
                    >
                      Selecionar
                    </button>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nenhuma liga encontrada.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
