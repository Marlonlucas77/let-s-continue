import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Sincronizar Fixtures (Jogos) para ligas monitoradas
        const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data: leagues, error } = await supabaseAdmin
          .from("tracked_leagues")
          .select("*")
          .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
          .limit(5);

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

        return new Response(JSON.stringify({ 
          timestamp: new Date().toISOString(),
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
