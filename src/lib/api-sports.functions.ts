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

export const searchTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => z.object({ query: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const json = await apiSportsFetch(`/teams?search=${encodeURIComponent(data.query)}`);
    return (json.response ?? []).map((r: any) => ({
      id: r.team.id,
      name: r.team.name,
      country: r.team.country,
      logo: r.team.logo,
      founded: r.team.founded,
      venue: r.venue?.name,
    }));
  });

export const getTeamAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: number }) => z.object({ teamId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const json = await apiSportsFetch<ApiSportsFixture>(`/fixtures?team=${data.teamId}&last=20`);
    const fixtures = json.response ?? [];
    const done = fixtures.filter((f) => f.fixture?.status?.short === "FT");
    
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, btts = 0, o25 = 0, cs = 0;
    const form: ("W" | "D" | "L")[] = [];
    const recent: any[] = [];

    for (const f of done) {
      const isHome = f.teams.home.id === data.teamId;
      const my = (isHome ? f.goals.home : f.goals.away) ?? 0;
      const opp = (isHome ? f.goals.away : f.goals.home) ?? 0;
      gf += my; ga += opp;
      if (my > 0 && opp > 0) btts++;
      if (my + opp > 2.5) o25++;
      if (opp === 0) cs++;
      
      const res: "W" | "D" | "L" = my > opp ? "W" : my < opp ? "L" : "D";
      if (form.length < 10) form.push(res);
      recent.push({
        date: f.fixture.date.slice(0, 10),
        opponent: isHome ? f.teams.away.name : f.teams.home.name,
        opponentLogo: isHome ? f.teams.away.logo : f.teams.home.logo,
        gf: my, ga: opp, result: res, home: isHome
      });
    }

    const n = done.length || 1;
    return {
      games: done.length, wins: w, draws: d, losses: l,
      avgFor: Math.round((gf / n) * 100) / 100,
      avgAgainst: Math.round((ga / n) * 100) / 100,
      bttsPct: Math.round((btts / n) * 100),
      over25Pct: Math.round((o25 / n) * 100),
      cleanSheetPct: Math.round((cs / n) * 100),
      form, recent: recent.slice(0, 10)
    };
  });

