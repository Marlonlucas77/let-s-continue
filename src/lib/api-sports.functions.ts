import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { apiSportsFetch, importFixturesFor, getComputedCache, setComputedCache } from "@/lib/fixtures-importer.server";
import { ApiSportsFixture, ApiSportsLeague, ApiSportsOdd } from "./api-sports.types";
import { Json } from "@/integrations/supabase/types";

export const searchLeagues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => z.object({ query: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const json = await apiSportsFetch<ApiSportsLeague>(`/leagues?search=${encodeURIComponent(data.query)}`);
    return (json.response ?? []).slice(0, 30).map((r) => ({
      id: r.league.id as number,
      name: r.league.name as string,
      type: r.league.type as string,
      country: r.country.name as string,
      logo: r.league.logo as string,
      seasons: (r.seasons ?? []).map((s) => s.year).sort((a, b) => b - a).slice(0, 8),
    }));
  });

export const listAllLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return TOP_LEAGUES.map(toLeagueOption);
  });


export const importFixtures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leagueId: number; season: number; leagueName?: string; country?: string; includeStats?: boolean }) =>
    z.object({
      leagueId: z.number().int(),
      season: z.number().int().min(1900).max(2100),
      leagueName: z.string().optional(),
      country: z.string().optional(),
      includeStats: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return await importFixturesFor({
      supabase, userId,
      leagueId: data.leagueId,
      season: data.season,
      leagueName: data.leagueName,
      country: data.country,
      includeStats: data.includeStats,
    });
  });

