import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";
import { getAiPrediction } from "@/lib/api-sports.functions";

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
          .limit(20);

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

        // 2. Pré-gerar Previsões de IA para os próximos jogos
        // Busca jogos dos próximos 3 dias que ainda não têm análise ou análise antiga
        const today = new Date().toISOString().slice(0, 10);
        const next3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        
        const { data: upcomingMatches } = await supabaseAdmin
          .from("matches")
          .select(`
            *,
            home:home_team_id(id, api_id, name),
            away:away_team_id(id, api_id, name)
          `)
          .gte("match_date", today)
          .lte("match_date", next3Days)
          .limit(10); // Batch pequeno para não estourar tempo/cotas

        if (upcomingMatches) {
          for (const m of upcomingMatches) {
            try {
              // Chamamos a função de IA para cada jogo
              // Como estamos no servidor, precisamos simular o contexto que o serverFn espera ou extrair a lógica
              // Aqui chamamos getAiPrediction via .handler se disponível ou refatoramos
              // Para simplificar e garantir execução, usamos a lógica interna se necessário
              // Mas aqui tentamos rodar o handler diretamente
              await getAiPrediction({
                data: {
                  fixtureId: m.api_id, // Usamos o ID da API para buscar dados externos se necessário
                  homeId: m.home.api_id,
                  awayId: m.away.api_id,
                  homeName: m.home.name,
                  awayName: m.away.name
                }
              });
              results.push({ matchId: m.id, type: 'ai_prediction', status: 'success' });
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
      GET: async () => new Response("Cron endpoint is active. Use POST to trigger synchronization."),
    },
  },
});