export const compareTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { homeId: number; awayId: number }) => z.object({ homeId: z.number().int(), awayId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const [hRes, aRes, h2hRes] = await Promise.all([
      apiSportsFetch<ApiSportsFixture>(`/fixtures?team=${data.homeId}&last=15`),
      apiSportsFetch<ApiSportsFixture>(`/fixtures?team=${data.awayId}&last=15`),
      apiSportsFetch<ApiSportsFixture>(`/fixtures/headtohead?h2h=${data.homeId}-${data.awayId}&last=10`),
    ]);

    const stats = (fixtures: ApiSportsFixture[], teamId: number) => {
      const done = fixtures.filter(f => f.fixture?.status?.short === "FT");
      let w = 0, d = 0, l = 0, gf = 0, ga = 0, btts = 0, o25 = 0, cs = 0;
      const form: string[] = [];
      for (const f of done) {
        const isHome = f.teams.home.id === teamId;
        const my = (isHome ? f.goals.home : f.goals.away) ?? 0;
        const opp = (isHome ? f.goals.away : f.goals.home) ?? 0;
        gf += my; ga += opp;
        if (my > 0 && opp > 0) btts++;
        if (my + opp > 2.5) o25++;
        if (opp === 0) cs++;
        const res = my > opp ? "W" : my < opp ? "L" : "D";
        if (form.length < 5) form.push(res);
      }
      const n = done.length || 1;
      return {
        games: done.length, wins: w, draws: d, losses: l,
        avgFor: (gf / n).toFixed(2),
        avgAgainst: (ga / n).toFixed(2),
        bttsPct: Math.round((btts / n) * 100),
        over25Pct: Math.round((o25 / n) * 100),
        cleanSheetPct: Math.round((cs / n) * 100),
        form, recent: [], hasData: done.length > 0
      };
    };

    const home = stats(hRes.response ?? [], data.homeId);
    const away = stats(aRes.response ?? [], data.awayId);
    
    // H2H stats
    const h2hFixtures = h2hRes.response ?? [];
    let h2hW = 0, h2hD = 0, h2hL = 0, h2hG = 0, h2hBtts = 0, h2hO25 = 0;
    const h2hRecent = h2hFixtures.map(f => {
      const isHome = f.teams.home.id === data.homeId;
      const my = (isHome ? f.goals.home : f.goals.away) ?? 0;
      const opp = (isHome ? f.goals.away : f.goals.home) ?? 0;
      h2hG += (my + opp);
      if (my > 0 && opp > 0) h2hBtts++;
      if (my + opp > 2.5) h2hO25++;
      if (my > opp) h2hW++; else if (my < opp) h2hL++; else h2hD++;
      return {
        date: f.fixture.date.slice(0, 10),
        opponent: isHome ? f.teams.away.name : f.teams.home.name,
        gf: my, ga: opp
      };
    });

    const hn = h2hFixtures.length || 1;
    const prediction = {
      homeWinPct: 40, drawPct: 30, awayWinPct: 30,
      expectedGoals: 2.5, over25Pct: 50, bttsPct: 50
    };

    return {
      home, away,
      h2h: {
        games: h2hFixtures.length,
        wins: h2hW, draws: h2hD, losses: h2hL,
        avgFor: 0, avgAgainst: h2hG / hn,
        bttsPct: Math.round((h2hBtts / hn) * 100),
        over25Pct: Math.round((h2hO25 / hn) * 100),
        recent: h2hRecent
      },
      prediction,
      notice: h2hFixtures.length === 0 ? "Ainda não há histórico disponível para esses times agora." : null
    };
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

export const untrackLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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

export const listUpcomingFixtures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(14).optional() }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = data.days ?? 4;

    const [teamsRes, tracked] = await Promise.all([
      supabase.from("teams").select("id, name, logo_url").eq("user_id", userId),
      supabase.from("tracked_leagues").select("league_id, season").eq("user_id", userId),
    ]);
    const teams = teamsRes.data ?? [];
    const byName = new Map(teams.map((t: any) => [t.name.toLowerCase(), t]));
    const byApiId = new Map(teams.map((t: any) => [t.api_id, t]));
    const trackedList: { league_id: number; season: number }[] = tracked.data ?? [];

    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);

    // Fast path: fetch only user's tracked leagues (small payload, much faster).
    // Fallback: if user has no tracked leagues, fetch by date (global).
    let responses: ApiSportsFixture[][];
    if (trackedList.length > 0) {
      responses = await Promise.all(
        trackedList.map(async (t) => {
          try {
            const json = await apiSportsFetch<ApiSportsFixture>(
              `/fixtures?league=${t.league_id}&season=${t.season}&from=${from}&to=${to}&status=NS-TBD`
            );
            return json.response ?? [];
          } catch { return []; }
        })
      );
    } else {
      const dates: string[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
      responses = await Promise.all(
        dates.map(async (date) => {
          try {
            const json = await apiSportsFetch<ApiSportsFixture>(`/fixtures?date=${date}`);
            return json.response ?? [];
          } catch { return []; }
        })
      );
    }

    const out: {
      fixtureId: number;
      date: string;
      leagueId?: number;
      league: string;
      leagueLogo?: string;
      country?: string;
      venue?: string;
      home: { id: string | null; apiId: number; name: string; logo: string };
      away: { id: string | null; apiId: number; name: string; logo: string };
    }[] = [];
    const seen = new Set<number>();
    for (const list of responses) {
      for (const f of list) {
        const status = f.fixture?.status?.short;
        if (status && status !== "NS" && status !== "TBD") continue;
        if (seen.has(f.fixture.id)) continue;
        seen.add(f.fixture.id);
        const home = byApiId.get(f.teams.home.id) || byName.get(f.teams.home.name.toLowerCase());
        const away = byApiId.get(f.teams.away.id) || byName.get(f.teams.away.name.toLowerCase());
        out.push({
          fixtureId: f.fixture.id as number,
          date: f.fixture.date as string,
          leagueId: f.league?.id as number | undefined,
          league: (f.league?.name ?? "") as string,
          leagueLogo: f.league?.logo as string | undefined,
          country: f.league?.country as string | undefined,
          venue: f.fixture.venue?.name as string | undefined,
          home: { id: home?.id ?? null, apiId: f.teams.home.id, name: f.teams.home.name, logo: home?.logo_url ?? f.teams.home.logo },
          away: { id: away?.id ?? null, apiId: f.teams.away.id, name: f.teams.away.name, logo: away?.logo_url ?? f.teams.away.logo },
        });
      }
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
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
    };

    for (const bm of (resp.bookmakers ?? [])) {
      for (const bet of (bm.bets ?? [])) {
        const label = wanted[bet.name];
        if (!label) continue;
        for (const v of (bet.values ?? [])) {
          const odd = parseFloat(v.odd);
          if (!isFinite(odd)) continue;
          const outcome = String(v.value);
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

    const { data: matches } = await supabase.from("matches").select("*").eq("user_id", userId);
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
      const d = p.predicted_data as { homeWinPct?: number; drawPct?: number; awayWinPct?: number };
      const picks = [
        { key: "home", pct: d.homeWinPct ?? 0 },
        { key: "draw", pct: d.drawPct ?? 0 },
        { key: "away", pct: d.awayWinPct ?? 0 },
      ].sort((a, b) => b.pct - a.pct);
      const predicted = picks[0].key;
      const sameSide = m.home_team_id === p.home_team_id;
      const actualHome = sameSide ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
      const actualAway = sameSide ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
      const actual = actualHome > actualAway ? "home" : actualHome < actualAway ? "away" : "draw";
      const wasCorrect = predicted === actual;
      await supabase.from("predictions").update({ result_checked: true, was_correct: wasCorrect }).eq("id", p.id);
      checked++;
      if (wasCorrect) correct++;
    }
    return { checked, correct };
  });

export const analyzeFixture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fixtureId: number; homeId: number; awayId: number }) =>
    z.object({
      fixtureId: z.number().int(),
      homeId: z.number().int(),
      awayId: z.number().int(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    interface TeamStat {
      games: number;
      wins: number; draws: number; losses: number;
      goalsFor: number; goalsAgainst: number;
      avgFor: number; avgAgainst: number;
      bttsPct: number; over25Pct: number;
      form: ("W" | "D" | "L")[];
      recent: { date: string; opponent: string; gf: number; ga: number; result: "W" | "D" | "L"; home: boolean }[];
    }

    interface PredictionAnalysis {
      home: TeamStat;
      away: TeamStat;
      h2h: TeamStat;
      prediction: {
        homeWinPct: number;
        drawPct: number;
        awayWinPct: number;
        expectedGoals: number;
        over25Pct: number;
        bttsPct: number;
        confidenceScore: number;
        basis: string;
      };
    }

    // Cache: 1h para fixtures futuros/recentes — evita estourar cota da API-Sports
    const { data: cached } = await context.supabase
      .from("fixture_analysis_cache")
      .select("analysis, updated_at")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if (cached && cached.analysis && (Date.now() - new Date(cached.updated_at as string).getTime()) < 60 * 60 * 1000) {
      return cached.analysis as unknown as PredictionAnalysis;
    }

    const [homeJson, awayJson, h2hJson] = await Promise.all([
      apiSportsFetch<ApiSportsFixture>(`/fixtures?team=${data.homeId}&last=6`),
      apiSportsFetch<ApiSportsFixture>(`/fixtures?team=${data.awayId}&last=6`),
      apiSportsFetch<ApiSportsFixture>(`/fixtures/headtohead?h2h=${data.homeId}-${data.awayId}&last=6`),
    ]);


    const compute = (fixtures: ApiSportsFixture[], teamId: number): TeamStat => {
      let w = 0, d = 0, l = 0, gf = 0, ga = 0, btts = 0, o25 = 0;
      const form: ("W" | "D" | "L")[] = [];
      const recent: TeamStat["recent"] = [];
      const done = fixtures.filter((f) => f.fixture?.status?.short === "FT");
      const sorted = [...done].sort((a, b) => b.fixture.date.localeCompare(a.fixture.date));
      for (const f of sorted) {
        const isHome = f.teams.home.id === teamId;
        const my = (isHome ? f.goals.home : f.goals.away) ?? 0;
        const opp = (isHome ? f.goals.away : f.goals.home) ?? 0;
        gf += my; ga += opp;
        if ((f.goals.home ?? 0) > 0 && (f.goals.away ?? 0) > 0) btts++;
        if (((f.goals.home ?? 0) + (f.goals.away ?? 0)) > 2.5) o25++;
        let r: "W" | "D" | "L" = "D";
        if (my > opp) { w++; r = "W"; } else if (my < opp) { l++; r = "L"; } else d++;
        if (form.length < 10) form.push(r);
        recent.push({
          date: (f.fixture.date as string).slice(0, 10),
          opponent: (isHome ? f.teams.away.name : f.teams.home.name) as string,
          gf: my, ga: opp, result: r, home: isHome,
        });
      }
      const n = done.length || 1;
      return {
        games: done.length, wins: w, draws: d, losses: l,
        goalsFor: gf, goalsAgainst: ga,
        avgFor: gf / n, avgAgainst: ga / n,
        bttsPct: (btts / n) * 100, over25Pct: (o25 / n) * 100,
        form, recent: recent.slice(0, 5),
      };
    };

    const home = compute(homeJson.response ?? [], data.homeId);
    const away = compute(awayJson.response ?? [], data.awayId);
    const h2h = compute(h2hJson.response ?? [], data.homeId);

    const homeAtk = home.avgFor || 1.2;
    const awayAtk = away.avgFor || 1.0;
    const homeDef = home.avgAgainst || 1.0;
    const awayDef = away.avgAgainst || 1.2;
    const homeExp = (homeAtk + awayDef) / 2 + 0.15;
    const awayExp = (awayAtk + homeDef) / 2;
    const expectedGoals = homeExp + awayExp;

    const formScore = (f: ("W" | "D" | "L")[]) =>
      f.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / (f.length * 3 || 1);
    const rawHome = homeExp + formScore(home.form) * 0.5;
    const rawAway = awayExp + formScore(away.form) * 0.5;
    const rawDraw = Math.max(0.5, 1.5 - Math.abs(rawHome - rawAway));
    const sum = rawHome + rawAway + rawDraw;

    const bttsPct = (home.bttsPct + away.bttsPct) / 2;
    const over25Pct = expectedGoals > 2.5
      ? Math.min(85, 50 + (expectedGoals - 2.5) * 20)
      : Math.max(15, 50 - (2.5 - expectedGoals) * 20);

    const result: PredictionAnalysis = {
      home, away, h2h,
      prediction: {
        homeWinPct: Math.round((rawHome / sum) * 100),
        drawPct: Math.round((rawDraw / sum) * 100),
        awayWinPct: Math.round((rawAway / sum) * 100),
        expectedGoals: Math.round(expectedGoals * 10) / 10,
        over25Pct: Math.round(over25Pct),
        bttsPct: Math.round(bttsPct),
        confidenceScore: Math.round(Math.min(100, (home.games + away.games) * 2 + Math.abs(rawHome - rawAway) * 20)),
        basis: `Últimos ${home.games} jogos do mandante e ${away.games} do visitante · ${h2h.games} confrontos diretos.`,
      },
    };

    // Grava em cache (service_role via import dinâmico)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("fixture_analysis_cache").upsert({
        fixture_id: data.fixtureId,
        home_id: data.homeId,
        away_id: data.awayId,
        analysis: result as unknown as Json,
        updated_at: new Date().toISOString(),
      });
    } catch { /* cache é best-effort */ }

    return result;
  });