export const trackLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leagueId: number; season: number; leagueName: string; country?: string; includeStats?: boolean }) =>
    z.object({
      leagueId: z.number().int(),
      season: z.number().int(),
      leagueName: z.string(),
      country: z.string().optional(),
      includeStats: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertLeagueQuota } = await import("@/lib/plan-limits.server");
    await assertLeagueQuota(supabase, userId, 1);
    const { error } = await supabase.from("tracked_leagues").upsert({
      user_id: userId,
      league_id: data.leagueId,
      season: data.season,
      league_name: data.leagueName,
      country: data.country ?? null,
      include_stats: data.includeStats ?? false,
    }, { onConflict: "user_id,league_id,season" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Catálogo local das 50 competições principais. A tela de Configurações
// não deve chamar /leagues?current=true a cada usuário, porque isso consome
// a mesma cota por minuto usada para importar jogos. Busca manual continua
// possível via searchLeagues, mas a experiência padrão fica 100% local.
type CuratedLeague = { id: number; name: string; country: string; seasonMode?: "calendar" | "europe" };
const TOP_LEAGUES: CuratedLeague[] = [
  { id: 39, name: "Premier League", country: "England", seasonMode: "europe" },
  { id: 140, name: "La Liga", country: "Spain", seasonMode: "europe" },
  { id: 135, name: "Serie A", country: "Italy", seasonMode: "europe" },
  { id: 78, name: "Bundesliga", country: "Germany", seasonMode: "europe" },
  { id: 61, name: "Ligue 1", country: "France", seasonMode: "europe" },
  { id: 94, name: "Primeira Liga", country: "Portugal", seasonMode: "europe" },
  { id: 88, name: "Eredivisie", country: "Netherlands", seasonMode: "europe" },
  { id: 144, name: "Jupiler Pro League", country: "Belgium", seasonMode: "europe" },
  { id: 179, name: "Premiership", country: "Scotland", seasonMode: "europe" },
  { id: 203, name: "Süper Lig", country: "Turkey", seasonMode: "europe" },
  { id: 197, name: "Super League 1", country: "Greece", seasonMode: "europe" },
  { id: 218, name: "Bundesliga", country: "Austria", seasonMode: "europe" },
  { id: 207, name: "Super League", country: "Switzerland", seasonMode: "europe" },
  { id: 40, name: "Championship", country: "England", seasonMode: "europe" },
  { id: 141, name: "Segunda División", country: "Spain", seasonMode: "europe" },
  { id: 136, name: "Serie B", country: "Italy", seasonMode: "europe" },
  { id: 79, name: "2. Bundesliga", country: "Germany", seasonMode: "europe" },
  { id: 62, name: "Ligue 2", country: "France", seasonMode: "europe" },
  { id: 45, name: "FA Cup", country: "England", seasonMode: "europe" },
  { id: 143, name: "Copa del Rey", country: "Spain", seasonMode: "europe" },
  { id: 137, name: "Coppa Italia", country: "Italy", seasonMode: "europe" },
  { id: 81, name: "DFB Pokal", country: "Germany", seasonMode: "europe" },
  { id: 66, name: "Coupe de France", country: "France", seasonMode: "europe" },
  { id: 48, name: "League Cup", country: "England", seasonMode: "europe" },
  { id: 71, name: "Serie A", country: "Brazil", seasonMode: "calendar" },
  { id: 72, name: "Serie B", country: "Brazil", seasonMode: "calendar" },
  { id: 73, name: "Copa Do Brasil", country: "Brazil", seasonMode: "calendar" },
  { id: 128, name: "Liga Profesional Argentina", country: "Argentina", seasonMode: "calendar" },
  { id: 130, name: "Copa Argentina", country: "Argentina", seasonMode: "calendar" },
  { id: 268, name: "Primera División", country: "Uruguay", seasonMode: "calendar" },
  { id: 265, name: "Primera División", country: "Chile", seasonMode: "calendar" },
  { id: 239, name: "Primera A", country: "Colombia", seasonMode: "calendar" },
  { id: 281, name: "Primera División", country: "Peru", seasonMode: "calendar" },
  { id: 242, name: "Liga Pro", country: "Ecuador", seasonMode: "calendar" },
  { id: 250, name: "Primera División", country: "Paraguay", seasonMode: "calendar" },
  { id: 253, name: "Major League Soccer", country: "USA", seasonMode: "calendar" },
  { id: 262, name: "Liga MX", country: "Mexico", seasonMode: "calendar" },
  { id: 772, name: "Leagues Cup", country: "World", seasonMode: "calendar" },
  { id: 98, name: "J1 League", country: "Japan", seasonMode: "calendar" },
  { id: 292, name: "K League 1", country: "South Korea", seasonMode: "calendar" },
  { id: 169, name: "Super League", country: "China", seasonMode: "calendar" },
  { id: 307, name: "Pro League", country: "Saudi Arabia", seasonMode: "calendar" },
  { id: 188, name: "A-League", country: "Australia", seasonMode: "europe" },
  { id: 2, name: "UEFA Champions League", country: "World", seasonMode: "europe" },
  { id: 3, name: "UEFA Europa League", country: "World", seasonMode: "europe" },
  { id: 848, name: "UEFA Conference League", country: "World", seasonMode: "europe" },
  { id: 13, name: "CONMEBOL Libertadores", country: "World", seasonMode: "calendar" },
  { id: 11, name: "CONMEBOL Sudamericana", country: "World", seasonMode: "calendar" },
  { id: 1, name: "World Cup", country: "World", seasonMode: "calendar" },
  { id: 9, name: "Copa America", country: "World", seasonMode: "calendar" },
];

function seasonFor(mode: CuratedLeague["seasonMode"]): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  if (mode === "europe") return now.getUTCMonth() >= 6 ? year : year - 1;
  return year;
}

function toLeagueOption(l: CuratedLeague) {
  return { id: l.id, name: l.name, type: "League", country: l.country, logo: "", season: seasonFor(l.seasonMode) };
}

async function trackLeagueList(supabase: any, userId: string, list: CuratedLeague[]) {
  const { getUserPlan } = await import("@/lib/plan-limits.server");
  const { limits } = await getUserPlan(supabase, userId);
  let matched = list;
  if (limits.leagues !== Infinity) matched = matched.slice(0, limits.leagues);
  const leagues = matched.map((r) => ({
    user_id: userId,
    league_id: r.id,
    season: seasonFor(r.seasonMode),
    league_name: r.name,
    country: r.country,
    include_stats: false,
  }));
  if (leagues.length === 0) return { ok: true, count: 0 };
  const { error } = await supabase
    .from("tracked_leagues")
    .upsert(leagues, { onConflict: "user_id,league_id,season" });
  if (error) throw new Error(error.message);
  return { ok: true, count: leagues.length };
}

export const trackTopLeagues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => trackLeagueList(context.supabase, context.userId, TOP_LEAGUES));

// Habilita as 10 ligas padrão automaticamente — chamada logo após o
// cadastro (auth.tsx) e como reforço em Configurações pra quem já tem
// conta mas ainda não tem nenhuma liga habilitada. Não exige nenhuma
// escolha da pessoa; ela só vê o resultado pronto.
// "Rodar agora" (Configurações, só admin) — dispara o mesmo refresh do
// cron, mas via login normal em vez do endpoint público. Só admin porque
// isso afeta os dados de TODOS os usuários (roda o lote de ligas
// pendentes do app inteiro, não só as da pessoa que clicou) e consome a
// cota compartilhada da API — não é algo que um usuário comum deveria
// conseguir disparar à vontade.
export const runFixturesRefreshNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw new Error("Acesso restrito: apenas administradores.");
    const { runFixturesRefresh } = await import("@/routes/api/public/cron/refresh-fixtures");
    return runFixturesRefresh("manual");
  });

