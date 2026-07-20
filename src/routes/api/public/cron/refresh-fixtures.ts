import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";
import { fetchAndCacheLiveFixtures } from "@/lib/api-sports.functions";

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 0. Atualiza o cache de jogos ao vivo (a tela "Ao vivo" só lê
        // isso, nunca chama a API externa diretamente) — feito primeiro e
        // isolado com try/catch pra uma falha aqui não impedir o resto do
        // cron (importação de ligas) de rodar.
        let liveUpdated = 0;
        try {
          const live = await fetchAndCacheLiveFixtures(supabaseAdmin);
          liveUpdated = live.length;
        } catch { /* segue o cron mesmo se isso falhar */ }

        // 1. Sincronizar Fixtures (Jogos) para ligas monitoradas
        const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        // Com o limite real confirmado (300 req/min), dá pra processar bem
        // mais ligas por execução sem risco — cada liga usa só 2-3
        // chamadas, então mesmo 30 ligas ficam bem dentro da margem.
        const { data: leagues, error } = await supabaseAdmin
          .from("tracked_leagues")
          .select("*")
          .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
          .order("priority", { ascending: false })
          .order("last_run_at", { ascending: true, nullsFirst: true })
          .limit(30);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // Com muitas ligas empatadas em prioridade 100 (todas nunca
        // rodadas), a ordenação não é suficiente pra garantir que uma
        // liga específica entre no lote de 30 — ela pode "perder" o
        // desempate várias vezes seguidas. Garante explicitamente que o
        // Brasileirão Série A (id 71 na API-Sports) sempre seja tentado
        // em toda execução, além do lote normal, não competindo por vaga.
        const MUST_RUN_LEAGUE_IDS = [71]; // Brasileirão Série A
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
            results.push({ id: l.id, type: 'fixtures', league: l.league_name, ...r });
          } catch (e: any) {
            results.push({ id: l.id, type: 'fixtures', league: l.league_name, error: e.message });
          }
        }

        return new Response(JSON.stringify({ 
          timestamp: new Date().toISOString(),
          liveFixturesUpdated: liveUpdated,
          processed: results.length, 
          results 
        }), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => new Response("Cron endpoint active."),
    },
  },
});