export const getAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fixtureId: number; homeName: string; awayName: string; analysis: any }) =>
    z.object({
      fixtureId: z.number().int(),
      homeName: z.string(),
      awayName: z.string(),
      analysis: z.any(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    // Verifica cache de ai_summary
    const { data: cached } = await context.supabase
      .from("fixture_analysis_cache")
      .select("ai_summary, updated_at")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if (cached?.ai_summary && (Date.now() - new Date(cached.updated_at as string).getTime()) < 6 * 60 * 60 * 1000) {
      return { summary: cached.ai_summary as string, cached: true };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const a = data.analysis;
    const prompt = `Analise em português brasileiro o confronto ${data.homeName} (casa) vs ${data.awayName} (fora). Escreva 3 parágrafos curtos:
1. Forma recente de cada time (use os dados)
2. O que esperar do jogo (gols, ritmo)
3. Palpite justificado

Dados:
- ${data.homeName}: ${a.home.wins}V ${a.home.draws}E ${a.home.losses}D em ${a.home.games} jogos, média ${a.home.avgFor.toFixed(1)} gols pró e ${a.home.avgAgainst.toFixed(1)} contra, forma: ${a.home.form.join("")}
- ${data.awayName}: ${a.away.wins}V ${a.away.draws}E ${a.away.losses}D em ${a.away.games} jogos, média ${a.away.avgFor.toFixed(1)} gols pró e ${a.away.avgAgainst.toFixed(1)} contra, forma: ${a.away.form.join("")}
- H2H: ${a.h2h.games} confrontos, mandante venceu ${a.h2h.wins}
- Probabilidade calculada: casa ${a.prediction.homeWinPct}% · empate ${a.prediction.drawPct}% · fora ${a.prediction.awayWinPct}%
- Gols esperados: ${a.prediction.expectedGoals} · Over 2.5: ${a.prediction.over25Pct}% · BTTS: ${a.prediction.bttsPct}%

Seja direto, sem introduções. Máximo 200 palavras total.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas requisições à IA. Aguarde um instante.");
      if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Erro da IA: ${res.status}`);
    }
    const json = await res.json();
    const summary = json.choices?.[0]?.message?.content ?? "Sem análise disponível.";

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (cached) {
        await supabaseAdmin.from("fixture_analysis_cache")
          .update({ ai_summary: summary, updated_at: new Date().toISOString() })
          .eq("fixture_id", data.fixtureId);
      } else {
        await supabaseAdmin.from("fixture_analysis_cache").upsert({
          fixture_id: data.fixtureId,
          home_id: 0, away_id: 0,
          analysis: data.analysis,
          ai_summary: summary,
          updated_at: new Date().toISOString(),
        });
      }
    } catch { /* best-effort */ }

    return { summary, cached: false };
  });

