import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";
import { fetchAndCacheLiveFixtures } from "@/lib/api-sports.functions";

// Lógica principal do cron, reaproveitada tanto pelo endpoint público
// (chamado pelo agendador externo, protegido por CRON_SECRET) quanto pela
// função autenticada que o botão "Rodar agora" usa (protegida por login
// normal, sem precisar do segredo).
export async function runFixturesRefresh(triggeredBy: "schedule" | "manual" = "schedule") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Limpa execuções antigas que ficaram abertas por timeout/interrupção do
  // runtime. Elas não podem bloquear o próximo cron para sempre.
  await supabaseAdmin
    .from("cron_runs")
    .update({
      finished_at: new Date().toISOString(),
      success: false,
      error: "Execução anterior interrompida antes de finalizar.",
    })
    .eq("job", "refresh-fixtures")
    .is("finished_at", null)
    .lt("started_at", new Date(Date.now() - 20 * 60 * 1000).toISOString());

  const { data: runLog } = await supabaseAdmin
    .from("cron_runs")
    .insert({ job: "refresh-fixtures", triggered_by: triggeredBy })
    .select("id")
    .single();

  // Evita sobreposição: duas execuções simultâneas eram o cenário que mais
  // facilmente criava rajada na API-Sports. Se já existe uma recente em
  // andamento, esta execução encerra sem importar nada.
  if (runLog) {
    const { data: activeRun } = await supabaseAdmin
      .from("cron_runs")
      .select("id")
      .eq("job", "refresh-fixtures")
      .is("finished_at", null)
      .neq("id", runLog.id)
      .gte("started_at", new Date(Date.now() - 20 * 60 * 1000).toISOString())
      .maybeSingle();

    if (activeRun) {
      const skipped = {
        timestamp: new Date().toISOString(),
        liveFixturesUpdated: 0,
        processed: 0,
        results: [{ skipped: true, reason: "Já existe uma sincronização em andamento." }],
      };
      await supabaseAdmin.from("cron_runs").update({
        finished_at: new Date().toISOString(),
        success: true,
        details: skipped,
      }).eq("id", runLog.id);
      return skipped;
    }
  }

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

  // 1. Sincronizar Fixtures (Jogos) para ligas monitoradas.
  // Importante: tracked_leagues tem uma linha por usuário. Se 100 usuários
  // seguem Brasileirão, isso continua sendo UMA liga para importar — não
  // 100 chamadas duplicadas. Agrupamos por league_id/season antes de bater
  // na API-Sports e depois atualizamos todas as assinaturas dessa liga.
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data: leagues, error } = await supabaseAdmin
    .from("tracked_leagues")
    .select("*")
    .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .order("priority", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  const byLeague = new Map<string, any & { include_stats: boolean }>();
  for (const l of (leagues ?? [])) {
    const key = `${l.league_id}:${l.season}`;
    const existing = byLeague.get(key);
    if (!existing) byLeague.set(key, { ...l, include_stats: !!l.include_stats });
    else if (l.include_stats) existing.include_stats = true;
  }

  // Garante explicitamente que o Brasileirão Série A (id 71 na API-Sports)
  // sempre seja tentado quando alguém acompanha essa liga.
  const MUST_RUN_LEAGUE_IDS = [71];
  const { data: mustRun } = await supabaseAdmin
    .from("tracked_leagues")
    .select("*")
    .in("league_id", MUST_RUN_LEAGUE_IDS);
  for (const l of (mustRun ?? [])) {
    const key = `${l.league_id}:${l.season}`;
    if (!byLeague.has(key)) byLeague.set(key, { ...l, include_stats: !!l.include_stats });
  }

  const batch = Array.from(byLeague.values()).slice(0, 60);

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
      await supabaseAdmin
        .from("tracked_leagues")
        .update({ last_run_at: new Date().toISOString() })
        .eq("league_id", l.league_id)
        .eq("season", l.season);
      results.push({ leagueId: l.league_id, type: "fixtures", league: l.league_name, ...r });
    } catch (e: any) {
      results.push({ leagueId: l.league_id, type: "fixtures", league: l.league_name, error: e.message });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    liveFixturesUpdated: liveUpdated,
    processed: results.length,
    results,
  };
}

import { isAuthorizedCron } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAuthorizedCron(request))) {
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