// Sincroniza somente as ligas monitoradas pelo próprio usuário logado.
// Sem restrição de admin: cada usuário pode disparar a importação das
// SUAS ligas quando quiser ver os jogos aparecerem imediatamente, sem
// esperar o cron. O throttle compartilhado da API-Sports evita abuso.
export const syncMyLeaguesNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: leagues, error } = await supabase
      .from("tracked_leagues")
      .select("*")
      .eq("user_id", userId)
      .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
      .order("last_run_at", { ascending: true, nullsFirst: true })
      .limit(10);
    if (error) throw new Error(error.message);
    if (!leagues || leagues.length === 0) {
      return { processed: 0, results: [{ skipped: true, reason: "Suas ligas já foram sincronizadas recentemente." }] as any[] };
    }
    const { importFixturesFor } = await import("@/lib/fixtures-importer.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: any[] = [];
    for (const l of leagues) {
      try {
        const r = await importFixturesFor({
          supabase: supabaseAdmin,
          userId: l.user_id,
          leagueId: l.league_id,
          season: l.season,
          leagueName: l.league_name,
          country: l.country ?? undefined,
          includeStats: l.include_stats ?? false,
        });
        await supabaseAdmin.from("tracked_leagues").update({ last_run_at: new Date().toISOString() }).eq("id", l.id);
        results.push({ league: l.league_name, ...r });
      } catch (e: any) {
        results.push({ league: l.league_name, error: e.message });
      }
    }
    return { processed: results.length, results };
  });


export const untrackLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Regra do produto: uma vez escolhida, a liga fica travada. Se quiser
    // uma outra, o usuário paga R$5 por liga extra (checkout Stripe).
    const { data: row, error: readErr } = await supabase
      .from("tracked_leagues")
      .select("id, is_locked")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Liga não encontrada.");
    if (row.is_locked) {
      throw new Error("Essa liga está travada e não pode ser removida. Escolha bem — cada nova liga custa R$5.");
    }
    const { error } = await supabase.from("tracked_leagues").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTrackedLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("tracked_leagues").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Lê os próximos jogos direto do banco local (populado em segundo plano
// pelo cron, via importFixturesFor) em vez de chamar a API-Sports na hora
// em que a pessoa abre a tela. Só mostra jogos das ligas monitoradas —
// se uma liga não estiver habilitada em Configurações, os jogos dela não
// aparecem aqui (isso é esperado: habilite a liga pra vê-la).
export const listUpcomingFixtures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(14).optional() }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = data.days ?? 14;

    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + days);

    // Jogos/times são dado público (vêm da API de futebol) — compartilhados
    // entre todos os usuários, importados uma vez por quem quer que tenha
    // habilitado a liga primeiro. Cada usuário só filtra pelas ligas que
    // ELE MESMO habilitou, não pelas que ele pessoalmente importou.
    const { data: tracked } = await supabase
      .from("tracked_leagues")
      .select("league_name, country")
      .eq("user_id", userId);
    const trackedList = (tracked ?? []).filter((t: any) => t.league_name);
    if (trackedList.length === 0) return [];
    const myLeagueNames = Array.from(new Set(trackedList.map((t: any) => t.league_name as string)));
    const allowedKeys = new Set(
      trackedList.map((t: any) => `${(t.league_name as string).toLowerCase()}|${(t.country ?? "").toLowerCase()}`),
    );

    const { data: rows, error } = await supabase
      .from("matches")
      .select(`
        id, api_fixture_id, kickoff_at, status, league_name, country,
        home_team:home_team_id ( id, name, logo_url, api_id ),
        away_team:away_team_id ( id, name, logo_url, api_id )
      `)
      .in("league_name", myLeagueNames)
      .in("status", ["NS", "TBD"])
      .gte("kickoff_at", from.toISOString())
      .lte("kickoff_at", to.toISOString())
      .order("kickoff_at", { ascending: true })
      .limit(1000);

    if (error) throw new Error(error.message);

    return (rows ?? [])
      .filter((r: any) => r.home_team && r.away_team && r.api_fixture_id)
      .filter((r: any) => allowedKeys.has(`${String(r.league_name ?? "").toLowerCase()}|${String(r.country ?? "").toLowerCase()}`))
      .map((r: any) => ({
        fixtureId: r.api_fixture_id as number,
        date: r.kickoff_at as string,
        league: (r.league_name ?? "") as string,
        country: r.country as string | undefined,
        home: { id: r.home_team.id, apiId: r.home_team.api_id, name: r.home_team.name, logo: r.home_team.logo_url },
        away: { id: r.away_team.id, apiId: r.away_team.api_id, name: r.away_team.name, logo: r.away_team.logo_url },
      }));

  });

