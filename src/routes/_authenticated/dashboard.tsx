import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { Users, ListOrdered, Target, Trophy, RefreshCw, ChevronRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { DashboardSkeleton } from "@/components/Skeletons";
import { Suspense } from "react";
import { LocalErrorBoundary } from "@/components/LocalErrorBoundary";
import { listUpcomingFixtures } from "@/lib/api-sports.functions";
import { listFavorites } from "@/lib/favorites.functions";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  errorComponent: (props) => <LocalErrorBoundary {...props} boundaryName="dashboard" />,
  component: () => (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  ),
});

function Dashboard() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const listFixtures = useServerFn(listUpcomingFixtures);
  const loadFavorites = useServerFn(listFavorites);
  const { data, refetch, isFetching } = useSuspenseQuery({
    queryKey: ["dashboard", todayStr],
    queryFn: async () => {
      // 1) Ligas rastreadas do usuário — filtram TUDO para o painel
      // refletir só o que ele acompanha (não o banco inteiro).
      const trackedRes = await supabase
        .from("tracked_leagues")
        .select("league_id, league_name, country");
      const tracked = (trackedRes.data ?? []) as { league_id: number; league_name: string | null; country: string | null }[];
      const distinctLeagues = new Set(tracked.map((r) => r.league_id)).size;
      const trackedKeys = new Set(
        tracked.map((r) => `${(r.league_name ?? "").toLowerCase()}||${(r.country ?? "").toLowerCase()}`),
      );
      const trackedLeagueNames = Array.from(new Set(tracked.map((r) => r.league_name).filter(Boolean))) as string[];
      const trackedCountries = Array.from(new Set(tracked.map((r) => r.country).filter(Boolean))) as string[];
      const inKeys = (league?: string | null, country?: string | null) =>
        trackedKeys.has(`${(league ?? "").toLowerCase()}||${(country ?? "").toLowerCase()}`);

      // 2) Busca em paralelo. Jogos vêm pré-filtrados por liga+país
      // rastreados; depois refinamos por chave composta para não pegar
      // "Premier League" de outro país que passou pelo .in() de nome.
      // Times são contados a partir dos jogos das ligas rastreadas
      // (DISTINCT home/away) — a coluna teams.league guarda apenas o
      // último rótulo visto, então filtrar por ela subestima o total
      // quando o mesmo time aparece em copas/estaduais.
      const matchesQuery = trackedLeagueNames.length
        ? supabase
            .from("matches")
            .select("match_date, home_goals, away_goals, home_corners, away_corners, league_name, country, home_team_id, away_team_id, home_team:home_team_id(name), away_team:away_team_id(name)")
            .in("league_name", trackedLeagueNames)
            .in("country", trackedCountries)
            .order("match_date", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [] as any[] });

      const [matchesRes, preds, aiGenerated, favorites, weekFixtures] = await Promise.all([
        matchesQuery,
        supabase.from("predictions").select("id, result_checked, was_correct"),
        supabase.from("ai_prediction_usage").select("id", { count: "exact", head: true }),
        loadFavorites().catch(() => []),
        listFixtures({ data: { days: 14 } }).catch(() => []),
      ]);

      const matchesAll = ((matchesRes as any).data ?? []).filter((m: any) => inKeys(m.league_name, m.country));
      const teamIdSet = new Set<string>();
      for (const m of matchesAll) {
        if (m.home_team_id) teamIdSet.add(m.home_team_id);
        if (m.away_team_id) teamIdSet.add(m.away_team_id);
      }
      const matchesFiltered = matchesAll.slice(0, 20);

      const todayFixtures = (weekFixtures ?? []).filter((m: any) => (m.date as string).slice(0, 10) === todayStr);
      const favTeamIds = new Set(
        (favorites ?? []).filter((f: any) => f.kind === "team").map((f: any) => f.ref_id),
      );
      const favFixtures = (weekFixtures ?? []).filter(
        (m: any) => favTeamIds.has(m.home.apiId) || favTeamIds.has(m.away.apiId),
      );
      return {
        teamsCount: teamIdSet.size,
        trackedLeaguesCount: distinctLeagues,
        todayFixtures: todayFixtures as any[],
        favFixtures: favFixtures as any[],
        allMatches: matchesFiltered,
        preds: preds.data ?? [],
        aiGeneratedCount: aiGenerated.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
  });

  const teamsCount = data?.teamsCount ?? 0;
  const trackedLeaguesCount = data?.trackedLeaguesCount ?? 0;
  const todayFixtures = data?.todayFixtures ?? [];
  const predsCount = data?.preds.length ?? 0;
  const aiGeneratedCount = data?.aiGeneratedCount ?? 0;
  const correct = data?.preds.filter((p) => p.result_checked && p.was_correct).length ?? 0;
  const checked = data?.preds.filter((p) => p.result_checked).length ?? 0;
  const accuracy = checked > 0 ? Math.round((correct / checked) * 100) : 0;

  const chartData = (data?.allMatches ?? []).slice().reverse().map((m: any, i: number) => ({
    idx: i + 1,
    date: m.match_date,
    Gols: (m.home_goals ?? 0) + (m.away_goals ?? 0),
    Escanteios: (m.home_corners ?? 0) + (m.away_corners ?? 0),
  }));

  const teamBars = (() => {
    const map = new Map<string, { name: string; gf: number; ga: number; games: number }>();
    for (const m of data?.allMatches ?? []) {
      const h = m.home_team?.name; const a = m.away_team?.name;
      if (h) {
        const e = map.get(h) ?? { name: h, gf: 0, ga: 0, games: 0 };
        e.gf += m.home_goals ?? 0; e.ga += m.away_goals ?? 0; e.games++;
        map.set(h, e);
      }
      if (a) {
        const e = map.get(a) ?? { name: a, gf: 0, ga: 0, games: 0 };
        e.gf += m.away_goals ?? 0; e.ga += m.home_goals ?? 0; e.games++;
        map.set(a, e);
      }
    }
    return Array.from(map.values()).slice(0, 6).map((t) => ({
      name: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
      "Gols marcados": +(t.gf / t.games).toFixed(2),
      "Gols sofridos": +(t.ga / t.games).toFixed(2),
    }));
  })();

  const cards = [
    { label: "Ligas habilitadas", value: trackedLeaguesCount, icon: Trophy },
    { label: "Times no histórico", value: teamsCount, icon: Users },
    { label: "Jogos hoje", value: todayFixtures.length, icon: ListOrdered },
    { label: "Previsões geradas", value: aiGeneratedCount, icon: Target },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumo da sua análise</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-input disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="grid gap-6 mt-8 lg:grid-cols-2">
          <div className="card-surface p-5">
            <h2 className="font-display font-semibold mb-3">Gols e escanteios (últimos jogos)</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gols" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Escanteios" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-surface p-5">
            <h2 className="font-display font-semibold mb-3">Média de gols por time</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Gols marcados" fill="var(--primary)" />
                  <Bar dataKey="Gols sofridos" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Meus favoritos (14 dias)
            </h2>
            <Link to="/account" className="text-xs text-primary hover:underline">Gerenciar</Link>
          </div>
          {(data?.favFixtures ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Favorite times em <Link to="/account" className="text-primary">Minha Conta</Link> para acompanhar os próximos jogos aqui.
            </p>
          ) : (
            <ul className="space-y-2">
              {data!.favFixtures.slice(0, 5).map((m: any) => (
                <li key={m.fixtureId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <TeamBadge name={m.home.name} logoUrl={m.home.logo} size={24} />
                  <span className="text-sm flex-1 truncate">{m.home.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(m.date))}
                  </span>
                  <span className="text-sm flex-1 truncate text-right">{m.away.name}</span>
                  <TeamBadge name={m.away.name} logoUrl={m.away.logo} size={24} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Jogos de hoje</h2>
            <Link to="/upcoming" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {todayFixtures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo encontrado hoje. <Link to="/upcoming" className="text-primary">Ver próximos</Link>.</p>
          ) : (
            <ul className="space-y-1">
              {todayFixtures.slice(0, 5).map((m: any) => (
                <li key={m.fixtureId}>
                  <Link
                    to="/upcoming"
                    className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-primary/5 transition"
                  >
                    <TeamBadge name={m.home.name} logoUrl={m.home.logo} size={28} />
                    <span className="text-sm font-medium flex-1 truncate">{m.home.name}</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-input border border-border">VS</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatKickoff(m.date)}</span>
                    <span className="text-sm font-medium flex-1 truncate text-right">{m.away.name}</span>
                    <TeamBadge name={m.away.name} logoUrl={m.away.logo} size={28} />
                    <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      Ver previsão <ChevronRight className="h-3 w-3" />
                    </span>
                    <ChevronRight className="sm:hidden h-4 w-4 text-primary" />
                  </Link>
                </li>
              ))}
              {todayFixtures.length > 5 && (
                <li className="pt-2 text-xs text-muted-foreground">
                  +{todayFixtures.length - 5} jogo(s) hoje. <Link to="/upcoming" className="text-primary">Abrir lista completa</Link>.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="card-surface p-5 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Resumo de previsões
          </h2>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-background/50 border border-border">
              <div className="text-xs font-bold text-primary uppercase mb-1">Destaque</div>
              <p className="text-sm">
                {checked > 0
                  ? `Sua taxa de acerto atual é de ${accuracy}% em ${checked} previsão(ões) conferida(s).`
                  : predsCount > 0
                  ? `Você tem ${predsCount} previsão(ões) salva(s) aguardando conferência.`
                  : "Salve previsões nas telas Jogos ou Previsões para acompanhar sua taxa de acerto aqui."}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {trackedLeaguesCount} liga(s) habilitada(s) para monitoramento
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Taxa de acerto atual: {accuracy}% em {checked} previsão(ões) conferida(s)
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Compare times quaisquer em Previsão IA antes de apostar
              </li>
            </ul>
            <Link to="/predictions" className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Gerar novas previsões
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatKickoff(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}
