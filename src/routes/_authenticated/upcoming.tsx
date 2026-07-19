import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import { listUpcomingFixtures, getFixtureOdds, analyzeFixture, getAiInsights, getAiPrediction } from "@/lib/api-sports.functions";
import { translateCountry, translateLeague, translateTeam } from "@/lib/country-i18n";
import { TeamBadge } from "@/components/TeamBadge";
import { CalendarClock, TrendingUp, Trophy, Loader2, Sparkles, BarChart3, ChevronDown, Brain, Wand2, Target } from "lucide-react";
import { FixtureCardSkeleton } from "@/components/Skeletons";
import { LocalErrorBoundary } from "@/components/LocalErrorBoundary";

export const Route = createFileRoute("/_authenticated/upcoming")({
  errorComponent: (props) => <LocalErrorBoundary {...props} boundaryName="upcoming" />,
  component: () => (
    <Suspense fallback={
      <div className="max-w-5xl space-y-3">
        <div className="mb-6"><div className="h-9 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div>
        <div className="grid gap-2 sm:grid-cols-2 mb-4"><div className="h-10 bg-muted animate-pulse rounded" /><div className="h-10 bg-muted animate-pulse rounded" /></div>
        {[1,2,3,4,5].map(i => <FixtureCardSkeleton key={i} />)}
      </div>
    }>
      <UpcomingPage />
    </Suspense>
  ),
});

function UpcomingPage() {
  // voce tem a chave da api?
  const listFn = useServerFn(listUpcomingFixtures);
  const [leagueSearch, setLeagueSearch] = useState("");
  const [search, setSearch] = useState("");

  const { data: fixtures = [] } = useSuspenseQuery({
    queryKey: ["upcoming-fixtures"],
    queryFn: async () => (await listFn({ data: { days: 4 } })) as any[],
  });

  const filtered = fixtures.filter((f: any) => {
    if (leagueSearch.trim()) {
      const q = leagueSearch.toLowerCase();
      const label = `${f.country ?? ""} ${translateCountry(f.country)} ${f.league} ${translateLeague(f.league)}`.toLowerCase();
      if (!label.includes(q)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!f.home.name.toLowerCase().includes(q) && !f.away.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Próximos jogos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os próximos jogos das suas ligas monitoradas com estatísticas e análises da IA.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Filtrar por liga ou país..."
          value={leagueSearch}
          onChange={(e) => setLeagueSearch(e.target.value)}
          className="rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Filtrar por time..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{filtered.length} de {fixtures.length} jogo(s)</p>


      {filtered.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Nenhum jogo encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Estamos buscando jogos das suas ligas monitoradas. Tente aumentar o período ou verifique se você está seguindo alguma liga ativa.
          </p>
          <div className="flex justify-center gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium hover:opacity-90"
            >
              Recarregar página
            </button>
            <Link 
              to="/import" 
              className="text-xs rounded-md border border-border bg-input/50 px-3 py-1.5 text-foreground font-medium hover:bg-input"
            >
              Monitorar novas ligas
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f: any) => <FixtureCard key={f.fixtureId} f={f} />)}
        </div>
      )}
    </div>
  );
}


