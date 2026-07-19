// Server-only shared fixtures importer used by both server functions and cron.
import { ApiSportsResponse } from "./api-sports.types";

const BASE = "https://v3.football.api-sports.io";

// In-memory TTL cache (per worker instance) — acelera muito chamadas repetidas.
const _cache = new Map<string, { at: number; ttl: number; data: any }>();
const _inflight = new Map<string, Promise<any>>();
const _computedCache = new Map<string, { at: number; ttl: number; data: any }>();
let _rateLimitedUntil = 0;

export function getComputedCache(key: string) {
  const hit = _computedCache.get(key);
  if (!hit || Date.now() - hit.at >= hit.ttl) return null;
  return hit.data;
}

export function setComputedCache(key: string, data: any, ttl: number) {
  _computedCache.set(key, { at: Date.now(), ttl, data });
}

function ttlFor(path: string): number {
  if (path.includes("live=")) return 20 * 1000;
  if (path.startsWith("/fixtures?date=")) return 10 * 60 * 1000;
  if (path.startsWith("/fixtures?team=")) return 30 * 60 * 1000;
  if (path.startsWith("/fixtures/headtohead")) return 30 * 60 * 1000;
  if (path.startsWith("/fixtures/statistics")) return 24 * 60 * 60 * 1000;
  if (path.startsWith("/odds")) return 5 * 60 * 1000;
  if (path.startsWith("/leagues") || path.startsWith("/teams")) return 60 * 60 * 1000;
  if (path.startsWith("/fixtures?league=") && path.includes("status=FT")) return 60 * 60 * 1000;
  if (path.startsWith("/fixtures?league=")) return 10 * 60 * 1000;
  return 5 * 60 * 1000;
}

let _rateLimitedIsDaily = false;

function nextUtcMidnight(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function applyRateLimit(msg: string): Error {
  // API-Sports usa mensagens diferentes pra "muitas requisições agora" (passa
  // em segundos) e "cota diária do plano esgotada" (só libera na virada do
  // dia, em UTC). Tratar as duas como "espere alguns segundos" é enganoso —
  // se for cota diária, a pessoa pode ficar horas achando que vai resolver
  // sozinho em instantes.
  const isDaily = /day|daily|dia\b|diári/i.test(msg);
  _rateLimitedIsDaily = isDaily;
  _rateLimitedUntil = isDaily ? nextUtcMidnight() : Date.now() + 90 * 1000;
  return isDaily
    ? new Error("Limite diário da API-Sports (plano grátis) esgotado. Libera automaticamente na virada do dia (horário UTC) — ou faça upgrade do plano em api-sports.io.")
    : new Error("Limite de requisições da API-Sports atingido. Aguarde alguns segundos e tente novamente.");
}

export async function apiSportsFetch<T = any>(path: string): Promise<ApiSportsResponse<T>> {
  const key = process.env.API_SPORTS_KEY;
  if (!key) throw new Error("API_SPORTS_KEY não configurada");

  const now = Date.now();
  const hit = _cache.get(path);
  if (hit && now - hit.at < hit.ttl) return hit.data;

  // Se a API externa já avisou limite, não continue martelando a cada render/click.
  // Usa cache antigo quando existir e, quando não existir, falha rápido até liberar.
  if (now < _rateLimitedUntil) {
    if (hit) return hit.data;
    if (_rateLimitedIsDaily) {
      throw new Error("Limite diário da API-Sports (plano grátis) esgotado. Libera automaticamente na virada do dia (horário UTC) — ou faça upgrade do plano em api-sports.io.");
    }
    const wait = Math.max(10, Math.ceil((_rateLimitedUntil - now) / 1000));
    throw new Error(`Limite temporário da API externa. Tente novamente em ${wait}s.`);
  }

  const pending = _inflight.get(path);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": key } });
    if (res.status === 429) {
      const err = applyRateLimit(res.statusText || "");
      if (hit) return hit.data;
      throw err;
    }
    if (!res.ok) throw new Error(`API-Sports ${res.status}`);
    const json = await res.json();
    const errs = json.errors;
    if (errs && !Array.isArray(errs) && typeof errs === "object" && Object.keys(errs).length > 0) {
      const msg = Object.values(errs).join(" · ");
      if (/rate|limit|requests/i.test(msg)) {
        const err = applyRateLimit(msg);
        if (hit) return hit.data;
        throw err;
      }
      throw new Error(`API-Sports: ${msg}`);
    }
    _cache.set(path, { at: Date.now(), ttl: ttlFor(path), data: json });
    return json;
  })().finally(() => _inflight.delete(path));

  _inflight.set(path, p);
  return p;
}

