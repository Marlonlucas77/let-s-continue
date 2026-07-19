import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { TeamCombobox } from "@/components/TeamCombobox";
import { getAiFixturePrediction } from "@/lib/predictions.functions";
import { Swords, Loader2, Wand2, Target, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/h2h")({
  component: H2HPage,
});

function H2HPage() {
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches-raw"],
    queryFn: async () => (await supabase.from("matches").select("home_team_id, away_team_id, match_date, home_goals, away_goals")).data ?? [],
  });

  const home = teams.find((t) => t.id === homeId);
  const away = teams.find((t) => t.id === awayId);

  const h2h = useMemo(() => {
    if (!homeId || !awayId) return [];
    return matches.filter((m) => (m.home_team_id === homeId && m.away_team_id === awayId) || (m.home_team_id === awayId && m.away_team_id === homeId));
  }, [matches, homeId, awayId]);

  const differentCompetition = !!home && !!away && (home.league ?? home.country) !== (away.league ?? away.country);
  const neverPlayed = !!home && !!away && h2h.length === 0;

  const teamsByLeague = useMemo(() => {
    const groups = new Map<string, typeof teams>();
    for (const t of teams) {
      const key = t.league || t.country || "Outros";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [teams]);

  const [leagueFilter, setLeagueFilter] = useState("");
  const filteredTeams = useMemo(() => {
    if (!leagueFilter) return teams;
    return teams.filter((t) => (t.league || t.country || "Outros") === leagueFilter);
  }, [teams, leagueFilter]);

  const [wantsAnalysis, setWantsAnalysis] = useState(false);

  const aiPredictFn = useServerFn(getAiFixturePrediction);
  const aiMut = useMutation({
    mutationFn: async () => {
      if (!home || !away) throw new Error("Selecione os dois times primeiro.");
      return aiPredictFn({
        data: {
          homeName: home.name,
          awayName: away.name,
          homeLeague: home.league ?? home.country,
          awayLeague: away.league ?? away.country,
        },
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { aiMut.reset(); setWantsAnalysis(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [homeId, awayId]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> Confronto Direto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare dois times com IA — usa conhecimento real sobre os times, sem depender de chamadas à API de futebol.
        </p>
      </div>

      {teams.length === 0 && (
        <div className="mt-6 card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há times cadastrados.</p>
        </div>
      )}

      {teams.length > 0 && (
      <div className="card-surface p-5 mt-6">
        <div className="mb-4">
          <label className="text-sm font-medium">Filtrar por liga</label>
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
          >
            <option value="">Todas as ligas</option>
            {teamsByLeague.map(([league]) => <option key={league} value={league}>{league}</option>)}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Time A (mandante)</label>
            <TeamCombobox teams={filteredTeams} value={homeId} onChange={setHomeId} placeholder="Digite pra buscar..." />
          </div>
          <div>
            <label className="text-sm font-medium">Time B (visitante)</label>
            <TeamCombobox teams={filteredTeams} value={awayId} onChange={setAwayId} placeholder="Digite pra buscar..." />
          </div>
        </div>
      </div>
      )}

      {homeId && awayId && homeId === awayId && (
        <p className="text-sm text-destructive text-center py-4">Escolha times diferentes.</p>
      )}

      {home && away && homeId !== awayId && !wantsAnalysis && (
        <div className="card-surface p-6 mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TeamBadge name={home.name} logoUrl={home.logo_url} size={36} />
              <span className="font-medium text-sm">{home.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">vs</span>
            <div className="flex items-center gap-2">
              <TeamBadge name={away.name} logoUrl={away.logo_url} size={36} />
              <span className="font-medium text-sm">{away.name}</span>
            </div>
          </div>
          <button
            onClick={() => { setWantsAnalysis(true); aiMut.mutate(); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Wand2 className="h-4 w-4" /> Comparar com IA
          </button>
        </div>
      )}

      {wantsAnalysis && neverPlayed && differentCompetition && (
        <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-400">Esses times nunca se enfrentaram</div>
            <div className="text-muted-foreground mt-0.5">
              {home?.name} e {away?.name} são de competições diferentes ({home?.league || home?.country || "?"} e {away?.league || away?.country || "?"}) e não há confronto direto no seu histórico.
              A análise abaixo é uma estimativa da IA baseada só no desempenho isolado de cada time — não representa um jogo real esperado.
            </div>
          </div>
        </div>
      )}

      {wantsAnalysis && home && away && (
        <>
          <div className="rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 mt-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-primary" />
                Comparativo por IA
              </div>
              {!aiMut.data && (
                <button
                  onClick={() => aiMut.mutate()}
                  disabled={aiMut.isPending}
                  className="text-xs rounded-md bg-primary hover:bg-primary/90 px-3 py-1.5 text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {aiMut.isPending ? <><Loader2 className="h-3 w-3 animate-spin" /> Consultando IA...</> : <>Gerar comparativo</>}
                </button>
              )}
            </div>

            {aiMut.error && <p className="text-xs text-destructive">{(aiMut.error as Error).message}</p>}

            {!aiMut.data && !aiMut.isPending && !aiMut.error && (
              <p className="text-xs text-muted-foreground">
                A IA usa conhecimento real sobre a força dos times, elenco e competição pra comparar os dois — sem depender de estatísticas jogo a jogo puxadas ao vivo.
              </p>
            )}

            {aiMut.data?.prediction && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="text-right flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{home.name}</div>
                    <div className="font-display text-4xl font-bold">{aiMut.data.predictedScore?.home ?? "-"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">×</div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{away.name}</div>
                    <div className="font-display text-4xl font-bold">{aiMut.data.predictedScore?.away ?? "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <ProbCard label="Vitória A" value={aiMut.data.prediction.homeWinPct ?? 0} color="var(--color-primary)" />
                  <ProbCard label="Empate" value={aiMut.data.prediction.drawPct ?? 0} color="var(--color-muted-foreground)" />
                  <ProbCard label="Vitória B" value={aiMut.data.prediction.awayWinPct ?? 0} color="var(--color-accent)" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Stat label="Over 2.5" value={`${aiMut.data.prediction.over25Pct}%`} />
                  <Stat label="Ambas marcam" value={`${aiMut.data.prediction.bttsPct}%`} />
                  <Stat label="Escanteios" value={`${aiMut.data.prediction.expectedCornersMin}–${aiMut.data.prediction.expectedCornersMax}`} />
                  <Stat label="Cartões amarelos" value={`~${aiMut.data.prediction.expectedYellow}`} />
                </div>

                {(aiMut.data.homeAnalysis || aiMut.data.awayAnalysis) && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {aiMut.data.homeAnalysis && (
                      <div className="rounded-md bg-background/50 border border-border p-2.5">
                        <div className="text-[11px] font-medium mb-0.5 truncate">{home.name}</div>
                        <p className="text-xs text-muted-foreground">{aiMut.data.homeAnalysis}</p>
                      </div>
                    )}
                    {aiMut.data.awayAnalysis && (
                      <div className="rounded-md bg-background/50 border border-border p-2.5">
                        <div className="text-[11px] font-medium mb-0.5 truncate">{away.name}</div>
                        <p className="text-xs text-muted-foreground">{aiMut.data.awayAnalysis}</p>
                      </div>
                    )}
                  </div>
                )}

                {aiMut.data.keyInsight && (
                  <p className="text-sm italic text-center text-foreground/90 border-y border-primary/20 py-2">
                    "{aiMut.data.keyInsight}"
                  </p>
                )}

                {Array.isArray(aiMut.data.topPicks) && aiMut.data.topPicks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" /> Palpites por mercado
                    </div>
                    {aiMut.data.topPicks.map((pick: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-md bg-background/60 border border-border p-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            <span className="text-muted-foreground">{pick.market}:</span> {pick.pick}
                          </div>
                          {pick.reason && <div className="text-[11px] text-muted-foreground mt-0.5">{pick.reason}</div>}
                        </div>
                        <span className="text-xs font-mono font-semibold text-primary shrink-0">{pick.confidence ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {h2h.length > 0 && (
            <div className="card-surface p-5 mt-6">
              <h3 className="font-display font-semibold mb-3">Confronto direto no seu histórico ({h2h.length})</h3>
              <ul className="space-y-1 text-sm">
                {h2h.slice(0, 5).map((m: any, i: number) => (
                  <li key={i} className="flex justify-between py-1">
                    <span className="text-muted-foreground">{m.match_date}</span>
                    <span className="font-mono">{m.home_goals} - {m.away_goals}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProbCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-input p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1" style={{ color }}>{value}%</div>
      <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-input border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-lg mt-1">{value}</div>
    </div>
  );
}
