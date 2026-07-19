// Server-only shared fixtures importer used by both server functions and cron.
import { ApiSportsResponse } from "./api-sports.types";

const BASE = "https://v3.football.api-sports.io";

// In-memory TTL cache (per worker instance) — acelera muito chamadas repetidas.
const _cache = new Map<string, { at: number; ttl: number; data: any }>();
const _inflight = new Map<string, Promise<any>>();
const _computedCache = new Map<string, { at: number; ttl: number; data: any }>();
let _rateLimitedUntil = 0;

// Throttle global: garante um espaçamento mínimo entre chamadas reais à
// API-Sports, prevenindo rajadas em vez de só reagir depois que o limite
// de requisições por minuto já estourou.
//
// IMPORTANTE: isso usa uma função no banco (claim_api_sports_slot) como
// relógio COMPARTILHADO entre todas as instâncias do servidor. Uma
// variável só em memória JS não funciona de verdade aqui — o app roda em
// múltiplas instâncias (Cloudflare Workers) que não compartilham memória
// entre si, então cada uma tinha seu próprio contador e podiam disparar
// chamadas ao mesmo tempo sem saber uma da outra, estourando o limite
// mesmo com o throttle "ativo". O banco resolve isso porque é compartilhado
// de verdade entre todas as instâncias.
//
// Confirmado pelo usuário: plano Pro da API-Sports = 300 requisições por
// minuto. Os valores anteriores (350ms, depois 2200ms, depois 4000ms)
// eram todos chutes às cegas tentando adivinhar esse número — e estavam
// bem mais conservadores do que precisava, o que não deveria ter causado
// os erros de rajada vistos. Com o número real confirmado, usa uma
// margem de segurança generosa mas sem travar a aplicação à toa.
const MIN_REQUEST_INTERVAL_MS = 250; // 300rpm real → 240rpm com margem de 20%
const DB_SLOT_TIMEOUT_MS = 4000; // se o banco não responder rápido, cai no fallback em vez de travar tudo

// Fallback em memória, usado se a chamada ao banco falhar ou demorar
// demais — não protege entre instâncias diferentes, mas garante que a
// aplicação nunca trava esperando o banco pra sempre.
let _dispatchChain: Promise<void> = Promise.resolve();
let _lastDispatchAt = 0;