export const getFixtureOdds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fixtureId: number }) => z.object({ fixtureId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const json = await apiSportsFetch<ApiSportsOdd>(`/odds?fixture=${data.fixtureId}`);
    const resp = (json.response ?? [])[0];
    if (!resp) return { markets: [], bookmakerCount: 0 };

    const best = new Map<string, { market: string; outcome: string; odd: number; bookmaker: string }>();
    const wanted: Record<string, string> = {
      "Match Winner": "1x2",
      "Both Teams Score": "BTTS",
      "Goals Over/Under": "Over/Under",
      "Corners Over Under": "Escanteios",
      "Total Corners": "Escanteios",
      "Cards Over Under": "Cartões",
    };

    for (const bm of (resp.bookmakers ?? [])) {
      for (const bet of (bm.bets ?? [])) {
        const label = wanted[bet.name];
        if (!label) continue;
        for (const v of (bet.values ?? [])) {
          const odd = parseFloat(v.odd);
          if (!isFinite(odd)) continue;
          const outcome = String(v.value);
          // Gols: só a linha de 2.5, que é o mercado mais comum. Escanteios
          // e cartões variam bastante de linha por jogo, então mantém todas
          // as linhas que as casas oferecem em vez de filtrar uma fixa.
          if (label === "Over/Under" && !/2\.5/.test(outcome)) continue;
          const key = `${label}::${outcome}`;
          const prev = best.get(key);
          if (!prev || odd > prev.odd) {
            best.set(key, { market: label, outcome, odd, bookmaker: bm.name });
          }
        }
      }
    }

    return {
      markets: Array.from(best.values()),
      bookmakerCount: (resp.bookmakers ?? []).length,
    };
  });

