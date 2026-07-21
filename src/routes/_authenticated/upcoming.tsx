import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, Suspense, useMemo, useEffect, memo } from "react";
import { listUpcomingFixtures, getFixtureOdds, syncMyLeaguesNow } from "@/lib/api-sports.functions";
import { getAiFixturePrediction } from "@/lib/predictions.functions";
import { supabase } from "@/integrations/supabase/client";
import { translateCountry, translateLeague, translateTeam } from "@/lib/country-i18n";
import { TeamBadge } from "@/components/TeamBadge";
import { CalendarClock, TrendingUp, Trophy, Loader2, Sparkles, ChevronDown, Wand2, Target } from "lucide-react";
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
  const listFn = useServerFn(listUpcomingFixtures);
  const syncFn = useServerFn(syncMyLeaguesNow);
  const queryClient = useQueryClient();
  const [leagueSearch, setLeagueSearch] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  // Começa em 3 dias: cada dia = 1 requisição na API externa, então um
  // valor inicial menor evita estourar o limite de requisições logo na entrada.
  const [days, setDays] = useState(3);

  // Debounce da busca por time — evita refiltrar a lista inteira a cada tecla.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(id);
  }, [search]);

  const { data: fixtures = [], isFetching, isLoading, error, refetch } = useQuery({
    queryKey: ["upcoming-fixtures", days],
    queryFn: async () => (await listFn({ data: { days } })) as any[],
    staleTime: 5 * 60 * 1000,
    // A API externa já sinaliza erros de configuração/limite de forma clara;
    // tentar de novo automaticamente só desperdiça cota e atrasa o feedback.
    retry: false,
  });

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncFn({ data: undefined as any });
      setSyncMsg(`Sincronizadas ${r.processed} liga(s). Atualizando lista...`);
      await queryClient.invalidateQueries({ queryKey: ["upcoming-fixtures"] });
    } catch (e: any) {
      setSyncMsg(`Erro: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }


  // A tela mostra mensagem simples pro usuário de propósito, mas o erro
  // técnico real vai pro console — sem isso não dá pra diagnosticar à
  // distância quando alguém manda print da tela de erro.
  useEffect(() => {
    if (error) console.error("[Jogos] Erro real:", (error as Error).message);
  }, [error]);

  // Sem nenhum time importado, a previsão instantânea (com escanteios e
  // cartões) nunca vai aparecer — vale avisar e apontar pra tela de import.
  const { data: teamsCount } = useQuery({
    queryKey: ["teams-count"],
    queryFn: async () => {
      const { count } = await supabase.from("teams").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Ligas rastreadas pelo usuário — usadas pra popular o filtro mesmo
  // quando ainda não há jogos importados pra elas.
  const { data: trackedLeagues = [] } = useQuery({
    queryKey: ["tracked-leagues-for-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tracked_leagues")
        .select("league_name, country");
      return (data ?? []) as { league_name: string; country: string | null }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Lista única de "Liga (País)" pra escolher no dropdown — inclui as
  // ligas habilitadas pelo usuário mesmo sem jogos ainda, pra ele saber
  // que o filtro existe e ver "nenhum jogo" ao invés da liga sumir.
  const leagueOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; league: string; country: string }>();
    const add = (league: string, country: string) => {
      if (!league) return;
      const key = `${league}||${country}`;
      if (!map.has(key)) {
        const label = country ? `${translateLeague(league)} (${translateCountry(country)})` : translateLeague(league);
        map.set(key, { key, label, league, country });
      }
    };
    for (const t of trackedLeagues) add(t.league_name ?? "", t.country ?? "");
    for (const f of fixtures as any[]) add(f.league ?? "", f.country ?? "");
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [fixtures, trackedLeagues]);


  // Pré-computa strings em minúsculas dos times UMA vez por lista de jogos,
  // em vez de recomputar em toda tecla no filtro. Reduz o custo do filtro de
  // O(n·k) por keystroke pra O(n) sobre valores já normalizados.
  const indexedFixtures = useMemo(() => {
    return (fixtures as any[]).map((f) => {
      const homeName = f.home?.name ?? "";
      const awayName = f.away?.name ?? "";
      return {
        f,
        _leagueKey: `${f.league ?? ""}||${f.country ?? ""}`,
        _search: [
          homeName,
          awayName,
          translateTeam(homeName),
          translateTeam(awayName),
        ].join("\u0001").toLowerCase(),
      };
    });
  }, [fixtures]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const hasLeague = !!leagueSearch;
    const hasQuery = q.length > 0;
    if (!hasLeague && !hasQuery) return indexedFixtures.map((x) => x.f);
    const out: any[] = [];
    for (const x of indexedFixtures) {
      if (hasLeague && x._leagueKey !== leagueSearch) continue;
      if (hasQuery && !x._search.includes(q)) continue;
      out.push(x.f);
    }
    return out;
  }, [indexedFixtures, leagueSearch, debouncedSearch]);


  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Próximos jogos</h1>
          <div className="flex items-center gap-2 bg-input/40 p-1 rounded-md border border-border">
            {[3, 7, 14].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  days === d 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-input"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Jogos das ligas habilitadas em Configurações, com filtros por competição, país e time. Clique num jogo para ver a previsão da IA.
        </p>
        {teamsCount === 0 && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Ainda não há times no seu histórico. A previsão pode ficar mais limitada até o cron popular os dados.
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <select
            value={leagueSearch}
            onChange={(e) => setLeagueSearch(e.target.value)}
            className="w-full appearance-none rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary transition-all pr-10"
          >
            <option value="">Todas as ligas ({leagueOptions.length})</option>
            {leagueOptions.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Filtrar por time..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary transition-all pr-10"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} de {fixtures.length} jogo(s)</p>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-xs text-muted-foreground">{syncMsg}</span>}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs rounded-md border border-border px-2.5 py-1 font-medium hover:bg-input transition-all disabled:opacity-60 flex items-center gap-1.5"
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Sincronizar minhas ligas
          </button>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
            </div>
          )}
        </div>
      </div>


      {error ? (
        <div className="card-surface p-8 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">Não foi possível carregar os jogos</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Tenta de novo em alguns instantes.
          </p>
          <button 
            onClick={() => refetch()} 
            className="text-xs rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <FixtureCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mb-6">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nenhum jogo encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
            {fixtures.length > 0
              ? "Não encontramos resultados para sua busca. Tente ajustar os filtros de liga, país ou time."
              : "Nenhum jogo das suas ligas habilitadas nesse período. Habilite mais ligas em Configurações ou aguarde a próxima atualização automática."}
          </p>
          <div className="flex justify-center gap-4">
            {(leagueSearch || search) && (
              <button
                onClick={() => { setLeagueSearch(""); setSearch(""); }}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-semibold hover:bg-input transition-all"
              >
                Limpar filtros
              </button>
            )}
            <button 
              onClick={() => refetch()} 
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Loader2 className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar agora
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f: any) => (
            <FixtureCard key={f.fixtureId} f={f} />
          ))}
        </div>
      )}

    </div>
  );
}


function formatMarketOutcome(market: string, outcome: string, homeName: string, awayName: string): string {
  if (market === "1x2") {
    if (outcome === "Home") return `Vitória ${homeName}`;
    if (outcome === "Draw") return "Empate";
    if (outcome === "Away") return `Vitória ${awayName}`;
  }
  if (market === "BTTS") {
    if (outcome === "Yes") return "Ambas marcam: Sim";
    if (outcome === "No") return "Ambas marcam: Não";
  }
  if (market === "Over/Under") {
    if (/^Over/i.test(outcome)) return `Mais de ${outcome.replace(/Over\s*/i, "")} gols`;
    if (/^Under/i.test(outcome)) return `Menos de ${outcome.replace(/Under\s*/i, "")} gols`;
  }
  if (market === "Escanteios") {
    if (/^Over/i.test(outcome)) return `Mais de ${outcome.replace(/Over\s*/i, "")} escanteios`;
    if (/^Under/i.test(outcome)) return `Menos de ${outcome.replace(/Under\s*/i, "")} escanteios`;
  }
  if (market === "Cartões") {
    if (/^Over/i.test(outcome)) return `Mais de ${outcome.replace(/Over\s*/i, "")} cartões`;
    if (/^Under/i.test(outcome)) return `Menos de ${outcome.replace(/Under\s*/i, "")} cartões`;
  }
  return `${market} · ${outcome}`;
}

const FixtureCard = memo(function FixtureCard({ f }: { f: any }) {
  const [open, setOpen] = useState(false);
  const oddsFn = useServerFn(getFixtureOdds);
  const aiFixtureFn = useServerFn(getAiFixturePrediction);
  const queryClient = useQueryClient();

  const homeApiId: number | undefined = f.home?.apiId;
  const awayApiId: number | undefined = f.away?.apiId;

  // Previsão sempre vem da IA generativa (usando só os nomes/liga do
  // confronto — sem depender de histórico local nem puxar estatísticas
  // jogo a jogo da API-Sports). Mais rápido e consistente pra todo jogo.
  const { data: aiFixturePred, isLoading: aiLoading, error: aiFixtureError, refetch: refetchAiFixture } = useQuery({
    queryKey: ["ai-fixture-prediction", f.fixtureId],
    queryFn: async () => await aiFixtureFn({
      data: {
        fixtureId: f.fixtureId,
        homeApiId, awayApiId,
        homeName: f.home.name, awayName: f.away.name,
        homeLeague: `${f.league}${f.country ? ` (${translateCountry(f.country)})` : ""}`,
        awayLeague: `${f.league}${f.country ? ` (${translateCountry(f.country)})` : ""}`,
        matchDate: f.date,
      },
    }),
    enabled: open,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const [wantsOdds, setWantsOdds] = useState(false);
  const { data: odds, isFetching: oddsLoading } = useQuery({
    queryKey: ["odds", f.fixtureId],
    queryFn: async () => await oddsFn({ data: { fixtureId: f.fixtureId } }),
    enabled: open && wantsOdds,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const p = aiFixturePred?.prediction;

  // Data formatada memoizada — evita recriar Date+Intl a cada render do card.
  const dateStr = useMemo(
    () => new Date(f.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    [f.date]
  );

  // O(n) em vez de sort()+[0]: a lista tem 5 itens, mas o reduce evita
  // alocar array intermediário e sort a cada render quando `p` muda.
  const bestPick = useMemo(() => {
    if (!p) return null;
    const picks = [
      { label: "Vitória mandante", pct: p.homeWinPct, market: "1x2", outcome: "Home" },
      { label: "Empate", pct: p.drawPct, market: "1x2", outcome: "Draw" },
      { label: "Vitória visitante", pct: p.awayWinPct, market: "1x2", outcome: "Away" },
      { label: "Over 2.5 gols", pct: p.over25Pct, market: "Over/Under", outcome: "Over 2.5" },
      { label: "Ambas marcam", pct: p.bttsPct, market: "BTTS", outcome: "Yes" },
    ];
    let best = picks[0];
    for (let i = 1; i < picks.length; i++) if (picks[i].pct > best.pct) best = picks[i];
    return best;
  }, [p]);

  const bestOddForPick = odds?.markets.find((m: any) => m.market === bestPick?.market && m.outcome === bestPick?.outcome);
  const ev = bestPick && bestOddForPick ? (bestPick.pct / 100) * bestOddForPick.odd : null;

  const corners = p ? { min: p.expectedCornersMin, max: p.expectedCornersMax } : null;
  const yellowCards = p?.expectedYellow ?? null;

  const isWaiting = open && aiLoading;
  const showAiError = !!aiFixtureError && !aiFixturePred;

  return (
    <div className="list-row-surface p-4">

      <button onClick={() => setOpen((v) => !v)} className="w-full text-left">

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <CalendarClock className="h-3.5 w-3.5" />
          {dateStr}
          <span className="mx-1">·</span>
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

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Ver previsão da IA
        </button>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {showAiError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="text-destructive font-medium mb-1">Não foi possível gerar a previsão com IA</div>
              <div className="text-xs text-muted-foreground mb-2">{(aiFixtureError as Error).message || "Erro ao consultar a IA."}</div>
              <button onClick={() => refetchAiFixture()} className="text-xs text-primary hover:underline">Tentar novamente</button>
            </div>
          ) : isWaiting || !p ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Consultando a IA...
            </div>
          ) : (

            <>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Wand2 className="h-3 w-3 text-primary" /> Previsão gerada por IA
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Resultado</div>
                <div className="grid grid-cols-3 gap-2">
                  <ResultBar label="Casa" value={p!.homeWinPct} color="var(--color-primary)" highlight={bestPick?.outcome === "Home"} />
                  <ResultBar label="Empate" value={p!.drawPct} color="var(--color-muted-foreground)" highlight={bestPick?.outcome === "Draw"} />
                  <ResultBar label="Fora" value={p!.awayWinPct} color="#3b82f6" highlight={bestPick?.outcome === "Away"} />
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Mercados mais apostados</div>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                  <StatChip label="Over 2.5 gols" value={`${p!.over25Pct}%`} highlight={bestPick?.market === "Over/Under"} />
                  <StatChip label="Ambas marcam" value={`${p!.bttsPct}%`} highlight={bestPick?.market === "BTTS"} />
                  <StatChip label="Gols esperados" value={String(p!.expectedGoals)} />
                  <StatChip label="Escanteios" value={corners ? `${corners.min}-${corners.max}` : "—"} />
                  <StatChip label="Cartões amarelos" value={yellowCards != null ? `~${yellowCards}` : "—"} />
                  <StatChip label="Confiança" value={`${p!.confidenceScore ?? 0}%`} highlight={(p!.confidenceScore ?? 0) > 75} />
                </div>
              </div>

              {(aiFixturePred?.homeAnalysis || aiFixturePred?.awayAnalysis) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {aiFixturePred?.homeAnalysis && (
                    <div className="rounded-md border border-border bg-input/40 p-3">
                      <div className="text-xs font-medium mb-1 truncate">{translateTeam(f.home.name)}</div>
                      <p className="text-xs text-muted-foreground">{aiFixturePred.homeAnalysis}</p>
                    </div>
                  )}
                  {aiFixturePred?.awayAnalysis && (
                    <div className="rounded-md border border-border bg-input/40 p-3">
                      <div className="text-xs font-medium mb-1 truncate">{translateTeam(f.away.name)}</div>
                      <p className="text-xs text-muted-foreground">{aiFixturePred.awayAnalysis}</p>
                    </div>
                  )}
                </div>
              )}

              {aiFixturePred?.keyInsight && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm italic text-foreground/90">"{aiFixturePred.keyInsight}"</p>
                </div>
              )}

              {Array.isArray(aiFixturePred?.topPicks) && aiFixturePred.topPicks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Palpites por mercado
                  </div>
                  {aiFixturePred.topPicks.map((pick: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-input/40 border border-border p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          <span className="text-muted-foreground">{pick.market}:</span> {pick.pick}
                        </div>
                        {pick.reason && <div className="text-[11px] text-muted-foreground mt-0.5">{pick.reason}</div>}
                      </div>
                      {pick.confidence != null && <span className="text-xs font-mono font-semibold text-primary shrink-0">{pick.confidence}%</span>}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">{p!.basis}</p>
            </>
          )}

          {bestPick && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium">Sugestão: <span className="text-primary">{bestPick.label}</span> ({bestPick.pct}%)</div>
                {!wantsOdds && (
                  <button
                    onClick={() => setWantsOdds(true)}
                    className="text-xs text-primary hover:underline mt-0.5"
                  >
                    Ver odds das casas de apostas
                  </button>
                )}
                {wantsOdds && oddsLoading && !bestOddForPick && (
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
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Melhor odd por mercado ({odds.bookmakerCount} casas)
              </div>
              <p className="text-[11px] text-muted-foreground/70 mb-2">A maior cotação encontrada entre as casas de apostas pra cada resultado possível.</p>
              <div className="grid gap-1.5 md:grid-cols-2">
                {odds.markets.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs rounded-md bg-input/50 px-2 py-1.5 border border-border">
                    <span className="text-muted-foreground truncate">{formatMarketOutcome(m.market, m.outcome, translateTeam(f.home.name), translateTeam(f.away.name))}</span>
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
});

function StatChip({ label, value, highlight, hint }: { label: string; value: string; highlight?: boolean; hint?: string }) {
  return (
    <div className={`rounded-md px-3 py-2 border ${highlight ? "border-primary/50 bg-primary/10" : "border-border bg-input/40"}`} title={hint}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}

function ResultBar({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 text-center ${highlight ? "border-primary/50 bg-primary/10" : "border-border bg-input/40"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold mt-0.5" style={{ color }}>{value}%</div>
      <div className="mt-1.5 h-1 bg-background rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

