import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { TeamCombobox, isCustomTeam, type ComboTeam } from "@/components/TeamCombobox";
import { getAiFixturePrediction } from "@/lib/predictions.functions";
import { Save, Crown, Lock, AlertTriangle, Wand2, Loader2, Target } from "lucide-react";
import { useSubscription, FREE_PREDICTION_LIMIT } from "@/hooks/useSubscription";

type MatchTeamRef = {
  home_team_id: string | null;
  away_team_id: string | null;
  league_name: string | null;
  country: string | null;
};

async function fetchAllTeams(): Promise<ComboTeam[]> {
  const pageSize = 1000;
  const rows: ComboTeam[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url, league, country")
      .order("name")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as ComboTeam[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function fetchAllMatchTeamRefs(): Promise<MatchTeamRef[]> {
  const pageSize = 1000;
  const rows: MatchTeamRef[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("matches")
      .select("home_team_id, away_team_id, league_name, country")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as MatchTeamRef[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export const Route = createFileRoute("/_authenticated/predictions")({
  component: PredictionsPage,
});

function PredictionsPage() {
  const qc = useQueryClient();
  const { isPremium, remaining, canSavePrediction, monthCount } = useSubscription();
  const [home, setHome] = useState<ComboTeam | null>(null);
  const [away, setAway] = useState<ComboTeam | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchAllTeams,
  });

  // Só times de ligas ATUALMENTE habilitadas em Configurações podem
  // aparecer aqui — inclusive pra análise por IA. Sem isso, dava pra
  // furar o limite de ligas do plano digitando qualquer time livremente.
  const { data: trackedLeagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ["tracked-leagues"],
    queryFn: async () => (await supabase.from("tracked_leagues").select("league_name, country")).data ?? [],
  });
  // Match por (liga + país) usando os JOGOS como fonte da verdade — a
  // tabela `teams` guarda um nome de liga diferente (ex. "Brasileirão
  // Série A") do curado ("Serie A"), então filtrar direto por
  // teams.league deixava Santos/Corinthians de fora. Os matches já vêm
  // marcados com o mesmo league_name das ligas rastreadas.
  const enabledLeagueKeys = useMemo(
    () => new Set(
      trackedLeagues
        .map((l: any) => `${(l.league_name ?? "").toLowerCase()}|${(l.country ?? "").toLowerCase()}`)
        .filter((k) => k !== "|"),
    ),
    [trackedLeagues],
  );

  const { data: matchTeamRefs = [], isLoading: refsLoading } = useQuery({
    queryKey: ["match-team-refs"],
    queryFn: fetchAllMatchTeamRefs,
  });
  const isLoadingData = teamsLoading || leaguesLoading || refsLoading;

  // Deriva a "liga real" (name+country das ligas rastreadas) de cada time
  // a partir dos jogos. Assim o agrupamento/filtro do combobox bate com o
  // filtro de ligas habilitadas pra TODAS as ligas, não só as genéricas.
  const teamLeagueMap = useMemo(() => {
    const map = new Map<string, { league: string; country: string }>();
    for (const m of matchTeamRefs as any[]) {
      const key = `${(m.league_name ?? "").toLowerCase()}|${(m.country ?? "").toLowerCase()}`;
      if (!enabledLeagueKeys.has(key)) continue;
      const info = { league: m.league_name ?? "Outros", country: m.country ?? "" };
      if (m.home_team_id && !map.has(m.home_team_id)) map.set(m.home_team_id, info);
      if (m.away_team_id && !map.has(m.away_team_id)) map.set(m.away_team_id, info);
    }
    return map;
  }, [matchTeamRefs, enabledLeagueKeys]);
  const enabledTeamIds = useMemo(() => new Set(teamLeagueMap.keys()), [teamLeagueMap]);
  const enabledTeams = useMemo(
    () => teams
      .filter((t) => enabledTeamIds.has(t.id))
      .map((t) => {
        const info = teamLeagueMap.get(t.id);
        return info ? { ...t, league: info.league, country: info.country } : t;
      }),
    [teams, enabledTeamIds, teamLeagueMap],
  );

  // Só usado pra checar se os times já se enfrentaram (aviso) e pra dar
  // sugestões rápidas.
  const { data: matches = [] } = useQuery({
    queryKey: ["matches-raw"],
    queryFn: async () => (await supabase.from("matches").select("home_team_id, away_team_id, match_date, home_goals, away_goals")).data ?? [],
  });

  const homeIsLocal = !!home && !isCustomTeam(home);
  const awayIsLocal = !!away && !isCustomTeam(away);

  const h2h = useMemo(() => {
    if (!homeIsLocal || !awayIsLocal) return [];
    return matches.filter((m) => (m.home_team_id === home!.id && m.away_team_id === away!.id) || (m.home_team_id === away!.id && m.away_team_id === home!.id));
  }, [matches, home, away, homeIsLocal, awayIsLocal]);

  const differentCompetition = !!home && !!away && (home.league ?? home.country) !== (away.league ?? away.country);
  const neverPlayed = !!home && !!away && h2h.length === 0;

  // Chave liga+país pra desambiguar (Serie A Brasil x Itália, Premier
  // League Inglaterra x Rússia, etc.) — vale igual pra toda liga.
  const leagueKeyFor = (info: { league: string; country: string }) => {
    const l = (info.league || "Outros").trim();
    const c = (info.country || "").trim();
    return c ? `${l} (${c})` : l;
  };

  const teamsByLeague = useMemo(() => {
    const groups = new Map<string, typeof teams>();
    for (const t of enabledTeams) {
      const info = teamLeagueMap.get(t.id) ?? { league: t.league || "Outros", country: t.country || "" };
      const key = leagueKeyFor(info);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [enabledTeams, teamLeagueMap]);

  const [leagueFilter, setLeagueFilter] = useState("");
  const filteredTeams = useMemo(() => {
    if (!leagueFilter) return enabledTeams;
    return enabledTeams.filter((t) => {
      const info = teamLeagueMap.get(t.id) ?? { league: t.league || "Outros", country: t.country || "" };
      return leagueKeyFor(info) === leagueFilter;
    });
  }, [enabledTeams, leagueFilter, teamLeagueMap]);

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

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!aiMut.data?.prediction || !home || !away) return;
      if (!homeIsLocal || !awayIsLocal) throw new Error("Só é possível salvar previsões com os dois times da sua lista importada.");
      if (!canSavePrediction) throw new Error("Limite grátis atingido. Assine para salvar mais.");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("predictions").insert({
        user_id: user!.id, home_team_id: home.id, away_team_id: away.id,
        predicted_data: aiMut.data.prediction as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Previsão salva no histórico");
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["predictions-month"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => { aiMut.reset(); setWantsAnalysis(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [home?.id, away?.id]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Previsões</h1>
          <p className="text-sm text-muted-foreground mt-1">Compare dois times das ligas que você habilitou em Configurações.</p>
        </div>
        {isPremium ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
            <Crown className="h-3.5 w-3.5" /> Premium — ilimitado
          </span>
        ) : (
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full bg-input border border-border px-3 py-1 text-xs font-medium hover:border-primary/50">
            <Crown className="h-3.5 w-3.5 text-primary" /> {remaining}/{FREE_PREDICTION_LIMIT} grátis hoje
          </Link>
        )}
      </div>

      {!isPremium && monthCount >= FREE_PREDICTION_LIMIT && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
          <Lock className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold">Você atingiu o limite grátis</div>
            <div className="text-muted-foreground">Faça upgrade pra Premium e salve previsões ilimitadas.</div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Assinar
          </Link>
        </div>
      )}


      <div className="card-surface p-5 mt-6">
        {enabledTeams.length === 0 ? (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
            Nenhuma liga habilitada ainda. Vá em <Link to="/settings" className="underline">Configurações</Link> pra escolher quais ligas você quer acompanhar.
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{enabledTeams.length} time(s) disponível(eis), das ligas que você habilitou.</span>
            <Link to="/settings" className="text-primary hover:underline">Gerenciar ligas →</Link>
          </div>
        )}

        {enabledTeams.length > 0 && (
          <div className="mb-4">
            <label className="text-sm font-medium">Filtrar sugestões por liga</label>
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
            >
              <option value="">Todas as ligas</option>
              {teamsByLeague.map(([league]) => <option key={league} value={league}>{league}</option>)}
            </select>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Time mandante</label>
            <TeamCombobox
              teams={filteredTeams}
              value={home}
              onChange={setHome}
              placeholder="Buscar time..."
              allowFreeText={false}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Time visitante</label>
            <TeamCombobox
              teams={filteredTeams}
              value={away}
              onChange={setAway}
              placeholder="Buscar time..."
              allowFreeText={false}
            />
          </div>
        </div>
      </div>


      {home && away && home.id !== away.id && !wantsAnalysis && (
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
            <Wand2 className="h-4 w-4" /> Analisar com IA
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
              A previsão abaixo é uma simulação estatística baseada só no desempenho isolado de cada time — não representa um jogo real esperado.
            </div>
          </div>
        </div>
      )}

      {wantsAnalysis && (home && away) && (
        <div className="flex items-center gap-3 mt-6">
          <TeamBadge name={home.name} logoUrl={home.logo_url} size={40} />
          <div className="font-semibold">{home.name}</div>
          <span className="text-xs text-muted-foreground">vs</span>
          <div className="font-semibold">{away.name}</div>
          <TeamBadge name={away.name} logoUrl={away.logo_url} size={40} />
        </div>
      )}

      {wantsAnalysis && home && away && (
        <>
          <div className="rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 mt-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-primary" />
                Palpite da IA generativa
                <span className="text-[10px] uppercase tracking-wider text-primary/70 ml-1">conhecimento real dos times</span>
              </div>
              {!aiMut.data && (
                <button
                  onClick={() => aiMut.mutate()}
                  disabled={aiMut.isPending}
                  className="text-xs rounded-md bg-primary hover:bg-primary/90 px-3 py-1.5 text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {aiMut.isPending ? <><Loader2 className="h-3 w-3 animate-spin" /> Consultando IA...</> : <>Gerar previsão com IA</>}
                </button>
              )}
            </div>

            {!aiMut.data && !aiMut.isPending && (
              <p className="text-xs text-muted-foreground">
                Diferente do modelo acima (que só enxerga o seu histórico importado), a IA usa conhecimento real sobre a força dos times, elenco e competição — útil quando os times são de níveis muito diferentes ou nunca se enfrentaram.
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
                  <ProbCard label="Vitória casa" value={aiMut.data.prediction.homeWinPct ?? 0} color="var(--color-primary)" />
                  <ProbCard label="Empate" value={aiMut.data.prediction.drawPct ?? 0} color="var(--color-muted-foreground)" />
                  <ProbCard label="Vitória fora" value={aiMut.data.prediction.awayWinPct ?? 0} color="var(--color-accent)" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Stat label="Over 2.5" value={`${aiMut.data.prediction.over25Pct}%`} />
                  <Stat label="Ambas marcam" value={`${aiMut.data.prediction.bttsPct}%`} />
                  <Stat label="Escanteios" value={`${aiMut.data.prediction.expectedCornersMin}–${aiMut.data.prediction.expectedCornersMax}`} />
                  <Stat label="Cartões amarelos" value={`~${aiMut.data.prediction.expectedYellow}`} />
                </div>

                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 font-medium">
                    Confiança {aiMut.data.prediction.confidenceScore ?? 0}%
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${
                    aiMut.data.risk === "baixo" ? "bg-green-500/20 text-green-400" :
                    aiMut.data.risk === "alto" ? "bg-red-500/20 text-red-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>
                    Risco {aiMut.data.risk ?? "medio"}
                  </span>
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

            {aiMut.data?.prediction && (
              (!homeIsLocal || !awayIsLocal) ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Salvar previsão pra acompanhar taxa de acerto só funciona com os dois times da sua lista importada (pelo menos um dos dois foi digitado livremente aqui).
                </p>
              ) : (
                <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSavePrediction} title={canSavePrediction ? "" : "Limite grátis atingido"} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {canSavePrediction ? <Save className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {canSavePrediction ? "Salvar previsão" : "Assine para salvar"}
                </button>
              )
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

function ProbCard({ label, value, color, muted }: { label: string; value: number; color: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-input p-4 text-center ${muted ? "opacity-60" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1" style={{ color: muted ? "var(--color-muted-foreground)" : color }}>{value}%</div>
      <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: muted ? "var(--color-muted-foreground)" : color }} />
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

