import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Radio, Trash2, Loader2, Globe, Search, CheckCircle2, Sparkles } from "lucide-react";
import {
  listAllLeagues, listTrackedLeagues, trackLeague, trackTopLeagues, untrackLeague,
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

  const { data: tracked = [] } = useQuery({
    queryKey: ["tracked-leagues"],
    queryFn: async () => (await listTracked({})) as any[],
  });

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

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Escolha as ligas que você quer acompanhar. Isso filtra os jogos exibidos no app e o que o cron atualiza automaticamente. Você pode voltar aqui a qualquer momento.</p>
      </div>

      {onboarding && (
        <div className="card-surface p-4 mb-6 border border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display font-semibold mb-1">Bem-vindo(a)!</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Para começar, selecione as ligas que você quer acompanhar — ou habilite as principais do mundo de uma vez. Depois é só ir para o painel.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => trackAllMut.mutate()}
                  disabled={trackAllMut.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {trackAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Habilitar principais ligas
                </button>
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-input">
                  Ir para o painel
                </Link>
              </div>
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
          <h2 className="font-display font-semibold">Habilitar as principais ligas do mundo</h2>
          <p className="text-xs text-muted-foreground">~100 competições mais relevantes (grandes ligas, copas nacionais, continentais e seleções) — não a lista inteira da API (milhares, incluindo categorias de base e ligas amadoras). Quer algo específico fora dessa lista? Busca abaixo.</p>
        </div>
        <button
          onClick={() => trackAllMut.mutate()}
          disabled={trackAllMut.isPending}
          className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {trackAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {trackAllMut.isPending ? "Habilitando..." : "Habilitar principais"}
        </button>
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