export const autoCheckPredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: preds } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("result_checked", false);
    if (!preds || preds.length === 0) return { checked: 0, correct: 0 };

    const { data: matches } = await supabase.from("matches").select("*");
    const all = matches ?? [];

    let checked = 0, correct = 0;
    for (const p of preds) {
      const predDate = (p.created_at as string).slice(0, 10);
      const m = all.find((x) =>
        ((x.home_team_id === p.home_team_id && x.away_team_id === p.away_team_id) ||
         (x.home_team_id === p.away_team_id && x.away_team_id === p.home_team_id)) &&
        x.match_date >= predDate
      );
      if (!m) continue;

      const d = p.predicted_data as {
        homeWinPct?: number; drawPct?: number; awayWinPct?: number;
        over25Pct?: number; bttsPct?: number;
        expectedCornersMin?: number; expectedCornersMax?: number; expectedYellow?: number;
      };
      const sameSide = m.home_team_id === p.home_team_id;
      const actualHome = sameSide ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
      const actualAway = sameSide ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
      const actualTotalGoals = actualHome + actualAway;

      // 1x2
      const picks = [
        { key: "home", pct: d.homeWinPct ?? 0 },
        { key: "draw", pct: d.drawPct ?? 0 },
        { key: "away", pct: d.awayWinPct ?? 0 },
      ].sort((a, b) => b.pct - a.pct);
      const predictedWinner = picks[0].key;
      const actualWinner = actualHome > actualAway ? "home" : actualHome < actualAway ? "away" : "draw";
      const wasCorrect = predictedWinner === actualWinner;

      // Over/Under 2.5
      const overUnderCorrect = d.over25Pct != null
        ? (d.over25Pct >= 50) === (actualTotalGoals > 2.5)
        : null;

      // Ambas marcam (BTTS)
      const bttsCorrect = d.bttsPct != null
        ? (d.bttsPct >= 50) === (actualHome > 0 && actualAway > 0)
        : null;

      // Escanteios: acerta se o total real caiu dentro da faixa prevista
      const actualCorners = (m.home_corners ?? 0) + (m.away_corners ?? 0);
      const cornersCorrect = d.expectedCornersMin != null && d.expectedCornersMax != null && actualCorners > 0
        ? actualCorners >= d.expectedCornersMin && actualCorners <= d.expectedCornersMax
        : null;

      // Cartões amarelos: tolerância de ±1 em relação ao previsto
      const actualYellow = (m.home_yellow ?? 0) + (m.away_yellow ?? 0);
      const cardsCorrect = d.expectedYellow != null && actualYellow > 0
        ? Math.abs(actualYellow - d.expectedYellow) <= 1
        : null;

      await supabase.from("predictions").update({
        result_checked: true,
        was_correct: wasCorrect,
        over_under_correct: overUnderCorrect,
        btts_correct: bttsCorrect,
        corners_correct: cornersCorrect,
        cards_correct: cardsCorrect,
      }).eq("id", p.id);
      checked++;
      if (wasCorrect) correct++;
    }
    return { checked, correct };
  });

function mapLiveFixtures(response: any[]): any[] {
  return (response ?? []).map((f: any) => ({
    fixtureId: f.fixture.id as number,
    date: f.fixture.date as string,
    status: f.fixture.status.short as string,
    elapsed: f.fixture.status.elapsed as number | null,
    league: f.league.name as string,
    leagueLogo: f.league.logo as string | undefined,
    country: f.league.country as string | undefined,
    home: { name: f.teams.home.name as string, logo: f.teams.home.logo as string, goals: f.goals.home ?? 0 },
    away: { name: f.teams.away.name as string, logo: f.teams.away.logo as string, goals: f.goals.away ?? 0 },
  })).sort((a: any, b: any) => a.league.localeCompare(b.league));
}

// Busca ao vivo de verdade na API-Sports — só o cron chama isso agora
// (guardando o resultado em live_fixtures_cache), não mais a tela
// diretamente. Fica exportada pra o endpoint de cron usar.
export async function fetchAndCacheLiveFixtures(supabaseAdmin: any) {
  const json = await apiSportsFetch("/fixtures?live=all");
  const fixtures = mapLiveFixtures(json.response ?? []);
  await supabaseAdmin
    .from("live_fixtures_cache")
    .update({ data: fixtures, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return fixtures;
}

// A tela "Ao vivo" lê daqui — consulta rápida ao próprio banco, sem
// depender da API externa responder na hora em que a pessoa está usando
// o app. Os dados são atualizados em segundo plano pelo cron.
export const listLiveFixtures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("live_fixtures_cache")
      .select("data, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Filtra pelas ligas que o usuário habilitou em Configurações — cada
    // usuário só vê ao vivo os jogos das ligas dele, igual acontece em
    // "Próximos jogos".
    const { data: tracked } = await supabase
      .from("tracked_leagues")
      .select("league_name, country")
      .eq("user_id", userId);
    const mine = new Set(
      (tracked ?? [])
        .filter((t: any) => t.league_name)
        .map((t: any) => `${String(t.league_name).toLowerCase()}|${String(t.country ?? "").toLowerCase()}`),
    );
    const all = (data?.data as any[]) ?? [];
    const fixtures = mine.size === 0
      ? []
      : all.filter((f: any) => mine.has(`${String(f.league ?? "").toLowerCase()}|${String(f.country ?? "").toLowerCase()}`));


    return {
      fixtures,
      updatedAt: data?.updated_at ?? null,
    };
  });



