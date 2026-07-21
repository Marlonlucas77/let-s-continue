import { createFileRoute } from "@tanstack/react-router";
import { sendEmail, favoritesAlertHtml, favoritesAlertSubject } from "@/lib/email.server";
import { isAuthorizedCron } from "@/lib/cron-auth.server";

// Roda uma vez por dia (agendamento externo): pra cada usuário com
// alertas ativados e que ainda não recebeu hoje, verifica se algum time
// favorito joga hoje (usando o banco local, já populado pelo cron de
// ligas — sem chamar a API externa aqui) e manda um e-mail se sim.
export const Route = createFileRoute("/api/public/cron/send-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAuthorizedCron(request))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const todayStr = new Date().toISOString().slice(0, 10);

        const { data: eligible, error } = await supabaseAdmin
          .from("profiles")
          .select("id, email, last_alert_sent_on")
          .eq("email_alerts_enabled", true)
          .or(`last_alert_sent_on.is.null,last_alert_sent_on.neq.${todayStr}`);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

        let sent = 0;
        let skippedNoGames = 0;
        const errors: string[] = [];

        for (const profile of eligible ?? []) {
          try {
            if (!profile.email) continue;

            const { data: favs } = await supabaseAdmin
              .from("favorites")
              .select("ref_id")
              .eq("user_id", profile.id)
              .eq("kind", "team");
            const favApiIds = (favs ?? []).map((f: any) => f.ref_id as number);

            // Sem times favoritos: marca como "já processado hoje" mesmo
            // assim, pra não ficar reconsultando ele todo dia à toa.
            if (favApiIds.length === 0) {
              await supabaseAdmin.from("profiles").update({ last_alert_sent_on: todayStr }).eq("id", profile.id);
              continue;
            }

            const { data: favTeams } = await supabaseAdmin
              .from("teams")
              .select("id")
              .in("api_id", favApiIds);
            const localTeamIds = (favTeams ?? []).map((t: any) => t.id as string);
            if (localTeamIds.length === 0) {
              await supabaseAdmin.from("profiles").update({ last_alert_sent_on: todayStr }).eq("id", profile.id);
              continue;
            }

            const { data: games } = await supabaseAdmin
              .from("matches")
              .select(`
                kickoff_at, league_name,
                home_team:home_team_id ( name ),
                away_team:away_team_id ( name )
              `)
              .in("status", ["NS", "TBD"])
              .gte("kickoff_at", dayStart.toISOString())
              .lt("kickoff_at", dayEnd.toISOString())
              .or(`home_team_id.in.(${localTeamIds.join(",")}),away_team_id.in.(${localTeamIds.join(",")})`);

            if (!games || games.length === 0) {
              skippedNoGames++;
              await supabaseAdmin.from("profiles").update({ last_alert_sent_on: todayStr }).eq("id", profile.id);
              continue;
            }

            const gameList = games
              .filter((g: any) => g.home_team && g.away_team)
              .map((g: any) => ({
                home: g.home_team.name as string,
                away: g.away_team.name as string,
                league: (g.league_name ?? "") as string,
                time: new Date(g.kickoff_at as string).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              }));

            await sendEmail({
              to: profile.email,
              subject: favoritesAlertSubject(gameList.length),
              html: favoritesAlertHtml(gameList),
            });
            await supabaseAdmin.from("profiles").update({ last_alert_sent_on: todayStr }).eq("id", profile.id);
            sent++;
          } catch (e: any) {
            errors.push(`${profile.id}: ${e.message}`);
          }
        }

        return Response.json({ ok: true, eligible: eligible?.length ?? 0, sent, skippedNoGames, errors });
      },
      GET: async () => new Response("Cron endpoint active."),
    },
  },
});