function FixtureCard({ f }: { f: any }) {
  const [open, setOpen] = useState(false);
  const analyzeFn = useServerFn(analyzeFixture);
  const oddsFn = useServerFn(getFixtureOdds);
  const queryClient = useQueryClient();

  const homeApiId: number | undefined = f.home?.apiId;
  const awayApiId: number | undefined = f.away?.apiId;

  const prefetch = () => {
    if (!homeApiId || !awayApiId) return;
    queryClient.prefetchQuery({
      queryKey: ["analysis", f.fixtureId],
      queryFn: async () => await analyzeFn({ data: { fixtureId: f.fixtureId, homeId: homeApiId, awayId: awayApiId } }),
      staleTime: 30 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["odds", f.fixtureId],
      queryFn: async () => await oddsFn({ data: { fixtureId: f.fixtureId } }),
      staleTime: 15 * 60 * 1000,
    });
  };



  const { data: analysis, error: analysisError, refetch: refetchAnalysis } = useQuery({
    queryKey: ["analysis", f.fixtureId],
    queryFn: async () => await analyzeFn({ data: { fixtureId: f.fixtureId, homeId: homeApiId!, awayId: awayApiId! } }),
    enabled: open && !!homeApiId && !!awayApiId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const { data: odds, isFetching: oddsLoading } = useQuery({
    queryKey: ["odds", f.fixtureId],
    queryFn: async () => await oddsFn({ data: { fixtureId: f.fixtureId } }),
    enabled: open,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const aiFn = useServerFn(getAiInsights);
  const aiMut = useMutation({
    mutationFn: async () => await aiFn({
      data: { fixtureId: f.fixtureId, homeName: f.home.name, awayName: f.away.name, analysis },
    }),
  });

  const predictFn = useServerFn(getAiPrediction);
  const predictMut = useMutation({
    mutationFn: async () => await predictFn({
      data: { fixtureId: f.fixtureId, homeName: f.home.name, awayName: f.away.name, analysis },
    }),
  });



  const dt = new Date(f.date);
  const dateStr = dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const p = analysis?.prediction;
  const bestPick = p ? [
    { label: "Vitória mandante", pct: p.homeWinPct, market: "1x2", outcome: "Home" },
    { label: "Empate", pct: p.drawPct, market: "1x2", outcome: "Draw" },
    { label: "Vitória visitante", pct: p.awayWinPct, market: "1x2", outcome: "Away" },
    { label: "Over 2.5 gols", pct: p.over25Pct, market: "Over/Under", outcome: "Over 2.5" },
    { label: "Ambas marcam", pct: p.bttsPct, market: "BTTS", outcome: "Yes" },
  ].sort((a, b) => b.pct - a.pct)[0] : null;

  const bestOddForPick = odds?.markets.find((m: any) => m.market === bestPick?.market && m.outcome === bestPick?.outcome);
  const ev = bestPick && bestOddForPick ? (bestPick.pct / 100) * bestOddForPick.odd : null;

  return (
    <div className="card-surface p-4" onMouseEnter={prefetch} onTouchStart={prefetch}>

      <button onClick={() => setOpen((v) => !v)} className="w-full text-left">

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <CalendarClock className="h-3.5 w-3.5" />
          {dateStr}
          <span className="mx-1">·</span>
          {f.leagueLogo && <img src={f.leagueLogo} className="h-4 w-4 object-contain" alt="" />}
          <span className="truncate">{f.country ? `${translateCountry(f.country)} · ` : ""}{translateLeague(f.league)}</span>
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="flex items-center gap-2 min-w-0">
            <TeamBadge name={f.home.name} logoUrl={f.home.logo} />
            <span className="font-medium truncate">{translateTeam(f.home.name)}</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">VS</span>
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span className="font-medium truncate text-right">{translateTeam(f.away.name)}</span>
            <TeamBadge name={f.away.name} logoUrl={f.away.logo} />
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {analysisError && !analysis ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="text-destructive font-medium mb-1">Não foi possível carregar as estatísticas</div>
              <div className="text-xs text-muted-foreground mb-2">{(analysisError as Error).message || "Erro na API. Pode ser limite de requisições."}</div>
              <button onClick={() => refetchAnalysis()} className="text-xs text-primary hover:underline">Tentar novamente</button>
            </div>
          ) : !analysis ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando últimos jogos...
            </div>
          ) : (

            <>
              <div className="grid gap-3 md:grid-cols-3">
                <StatChip label="Casa" value={`${p!.homeWinPct}%`} highlight={bestPick?.outcome === "Home"} />
                <StatChip label="Empate" value={`${p!.drawPct}%`} highlight={bestPick?.outcome === "Draw"} />
                <StatChip label="Fora" value={`${p!.awayWinPct}%`} highlight={bestPick?.outcome === "Away"} />
                <StatChip label="Over 2.5" value={`${p!.over25Pct}%`} highlight={bestPick?.market === "Over/Under"} />
                <StatChip label="Ambas marcam" value={`${p!.bttsPct}%`} highlight={bestPick?.market === "BTTS"} />
                <StatChip label="Gols esperados" value={String(p!.expectedGoals)} />
                <StatChip label="Confiança IA" value={`${p!.confidenceScore ?? 0}%`} highlight={ (p!.confidenceScore ?? 0) > 75 } />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TeamPanel title={translateTeam(f.home.name)} data={analysis.home} accent="home" />
                <TeamPanel title={translateTeam(f.away.name)} data={analysis.away} accent="away" />
              </div>

              {analysis.h2h.games > 0 && (
                <div className="rounded-md border border-border bg-input/40 p-3">
                  <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Confronto direto ({analysis.h2h.games} jogos)
                  </div>
                  <div className="text-sm">
                    Média de gols: <span className="font-mono">{(analysis.h2h.avgFor + analysis.h2h.avgAgainst).toFixed(2)}</span>
                    <span className="mx-2">·</span>
                    BTTS: <span className="font-mono">{Math.round(analysis.h2h.bttsPct)}%</span>
                    <span className="mx-2">·</span>
                    Over 2.5: <span className="font-mono">{Math.round(analysis.h2h.over25Pct)}%</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">{p!.basis}</p>

              <AiPredictorCard
                data={predictMut.data?.prediction}
                loading={predictMut.isPending}
                error={predictMut.error as Error | null}
                onGenerate={() => predictMut.mutate()}
                homeName={translateTeam(f.home.name)}
                awayName={translateTeam(f.away.name)}
              />

              <div className="rounded-md border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3">

                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Análise por IA
                  </div>
                  {!aiMut.data && (
                    <button
                      onClick={() => aiMut.mutate()}
                      disabled={aiMut.isPending}
                      className="text-xs rounded-md bg-primary/90 hover:bg-primary px-2.5 py-1 text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {aiMut.isPending ? <><Loader2 className="h-3 w-3 animate-spin" /> Gerando...</> : <>Gerar análise</>}
                    </button>
                  )}
                </div>
                {aiMut.error && <p className="text-xs text-destructive">{(aiMut.error as Error).message}</p>}
                {aiMut.data?.summary && (
                  <div className="text-sm whitespace-pre-line leading-relaxed">{aiMut.data.summary}</div>
                )}
                {!aiMut.data && !aiMut.error && !aiMut.isPending && (
                  <p className="text-xs text-muted-foreground">Resumo em texto do confronto com base na forma, gols e H2H.</p>
                )}
              </div>
            </>
          )}

          {bestPick && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium">Sugestão: <span className="text-primary">{bestPick.label}</span> ({bestPick.pct}%)</div>
                {oddsLoading && !bestOddForPick && (
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando odds...
                  </div>
                )}
                {bestOddForPick && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Melhor casa: <span className="text-foreground font-medium">{bestOddForPick.bookmaker}</span> pagando{" "}
                    <span className="text-foreground font-mono">{bestOddForPick.odd.toFixed(2)}</span>
                    {ev != null && (
                      <span className={`ml-2 font-medium ${ev >= 1.05 ? "text-green-500" : "text-amber-400"}`}>
                        · EV {ev.toFixed(2)}× {ev >= 1.05 ? "(valor)" : "(justa)"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {odds && odds.markets.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Melhor odd por mercado ({odds.bookmakerCount} casas)
              </div>
              <div className="grid gap-1.5 md:grid-cols-2">
                {odds.markets.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs rounded-md bg-input/50 px-2 py-1.5 border border-border">
                    <span className="text-muted-foreground truncate">{m.market} · <span className="text-foreground">{m.outcome}</span></span>
                    <span className="font-mono ml-2 shrink-0"><span className="text-primary">{m.bookmaker}</span> <span className="font-bold">{m.odd.toFixed(2)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {odds && odds.markets.length === 0 && !oddsLoading && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Nenhuma casa cotando este jogo ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeamPanel({ title, data, accent }: { title: string; data: any; accent: "home" | "away" }) {
  return (
    <div className="rounded-md border border-border bg-input/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="flex gap-1">
          {data.form.slice(0, 5).map((r: string, i: number) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded ${
                r === "W" ? "bg-green-500/20 text-green-400" :
                r === "L" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
              }`}
            >{r}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <Stat label="Vitórias" value={`${data.wins}/${data.games}`} />
        <Stat label="Empates" value={String(data.draws)} />
        <Stat label="Gols pró" value={data.avgFor.toFixed(2)} />
        <Stat label="Gols sofr." value={data.avgAgainst.toFixed(2)} />
        <Stat label="BTTS" value={`${Math.round(data.bttsPct)}%`} />
        <Stat label="Over 2.5" value={`${Math.round(data.over25Pct)}%`} />
      </div>
      {data.recent?.length > 0 && (
        <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {data.recent.slice(0, 3).map((r: any, i: number) => (
            <div key={i} className="flex justify-between font-mono">
              <span className="truncate">{r.home ? "vs" : "@"} {r.opponent}</span>
              <span className={r.result === "W" ? "text-green-400" : r.result === "L" ? "text-red-400" : ""}>{r.gf}-{r.ga}</span>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">{accent}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function StatChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md px-3 py-2 border ${highlight ? "border-primary/50 bg-primary/10" : "border-border bg-input/40"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}

function AiPredictorCard({
  data, loading, error, onGenerate, homeName, awayName,
}: {
  data: any;
  loading: boolean;
  error: Error | null;
  onGenerate: () => void;
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <Wand2 className="h-4 w-4 text-primary" />
          Palpite da IA
          <span className="text-[10px] uppercase tracking-wider text-primary/70 ml-1">exclusivo</span>
        </div>
        {!data && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="text-xs rounded-md bg-primary hover:bg-primary/90 px-3 py-1.5 text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center gap-1"
          >
            {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Prevendo...</> : <>Gerar previsão</>}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive mb-2">{error.message}</p>}

      {!data && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          A IA analisa forma, gols, H2H e cotações — retorna placar previsto, confiança e os 3 melhores palpites do jogo.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-right flex-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">{homeName}</div>
              <div className="font-display text-4xl font-bold">{data.predictedScore?.home ?? "-"}</div>
            </div>
            <div className="text-xs text-muted-foreground">×</div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">{awayName}</div>
              <div className="font-display text-4xl font-bold">{data.predictedScore?.away ?? "-"}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 font-medium">
              Confiança {data.confidence ?? 0}%
            </span>
            <span className={`rounded-full px-2 py-0.5 font-medium ${
              data.risk === "baixo" ? "bg-green-500/20 text-green-400" :
              data.risk === "alto" ? "bg-red-500/20 text-red-400" :
              "bg-amber-500/20 text-amber-400"
            }`}>
              Risco {data.risk ?? "medio"}
            </span>
          </div>

          {data.keyInsight && (
            <p className="text-sm italic text-center text-foreground/90 border-y border-primary/20 py-2">
              "{data.keyInsight}"
            </p>
          )}

          {Array.isArray(data.topPicks) && data.topPicks.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Melhores palpites
              </div>
              {data.topPicks.slice(0, 3).map((pick: any, i: number) => (
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
  );
}
