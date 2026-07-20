import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";
import { fetchAndCacheLiveFixtures } from "@/lib/api-sports.functions";

// Lógica principal do cron, reaproveitada tanto pelo endpoint público
// (chamado pelo agendador externo, protegido por CRON_SECRET) quanto pela
// função autenticada que o botão "Rodar agora" usa (protegida por login
// normal, sem precisar do segredo).
export async function runFixturesRefresh(triggeredBy: "schedule" | "manual" = "schedule") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runLog } = await supabaseAdmin
    .from("cron_runs")
    .insert({ job: "refresh-fixtures", triggered_by: triggeredBy })
    .select("id")
    .single();

  try {
    const result = await runFixturesRefreshInner(supabaseAdmin);
    if (runLog) {
      await supabaseAdmin.from("cron_runs").update({
        finished_at: new Date().toISOString(),
        success: true,
        details: { processed: result.processed, liveFixturesUpdated: result.liveFixturesUpdated },
      }).eq("id", runLog.id);
    }
    return result;
  } catch (e: any) {
    if (runLog) {
      await supabaseAdmin.from("cron_runs").update({
        finished_at: new Date().toISOString(),
        success: false,
        error: e.message,
      }).eq("id", runLog.id);
    }
    throw e;
  }
}

async function runFixturesRefreshInner(supabaseAdmin: any) {

  // 0. Atualiza o cache de jogos ao vivo (a tela "Ao vivo" só lê isso,
  // nunca chama a API externa diretamente) — feito primeiro e isolado
  // com try/catch pra uma falha aqui não impedir o resto do cron
  // (importação de ligas) de rodar.
  let liveUpdated = 0;
  try {
    const live = await fetchAndCacheLiveFixtures(supabaseAdmin);
    liveUpdated = live.length;
  } catch { /* segue o cron mesmo se isso falhar */ }

  // 1. Sincronizar Fixtures (Jogos) para ligas monitoradas
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: leagues, error } = await supabaseAdmin
    .from("tracked_leagues")
    .select("*")
    .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
    .order("priority", { ascending: false })
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(30);

  if (error) throw new Error(error.message);

  // Com muitas ligas empatadas em prioridade 100, a ordenação não é
  // suficiente pra garantir que uma liga específica entre no lote de 30.
  // Garante explicitamente que o Brasileirão Série A (id 71 na
  // API-Sports) sempre seja tentado em toda execução.
  const MUST_RUN_LEAGUE_IDS = [71];
  const batch = [...(leagues ?? [])];
  const batchIds = new Set(batch.map((l) => l.id));
  const { data: mustRun } = await supabaseAdmin
    .from("tracked_leagues")
    .select("*")
    .in("league_id", MUST_RUN_LEAGUE_IDS);
  for (const l of (mustRun ?? [])) {
    if (!batchIds.has(l.id)) batch.push(l);
  }

  const results: any[] = [];
  for (const l of batch) {
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
      results.push({ id: l.id, type: "fixtures", league: l.league_name, ...r });
    } catch (e: any) {
      results.push({ id: l.id, type: "fixtures", league: l.league_name, error: e.message });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    liveFixturesUpdated: liveUpdated,
    processed: results.length,
    results,
  };
}

// Só o agendador externo (configurado com o mesmo CRON_SECRET) deve
// conseguir chamar esse endpoint — sem isso, qualquer pessoa na internet
// que descobrisse essa URL poderia disparar chamadas à API-Sports à
// vontade, gastando a cota do app de propósito.
function checkCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Se ainda não foi configurado, não bloqueia (evita quebrar o
  // agendamento já existente) — mas isso deveria ser configurado o
  // quanto antes.
  if (!secret) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkCronSecret(request)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        try {
          const result = await runFixturesRefresh("schedule");
          return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
      GET: async () => new Response("Cron endpoint active."),
    },
  },
});
