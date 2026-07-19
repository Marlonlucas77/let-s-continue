import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchTeams, compareTeams } from "@/lib/api-sports.functions";
import { Swords, Search, Loader2, X, Sparkles } from "lucide-react";
import { translateCountry, translateTeam } from "@/lib/country-i18n";

export const Route = createFileRoute("/_authenticated/h2h")({
  component: H2HPage,
});

type Team = { id: number; name: string; country?: string; logo?: string };

function H2HPage() {
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);

  const compareFn = useServerFn(compareTeams);
  const { data: comp, isLoading, error, refetch } = useQuery({
    queryKey: ["compare", teamA?.id, teamB?.id],
    queryFn: async () => await compareFn({ data: { homeId: teamA!.id, awayId: teamB!.id } }),
    enabled: !!teamA && !!teamB && teamA.id !== teamB.id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> Confronto Direto
        </h1>
        <p className="text-sm text-muted-foreground">Escolha dois times e compare estatísticas e H2H.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <TeamPicker label="Time A (mandante)" team={teamA} onSelect={setTeamA} />
        <TeamPicker label="Time B (visitante)" team={teamB} onSelect={setTeamB} />
      </div>

      {teamA && teamB && teamA.id === teamB.id && (
        <p className="text-sm text-destructive text-center py-4">Escolha times diferentes.</p>
      )}

      {teamA && teamB && teamA.id !== teamB.id && (
        error ? (
          <div className="card-surface p-4 text-sm">
            <div className="text-destructive font-medium mb-2">Não foi possível carregar o comparativo</div>
            <div className="text-muted-foreground mb-3">{(error as Error).message}</div>
            <button onClick={() => refetch()} className="btn-primary text-xs">Tentar novamente</button>
          </div>
        ) : isLoading || !comp ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando comparativo...
          </div>
        ) : (
          <div className="space-y-6">
            {comp.notice && (
              <div className="card-surface p-3 text-xs text-amber-400">
                {comp.notice}
              </div>
            )}
            <div className="card-surface p-5">
              <div className="flex items-center justify-around gap-4 mb-4 flex-wrap">
                <TeamHead team={teamA} />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Previsão</div>
                  <div className="font-display text-3xl font-bold">
                    <span className="text-emerald-400">{comp.prediction.homeWinPct}%</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span className="text-yellow-400">{comp.prediction.drawPct}%</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span className="text-red-400">{comp.prediction.awayWinPct}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">V · E · D</div>
                </div>
                <TeamHead team={teamB} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div><div className="text-muted-foreground text-xs">Gols esperados</div><div className="font-mono font-bold">{comp.prediction.expectedGoals}</div></div>
                <div><div className="text-muted-foreground text-xs">Over 2.5</div><div className="font-mono font-bold">{comp.prediction.over25Pct}%</div></div>
                <div><div className="text-muted-foreground text-xs">Ambas marcam</div><div className="font-mono font-bold">{comp.prediction.bttsPct}%</div></div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TeamStatsCard team={teamA} data={comp.home} />
              <TeamStatsCard team={teamB} data={comp.away} />
            </div>

            {comp.h2h.games > 0 && (
              <div className="card-surface p-4">
                <div className="text-xs uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Confronto direto ({comp.h2h.games} jogos)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Metric label="Média de gols" value={(comp.h2h.avgFor + comp.h2h.avgAgainst).toFixed(2)} />
                  <Metric label="BTTS" value={`${comp.h2h.bttsPct}%`} />
                  <Metric label="Over 2.5" value={`${comp.h2h.over25Pct}%`} />
                  <Metric label={`${teamA.name.split(" ")[0]} venceu`} value={`${comp.h2h.wins}`} />
                </div>
                <div className="mt-3 space-y-1">
                  {comp.h2h.recent.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50 pb-1 last:border-0">
                      <span className="w-20">{m.date}</span>
                      <span className="flex-1 truncate">vs {m.opponent}</span>
                      <span className="font-mono">{m.gf}-{m.ga}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function TeamHead({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {team.logo && <img src={team.logo} className="h-14 w-14 object-contain" alt="" />}
      <span className="font-medium text-sm">{team.name}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono font-bold">{value}</div>
    </div>
  );
}

function TeamStatsCard({ team, data }: { team: Team; data: any }) {
  const hasData = data.hasData ?? data.games > 0;
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        {team.logo && <img src={team.logo} className="h-6 w-6 object-contain" alt="" />}
        <span className="font-semibold">{team.name}</span>
      </div>
      {!hasData ? (
        <div className="rounded-md border border-border/60 bg-input/40 p-3 text-sm text-muted-foreground">
          Histórico indisponível no momento. O comparativo acima usa uma estimativa base até a API liberar dados recentes desse time.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <Metric label="Vitórias" value={`${data.wins}/${data.games}`} />
            <Metric label="Gols/jogo" value={data.avgFor.toString()} />
            <Metric label="Sofridos/jogo" value={data.avgAgainst.toString()} />
            <Metric label="Over 2.5" value={`${data.over25Pct}%`} />
            <Metric label="BTTS" value={`${data.bttsPct}%`} />
            <Metric label="Clean sheets" value={`${data.cleanSheetPct}%`} />
          </div>
          <div className="flex gap-1">
            {data.form.map((r: string, i: number) => (
              <span
                key={i}
                className={`h-6 w-6 grid place-items-center rounded text-[10px] font-bold ${
                  r === "W" ? "bg-emerald-500/20 text-emerald-400" :
                  r === "L" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}
              >{r}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TeamPicker({ label, team, onSelect }: { label: string; team: Team | null; onSelect: (t: Team | null) => void }) {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const searchFn = useServerFn(searchTeams);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["h2h-search", label, term],
    queryFn: async () => (await searchFn({ data: { query: term } })) as Team[],
    enabled: term.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });


  if (team) {
    return (
      <div className="card-surface p-4">
        <div className="text-xs uppercase text-muted-foreground mb-2">{label}</div>
        <div className="flex items-center gap-3">
          {team.logo && <img src={team.logo} className="h-10 w-10 object-contain" alt="" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{translateTeam(team.name)}</div>
            <div className="text-xs text-muted-foreground truncate">{translateCountry(team.country) || "—"}</div>
          </div>
          <button onClick={() => onSelect(null)} className="text-muted-foreground hover:text-destructive p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-4">
      <div className="text-xs uppercase text-muted-foreground mb-2">{label}</div>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(query.trim()); }} className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-input border border-border rounded-md px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar time..."
            className="flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button type="submit" className="rounded-md bg-primary/80 px-3 py-2 text-xs font-medium text-primary-foreground">OK</button>
      </form>
      {isFetching && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> buscando</div>}
      {!isFetching && term.length >= 2 && results.length === 0 && (
        <div className="text-xs text-muted-foreground">Nenhum resultado.</div>
      )}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {results.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className="w-full flex items-center gap-2 rounded p-2 hover:bg-input text-left text-sm"
          >
            {t.logo && <img src={t.logo} className="h-6 w-6 object-contain" alt="" />}
            <span className="flex-1 truncate">{translateTeam(t.name)}</span>
            <span className="text-xs text-muted-foreground truncate">{translateCountry(t.country)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