// O parâmetro `last` (ex: /fixtures?team=X&last=10) não é permitido em
// planos grátis da API-Sports. A alternativa suportada é buscar por
// `season` e pegar os últimos N jogos nós mesmos. Como o ano da "season"
// varia por convenção (ligas europeias usam o ano de início, ex: 2025
// pra temporada 2025/26; ligas como o Brasileirão usam o ano corrente),
// busca as duas temporadas mais prováveis e junta o resultado.
export async function recentFixturesForTeam(teamId: number, limit: number): Promise<any[]> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const euSeasonGuess = month >= 7 ? year : year - 1; // temporada europeia (ago-mai)
  const seasons = Array.from(new Set([year, euSeasonGuess]));

  const settled = await Promise.allSettled(
    seasons.map((s) => apiSportsFetch<any>(`/fixtures?team=${teamId}&season=${s}`))
  );
  const all: any[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...(r.value.response ?? []));
  }
  if (all.length === 0 && settled.every((r) => r.status === "rejected")) {
    const firstError = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw firstError?.reason instanceof Error ? firstError.reason : new Error("Não foi possível carregar os jogos do time.");
  }

  const seen = new Set<number>();
  const deduped = all.filter((f) => {
    const id = f.fixture?.id;
    if (id == null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return deduped
    .sort((a, b) => (b.fixture.date as string).localeCompare(a.fixture.date as string))
    .slice(0, limit);
}

// Mesma limitação vale pro head-to-head: busca o histórico completo entre
// os dois times (sem `last`) e corta os N mais recentes aqui.
export async function recentHeadToHead(homeId: number, awayId: number, limit: number): Promise<any[]> {
  const json = await apiSportsFetch<any>(`/fixtures/headtohead?h2h=${homeId}-${awayId}`);
  const all = (json.response ?? []) as any[];
  return [...all]
    .sort((a, b) => (b.fixture.date as string).localeCompare(a.fixture.date as string))
    .slice(0, limit);
}

export type ImportArgs = {
  supabase: any;
  userId: string;
  leagueId: number;
  season: number;
  leagueName?: string;
  country?: string;
  includeStats?: boolean;
};

// Roda até `limit` tarefas em paralelo por vez, em vez de uma de cada vez.
// Com um circuit breaker de rate limit já embutido no apiSportsFetch, um
// paralelismo moderado acelera bastante o import sem martelar a API.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function importFixturesFor({
  supabase, userId, leagueId, season, leagueName, country, includeStats,
}: ImportArgs) {
  // Busca tanto jogos finalizados (para estatísticas) quanto agendados (para previsões)
  const [jsonFT, jsonNS] = await Promise.all([
    apiSportsFetch(`/fixtures?league=${leagueId}&season=${season}&status=FT`),
    apiSportsFetch(`/fixtures?league=${leagueId}&season=${season}&status=NS-TBD`)
  ]);

  const fixtures: any[] = [...(jsonFT.response ?? []), ...(jsonNS.response ?? [])];
  if (fixtures.length === 0) return { imported: 0, teamsCreated: 0, skipped: 0, statsFetched: 0 };

  const teamMap = new Map<number, { name: string; logo: string }>();
  for (const f of fixtures) {
    teamMap.set(f.teams.home.id, { name: f.teams.home.name, logo: f.teams.home.logo });
    teamMap.set(f.teams.away.id, { name: f.teams.away.name, logo: f.teams.away.logo });
  }

  const { data: existingTeams } = await supabase.from("teams").select("id, name, api_id").eq("user_id", userId);
  const byName = new Map<string, string>((existingTeams ?? []).map((t: any) => [t.name.toLowerCase() as string, t.id as string]));
  const byApiId = new Map<number, string>((existingTeams ?? []).filter((t: any) => t.api_id != null).map((t: any) => [t.api_id as number, t.id as string]));

  // Times criados antes desta correção não têm api_id salvo — preenche agora
  // para que a página de jogos consiga casar o histórico local com a API.
  const backfill: { id: string; api_id: number }[] = [];
  for (const [apiId, t] of teamMap) {
    const localId = byName.get(t.name.toLowerCase());
    if (localId && !byApiId.has(apiId)) {
      backfill.push({ id: localId, api_id: apiId });
      byApiId.set(apiId, localId);
    }
  }
  if (backfill.length > 0) {
    await Promise.all(backfill.map((b) => supabase.from("teams").update({ api_id: b.api_id }).eq("id", b.id)));
  }

  let teamsCreated = 0;
  const toInsert: { user_id: string; name: string; logo_url: string; league: string | null; country: string | null; api_id: number }[] = [];
  for (const [apiId, t] of teamMap) {
    if (!byName.has(t.name.toLowerCase())) {
      toInsert.push({
        user_id: userId,
        name: t.name,
        logo_url: t.logo,
        league: leagueName ?? null,
        country: country ?? null,
        api_id: apiId,
      });
    }
  }
  if (toInsert.length > 0) {
    const { data: created, error } = await supabase.from("teams").insert(toInsert).select("id, name, api_id");
    if (error) throw new Error(error.message);
    for (const t of created ?? []) {
      byName.set((t.name as string).toLowerCase(), t.id as string);
      if (t.api_id != null) byApiId.set(t.api_id as number, t.id as string);
    }
    teamsCreated = created?.length ?? 0;
  }

  const { data: existing } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id, match_date")
    .eq("user_id", userId);
  const seen = new Set(
    (existing ?? []).map((m: any) => `${m.home_team_id}|${m.away_team_id}|${m.match_date}`)
  );

  const rows: any[] = [];
  const fixtureRefs: { fixtureId: number; idx: number; homeName: string; awayName: string }[] = [];
  let skipped = 0;
  for (const f of fixtures) {
    const hid = byName.get(f.teams.home.name.toLowerCase());
    const aid = byName.get(f.teams.away.name.toLowerCase());
    if (!hid || !aid) { skipped++; continue; }
    const date = (f.fixture.date as string).slice(0, 10);
    const key = `${hid}|${aid}|${date}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    fixtureRefs.push({ fixtureId: f.fixture.id, idx: rows.length, homeName: f.teams.home.name, awayName: f.teams.away.name });
    rows.push({
      user_id: userId,
      home_team_id: hid,
      away_team_id: aid,
      match_date: date,
      home_goals: f.goals.home ?? 0,
      away_goals: f.goals.away ?? 0,
      home_goals_ht: f.score?.halftime?.home ?? 0,
      away_goals_ht: f.score?.halftime?.away ?? 0,
    });
  }

  let statsFetched = 0;
  if (includeStats && fixtureRefs.length > 0) {
    const cap = Math.min(fixtureRefs.length, 40);
    const toFetch = fixtureRefs.slice(0, cap);
    // 5 em paralelo: ~5x mais rápido que sequencial, mantendo folga pro
    // circuit breaker de rate limit do apiSportsFetch agir se precisar.
    await mapWithConcurrency(toFetch, 5, async (ref) => {
      try {
        const sj = await apiSportsFetch(`/fixtures/statistics?fixture=${ref.fixtureId}`);
        const teamsStats: any[] = sj.response ?? [];
        for (const ts of teamsStats) {
          const isHome = ts.team?.name?.toLowerCase() === ref.homeName.toLowerCase();
          const get = (t: string) => {
            const v = ts.statistics?.find((s: any) => s.type === t)?.value;
            return typeof v === "number" ? v : parseInt(v) || 0;
          };
          const corners = get("Corner Kicks");
          const yellow = get("Yellow Cards");
          const red = get("Red Cards");
          if (isHome) {
            rows[ref.idx].home_corners = corners;
            rows[ref.idx].home_yellow = yellow;
            rows[ref.idx].home_red = red;
          } else {
            rows[ref.idx].away_corners = corners;
            rows[ref.idx].away_yellow = yellow;
            rows[ref.idx].away_red = red;
          }
        }
        statsFetched++;
      } catch { /* segue sem stats nesse jogo específico */ }
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("matches").insert(rows);
    if (error) throw new Error(error.message);
  }

  return { imported: rows.length, teamsCreated, skipped, statsFetched };
}
