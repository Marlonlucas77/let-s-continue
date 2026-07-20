import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Radio, Trash2, Loader2, Globe, Search, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import {
  listAllLeagues, listTrackedLeagues, trackLeague, trackTopLeagues, untrackLeague, autoEnableDefaultLeagues,
} from "@/lib/api-sports.functions";
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

  const [query, setQuery] = useState("");

  const { data: all = [], isLoading: loadingAll, error: allErr } = useQuery({
    queryKey: ["all-leagues"],
    queryFn: async () => (await listAll({})) as League[],
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const { data: tracked = [], isLoading: loadingTracked } = useQuery({
    queryKey: ["tracked-leagues"],
    queryFn: async () => (await listTracked({})) as any[],
  });

  // Reforço pra quem já tem conta (criada antes dessa mudança, ou o
  // cadastro por algum motivo não conseguiu habilitar sozinho) e chega
  // aqui sem nenhuma liga — habilita as 10 padrão automaticamente, sem
  // precisar clicar em nada.
  const autoEnableFn = useServerFn(autoEnableDefaultLeagues);
  const autoEnableMut = useMutation({
    mutationFn: async () => autoEnableFn({}),
    onSuccess: (r: any) => {
      if (r.count > 0) qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
    },
  });
  useEffect(() => {
    if (!loadingTracked && tracked.length === 0 && autoEnableMut.isIdle) {
      autoEnableMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingTracked, tracked.length]);

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

  const trackMut = useMutation({
    mutationFn: async (l: League) => trackFn({ data: { leagueId: l.id, season: l.season, leagueName: l.name, country: l.country } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tracked-leagues"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const untrackMut = useMutation({
    mutationFn: async (id: string) => untrackFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracked-leagues"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const trackAllMut = useMutation({
    mutationFn: async () => trackAllFn({}),
    onSuccess: (r: any) => {
      toast.success(`${r.count} ligas habilitadas.`);
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cronMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/cron/refresh-fixtures", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      return json as { processed: number; results: any[] };
    },
    onSuccess: (r) => {
      toast.success(`${r.processed} liga(s) processada(s) agora.`);
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Você já começa com as 10 principais ligas habilitadas automaticamente. Aqui dá pra ver, adicionar mais ou remover a qualquer momento.</p>
      </div>

      {onboarding && (
        <div className="card-surface p-4 mb-6 border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display font-semibold mb-1">Bem-vindo(a)!</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Já habilitamos as 10 principais ligas do mundo pra você — não precisa escolher nada pra começar. Se quiser acompanhar mais ligas, é só habilitar abaixo, a qualquer momento.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Ir para o painel
              </Link>
            </div>
          </div>
        </div>
      )}

      {tracked.length > 0 && (
        <div className="card-surface p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Ligas selecionadas ({tracked.length})</h2>
          </div>
          <ul className="divide-y divide-border max-h-72 overflow-y-auto">
            {tracked.map((l: any) => (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{translateLeague(l.league_name)} <span className="text-muted-foreground">· {l.season}</span></div>
                  <div className="text-xs text-muted-foreground">{translateCountry(l.country) || "—"}</div>
                </div>
                <button onClick={() => untrackMut.mutate(l.id)} disabled={untrackMut.isPending} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-surface p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-semibold">Quer acompanhar mais ligas?</h2>
          <p className="text-xs text-muted-foreground">Você já começa com as 10 principais ligas do mundo habilitadas automaticamente. Se quiser mais, esse botão habilita ~100 competições relevantes de uma vez (grandes ligas, copas nacionais, continentais e seleções) — não a lista inteira da API (milhares, incluindo categorias de base e ligas amadoras). Quer algo bem específico fora dessa lista? Busca abaixo.</p>
        </div>
        <button
          onClick={() => trackAllMut.mutate()}
          disabled={trackAllMut.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {trackAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {trackAllMut.isPending ? "Habilitando..." : "Habilitar principais (~100)"}
        </button>
      </div>

      <div className="card-surface p-4 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div>
            <h2 className="font-display font-semibold">Forçar importação agora</h2>
            <p className="text-xs text-muted-foreground">O cron roda sozinho de tempos em tempos — clique aqui pra rodar na hora, sem esperar, e ver o resultado de cada liga processada.</p>
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