function localFallbackSlot(): Promise<void> {
  const slot = _dispatchChain.then(async () => {
    const wait = Math.max(0, _lastDispatchAt + MIN_REQUEST_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _lastDispatchAt = Date.now();
  });
  _dispatchChain = slot.catch(() => {});
  return slot;
}

async function throttledSlot(): Promise<void> {
  try {
    // Importação tardia (mesmo padrão usado no resto do projeto pra esse
    // cliente) — evita qualquer problema de ordem de carregamento de módulo.
    const dbCall = (async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.rpc("claim_api_sports_slot", {
        min_interval_ms: MIN_REQUEST_INTERVAL_MS,
      });
      if (error) throw error;
      return data as unknown as string;
    })();

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DB_SLOT_TIMEOUT_MS));
    const result = await Promise.race([dbCall, timeout]);

    if (result === null) {
      // Banco não respondeu a tempo — não trava a aplicação esperando.
      await localFallbackSlot();
      return;
    }
    const slotAt = new Date(result).getTime();
    const wait = Math.max(0, slotAt - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  } catch {
    await localFallbackSlot();
  }
}

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
let _lastRateLimitReason = "";

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
  _lastRateLimitReason = msg;
  const reasonSuffix = msg ? ` (${msg})` : "";
  return isDaily
    ? new Error(`Cota diária da API-Sports (fornecedor externo de dados de futebol, api-sports.io) esgotada. Isso é do plano da API-Sports — não do seu plano Lovable. Libera na virada do dia (UTC) ou faça upgrade em api-sports.io.${reasonSuffix}`)
    : new Error(`Rajada de requisições à API-Sports (fornecedor externo de dados de futebol, api-sports.io) — o limite é POR MINUTO do plano da API-Sports, não do seu plano Lovable. Aguarde alguns segundos.${reasonSuffix}`);
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
    const reasonSuffix = _lastRateLimitReason ? ` (${_lastRateLimitReason})` : "";
    if (_rateLimitedIsDaily) {
      throw new Error(`Limite diário da API-Sports (plano grátis) esgotado. Libera automaticamente na virada do dia (horário UTC) — ou faça upgrade do plano em api-sports.io.${reasonSuffix}`);
    }
    const wait = Math.max(10, Math.ceil((_rateLimitedUntil - now) / 1000));
    throw new Error(`Limite de requisições da API-Sports atingido (provavelmente rajada). Tente novamente em ${wait}s.${reasonSuffix}`);
  }

  const pending = _inflight.get(path);
  if (pending) return pending;

  const p = (async () => {
    await throttledSlot();
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        headers: { "x-apisports-key": key },
        signal: AbortSignal.timeout(15000),
      });
    } catch (e: any) {
      if (hit) return hit.data;
      throw new Error(`API-Sports não respondeu em 15s (${e?.name ?? "erro de rede"}).`);
    }
    if (res.status === 429) {
      let reason = res.statusText || "";
      try {
        const body = await res.clone().json();
        const errs = body?.errors;
        if (errs && typeof errs === "object") reason = Object.values(errs).join(" · ") || reason;
      } catch { /* corpo pode não ser JSON */ }
      const err = applyRateLimit(reason);
      if (hit) return hit.data;
      throw err;
    }
    if (!res.ok) throw new Error(`API-Sports ${res.status}`);
    const json = await res.json();
    const errs = json.errors;
    if (errs && !Array.isArray(errs) && typeof errs === "object" && Object.keys(errs).length > 0) {
      const msg = Object.values(errs).join(" · ");
      // Precisa combinar uma frase específica de limite/cota — "requests"
      // sozinha é palavra comum demais e aparecia em mensagens de erro de
      // validação sem relação nenhuma com limite (ex: parâmetro inválido),
      // disparando o bloqueio de 90s sem necessidade.
      const isRateLimitMsg = /rate.?limit|too many requests|requests?\s*per\s*(day|minute|second|hour)|maximum\s*(number\s*of\s*)?requests|request\s*limit|quota\s*exceed|exceed.*quota/i.test(msg);
      if (isRateLimitMsg) {
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
// tenta a temporada mais provável primeiro e só busca a segunda se a
// primeira não trouxer jogos suficientes — evita disparar 2 chamadas em
// paralelo por time sempre, o que multiplica rápido quando vários jogos
// são abertos em sequência (risco de estourar limite de rajada da API).
export async function recentFixturesForTeam(teamId: number, limit: number): Promise<any[]> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const euSeasonGuess = month >= 7 ? year : year - 1; // temporada europeia (ago-mai)
  const seasons = Array.from(new Set([year, euSeasonGuess]));

  const dedupe = (fixtures: any[]) => {
    const seen = new Set<number>();
    return fixtures.filter((f) => {
      const id = f.fixture?.id;
      if (id == null || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };
  const sortRecent = (fixtures: any[]) =>
    [...fixtures].sort((a, b) => (b.fixture.date as string).localeCompare(a.fixture.date as string));

  const first = await apiSportsFetch<any>(`/fixtures?team=${teamId}&season=${seasons[0]}`);
  let all = first.response ?? [];
  const finishedCount = all.filter((f: any) => f.fixture?.status?.short === "FT").length;

  // Só busca a segunda temporada se a primeira não trouxe jogos finalizados
  // suficientes (ex: início de temporada, ou convenção de ano errada).
  if (finishedCount < limit && seasons[1] != null) {
    try {
      const second = await apiSportsFetch<any>(`/fixtures?team=${teamId}&season=${seasons[1]}`);
      all = [...all, ...(second.response ?? [])];
    } catch { /* segue só com a primeira temporada */ }
  }

  return sortRecent(dedupe(all)).slice(0, limit);
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

  const teamMap = new Map<number, { name: string; logo: string; leagueName: string | null; country: string | null }>();
  for (const f of fixtures) {
    // Usa a liga/país de cada jogo específico (vindo direto da API-Sports,
    // f.league), não o parâmetro genérico passado pra função inteira — se
    // o league_id salvo em "ligas monitoradas" estiver levemente errado
    // (aconteceu no import em massa antigo), isso evitava que TODO time
    // daquela chamada herdasse um rótulo de liga errado.
    const fixtureLeague = (f.league?.name as string) ?? leagueName ?? null;
    const fixtureCountry = (f.league?.country as string) ?? country ?? null;
    teamMap.set(f.teams.home.id, { name: f.teams.home.name, logo: f.teams.home.logo, leagueName: fixtureLeague, country: fixtureCountry });
    teamMap.set(f.teams.away.id, { name: f.teams.away.name, logo: f.teams.away.logo, leagueName: fixtureLeague, country: fixtureCountry });
  }

  const { data: existingTeams } = await supabase.from("teams").select("id, name, api_id, league, country").eq("user_id", userId);
  const byName = new Map<string, string>((existingTeams ?? []).map((t: any) => [t.name.toLowerCase() as string, t.id as string]));
  const byApiId = new Map<number, string>((existingTeams ?? []).filter((t: any) => t.api_id != null).map((t: any) => [t.api_id as number, t.id as string]));
  const existingLeagueByName = new Map<string, { league: string | null; country: string | null }>(
    (existingTeams ?? []).map((t: any) => [t.name.toLowerCase() as string, { league: t.league, country: t.country }]),
  );

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
  const toFixLabel: { id: string; league: string | null; country: string | null }[] = [];
  for (const [apiId, t] of teamMap) {
    if (!byName.has(t.name.toLowerCase())) {
      toInsert.push({
        user_id: userId,
        name: t.name,
        logo_url: t.logo,
        league: t.leagueName,
        country: t.country,
        api_id: apiId,
      });
    } else {
      // Time já existe: só corrige o rótulo quando o PAÍS salvo está
      // claramente errado (sinal forte de erro de verdade, como aconteceu
      // com times sul-americanos rotulados como "J1 League"/Japão). Não
      // corrige só por causa da liga ser diferente — um time joga várias
      // competições no mesmo país (liga nacional + copa), e comparar só
      // pela liga fazia o rótulo ficar trocando toda vez que o time
      // aparecia em outra competição, escondendo ele do filtro da liga
      // principal (foi o que aconteceu com o Santos, sumindo do filtro
      // "Serie A" ao ser reimportado via alguma copa).
      const localId = byName.get(t.name.toLowerCase())!;
      const current = existingLeagueByName.get(t.name.toLowerCase());
      if (t.leagueName && current && (!current.league || (t.country && current.country && current.country !== t.country))) {
        toFixLabel.push({ id: localId, league: t.leagueName, country: t.country });
      }
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
  if (toFixLabel.length > 0) {
    await Promise.all(toFixLabel.map((f) => supabase.from("teams").update({ league: f.league, country: f.country }).eq("id", f.id)));
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
