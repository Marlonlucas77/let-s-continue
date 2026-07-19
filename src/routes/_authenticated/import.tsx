import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Download, Loader2, Radio, Trash2, RefreshCw } from "lucide-react";
import {
  searchLeagues, importFixtures, trackLeague, untrackLeague, listTrackedLeagues,
} from "@/lib/api-sports.functions";
import { translateCountry, translateLeague } from "@/lib/country-i18n";

export const Route = createFileRoute("/_authenticated/import")({
  component: ImportPage,
});

type League = { id: number; name: string; type: string; country: string; logo: string; seasons: number[]; };

function ImportPage() {
  const qc = useQueryClient();
  const search = useServerFn(searchLeagues);
  const importFn = useServerFn(importFixtures);
  const trackFn = useServerFn(trackLeague);
  const untrackFn = useServerFn(untrackLeague);
  const listTracked = useServerFn(listTrackedLeagues);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<League[]>([]);

  const { data: tracked = [] } = useQuery({
    queryKey: ["tracked-leagues"],
    queryFn: async () => (await listTracked({})) as any[],
  });

  const searchMut = useMutation({
    mutationFn: async (q: string) => search({ data: { query: q } }),
    onSuccess: (r) => { setResults(r as League[]); if ((r as any[]).length === 0) toast.info("Nenhuma liga encontrada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async (v: { leagueId: number; season: number; leagueName: string; country: string; includeStats: boolean }) =>
      importFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`Importados ${r.imported} jogo(s), ${r.teamsCreated} time(s), ${r.skipped} ignorado(s)${r.statsFetched ? `, estatísticas em ${r.statsFetched} jogo(s)` : ""}`);
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const trackMut = useMutation({
    mutationFn: async (v: { leagueId: number; season: number; leagueName: string; country?: string; includeStats?: boolean }) =>
      trackFn({ data: v }),
    onSuccess: () => { toast.success("Liga monitorada — atualiza automaticamente todo dia"); qc.invalidateQueries({ queryKey: ["tracked-leagues"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const untrackMut = useMutation({
    mutationFn: async (id: string) => untrackFn({ data: { id } }),
    onSuccess: () => { toast.success("Monitoramento removido"); qc.invalidateQueries({ queryKey: ["tracked-leagues"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Importar da API-Sports</h1>
        <p className="text-sm text-muted-foreground">Busque uma liga, importe temporadas ou monitore para que o sistema busque os jogos e resultados automaticamente via API.</p>
      </div>

      {tracked.length > 0 && (
        <div className="card-surface p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Ligas monitoradas ({tracked.length})</h2>
          </div>
          <ul className="divide-y divide-border">
            {tracked.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{translateLeague(l.league_name)} <span className="text-muted-foreground">· {l.season}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {translateCountry(l.country) || "—"} · última atualização: {l.last_run_at ? new Date(l.last_run_at).toLocaleString("pt-BR") : "aguardando primeira execução"}
                  </div>
                </div>
                <button onClick={() => untrackMut.mutate(l.id)} disabled={untrackMut.isPending} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Cron diário às 04:00 UTC atualiza jogos finalizados.</p>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (query.trim().length >= 2) searchMut.mutate(query.trim()); }}
        className="card-surface p-4 mb-6 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Premier League, Brasileirao, Serie A..."
          className="flex-1 rounded-md bg-input border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searchMut.isPending || query.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {searchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </form>

      <div className="space-y-3">
        {results.map((l) => (
          <LeagueRow
            key={l.id}
            league={l}
            onImport={(season, includeStats) => importMut.mutate({ leagueId: l.id, season, leagueName: l.name, country: l.country, includeStats })}
            onTrack={(season, includeStats) => trackMut.mutate({ leagueId: l.id, season, leagueName: l.name, country: l.country, includeStats })}
            pending={importMut.isPending}
            tracking={trackMut.isPending}
          />
        ))}
        {results.length === 0 && !searchMut.isPending && (
          <p className="text-sm text-muted-foreground text-center py-8">Faça uma busca para listar ligas disponíveis.</p>
        )}
      </div>
    </div>
  );
}

function LeagueRow({ league, onImport, onTrack, pending, tracking }: {
  league: League;
  onImport: (season: number, includeStats: boolean) => void;
  onTrack: (season: number, includeStats: boolean) => void;
  pending: boolean;
  tracking: boolean;
}) {
  const [season, setSeason] = useState(league.seasons[0] ?? new Date().getFullYear());
  const [includeStats, setIncludeStats] = useState(false);
  return (
    <div className="card-surface p-4 flex items-center gap-3 flex-wrap">
      {league.logo && <img src={league.logo} alt="" className="h-10 w-10 object-contain" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{translateLeague(league.name)}</div>
        <div className="text-xs text-muted-foreground">{translateCountry(league.country)} · {league.type}</div>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="Busca escanteios e cartões (1 req extra por jogo, máx 40)">
        <input type="checkbox" checked={includeStats} onChange={(e) => setIncludeStats(e.target.checked)} />
        Escanteios/Cartões
      </label>
      <select value={season} onChange={(e) => setSeason(parseInt(e.target.value))} className="rounded-md bg-input border border-border px-2 py-1.5 text-sm">
        {league.seasons.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={() => onTrack(season, includeStats)} disabled={tracking} className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium disabled:opacity-50" title="Atualiza automaticamente todo dia">
        {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
        Monitorar
      </button>
      <button onClick={() => onImport(season, includeStats)} disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Importar
      </button>
    </div>
  );
}