export const getAiPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fixtureId: number; homeName: string; awayName: string; analysis: any }) =>
    z.object({
      fixtureId: z.number().int(),
      homeName: z.string(),
      awayName: z.string(),
      analysis: z.any(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: cached } = await context.supabase
      .from("fixture_analysis_cache")
      .select("ai_prediction, updated_at")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if ((cached as any)?.ai_prediction && (Date.now() - new Date((cached as any).updated_at as string).getTime()) < 6 * 60 * 60 * 1000) {
      return { prediction: (cached as any).ai_prediction, cached: true };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const a = data.analysis;
    const system = `Você é um analista esportivo especialista em previsões de futebol. Retorne APENAS JSON válido, sem markdown, sem texto extra.`;
    const prompt = `Preveja o resultado de ${data.homeName} (casa) vs ${data.awayName} (fora).

Dados:
- ${data.homeName}: ${a.home.wins}V ${a.home.draws}E ${a.home.losses}D, média ${a.home.avgFor.toFixed(2)} gols pró / ${a.home.avgAgainst.toFixed(2)} sofr., forma ${a.home.form.join("")}, BTTS ${Math.round(a.home.bttsPct)}%, Over2.5 ${Math.round(a.home.over25Pct)}%
- ${data.awayName}: ${a.away.wins}V ${a.away.draws}E ${a.away.losses}D, média ${a.away.avgFor.toFixed(2)} gols pró / ${a.away.avgAgainst.toFixed(2)} sofr., forma ${a.away.form.join("")}, BTTS ${Math.round(a.away.bttsPct)}%, Over2.5 ${Math.round(a.away.over25Pct)}%
- H2H: ${a.h2h.games} jogos, mandante venceu ${a.h2h.wins}
- Modelo estatístico: casa ${a.prediction.homeWinPct}% / empate ${a.prediction.drawPct}% / fora ${a.prediction.awayWinPct}%, gols esperados ${a.prediction.expectedGoals}

Responda estritamente neste JSON:
{
  "predictedScore": { "home": <int>, "away": <int> },
  "winner": "home" | "draw" | "away",
  "confidence": <int 0-100>,
  "risk": "baixo" | "medio" | "alto",
  "topPicks": [
    { "market": "<mercado>", "pick": "<palpite>", "confidence": <int 0-100>, "reason": "<motivo curto>" }
  ],
  "keyInsight": "<uma frase decisiva sobre o jogo>"
}
Inclua 3 palpites em topPicks (ex: Resultado Final, Over/Under 2.5, Ambas Marcam, Handicap, Escanteios). Seja realista.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas requisições à IA. Aguarde um instante.");
      if (res.status === 402) throw new Error("Créditos da IA esgotados.");
      throw new Error(`Erro da IA: ${res.status}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let prediction: any;
    try {
      prediction = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      prediction = m ? JSON.parse(m[0]) : {};
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("fixture_analysis_cache").upsert({
        fixture_id: data.fixtureId,
        home_id: 0, away_id: 0,
        analysis: data.analysis,
        ai_prediction: prediction,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "fixture_id" });
    } catch { /* best-effort */ }

    return { prediction, cached: false };
  });

export const listLiveFixtures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const json = await apiSportsFetch("/fixtures?live=all");
    return (json.response ?? []).map((f: any) => ({
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
  });



