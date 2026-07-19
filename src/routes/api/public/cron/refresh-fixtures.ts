import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";
import { analyzeFixture, getAiPrediction } from "@/lib/api-sports.functions";

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Sincronizar Fixtures (Jogos)
        const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const { data: leagues, error } = await supabaseAdmin
          .from("tracked_leagues")
          .select("*")
          .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
          .limit(10);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const results: any[] = [];
        for (const l of (leagues ?? [])) {
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

        // 2. Pré-gerar Previsões de IA
        const today = new Date().toISOString().slice(0, 10);
        const { data: upcomingMatches } = await supabaseAdmin
          .from("matches")
          .select(`
            id,
            match_date,
            home_team_id,
            away_team_id
          `)
          .gte("match_date", today)
          .limit(5);

        if (upcomingMatches) {
          for (const m of upcomingMatches) {
            try {
              // Precisamos dos IDs da API-Sports para análise
              const { data: teams } = await supabaseAdmin
                .from("teams")
                .select("id, name")
                .in("id", [m.home_team_id, m.away_team_id]);
              
              const homeTeam = teams?.find(t => t.id === m.home_team_id);
              const awayTeam = teams?.find(t => t.id === m.away_team_id);

              if (homeTeam && awayTeam) {
                // Como não temos o api_id fácil na tabela matches, e o analyzeFixture precisa dele
                // mas o sistema parece usar IDs internos em alguns lugares.
                // Refatorando para usar a lógica de análise e depois previsão se possível.
                // Por enquanto, apenas registramos que o job rodou.
                results.push({ matchId: m.id, type: 'ai_prediction', status: 'skipped_missing_api_ids' });
              }
            } catch (e: any) {
              results.push({ matchId: m.id, type: 'ai_prediction', error: e.message });
            }
          }
        }

        return new Response(JSON.stringify({ 
          timestamp: new Date().toISOString(),
          processed: results.length, 
          results 
        }), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => new Response("Cron endpoint is active."),
    },
  },
});
