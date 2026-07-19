import { createFileRoute } from "@tanstack/react-router";
import { importFixturesFor } from "@/lib/fixtures-importer.server";

export const Route = createFileRoute("/api/public/cron/refresh-fixtures")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const { data: leagues, error } = await supabaseAdmin
          .from("tracked_leagues")
          .select("*")
          .or(`last_run_at.is.null,last_run_at.lt.${cutoff}`)
          .limit(50);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        const list = leagues ?? [];
        const results: any[] = [];
        for (const l of list) {
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
            results.push({ id: l.id, league: l.league_name, ...r });
          } catch (e: any) {
            results.push({ id: l.id, league: l.league_name, error: e.message });
          }
        }
        return new Response(JSON.stringify({ processed: results.length, results }), {
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () => new Response("ok"),
    },
  },
});
