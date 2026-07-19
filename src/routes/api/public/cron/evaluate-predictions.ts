import { createFileRoute } from "@tanstack/react-router";

// Job noturno: compara cada previsão pendente com o resultado real gravado em
// `matches` (mesmo par de times na mesma data) e preenche `was_correct` +
// métricas por mercado (over/under, BTTS, escanteios, cartões).
export const Route = createFileRoute("/api/public/cron/evaluate-predictions")({
  server: {
    handlers: {
      POST: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: pending, error } = await supabase
          .from("predictions")
          .select("id, home_team_id, away_team_id, created_at, predicted_data")
          .eq("result_checked", false)
          .limit(500);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let evaluated = 0;
        for (const p of pending ?? []) {
          const created = new Date(p.created_at as string);
          const from = new Date(created.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const to = new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const { data: match } = await supabase
            .from("matches")
            .select("home_goals, away_goals, home_corners, away_corners, home_yellow, away_yellow, match_date")
            .eq("home_team_id", p.home_team_id!)
            .eq("away_team_id", p.away_team_id!)
            .gte("match_date", from)
            .lte("match_date", to)
            .not("home_goals", "is", null)
            .order("match_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!match || match.home_goals == null || match.away_goals == null) continue;

          const pred: any = p.predicted_data ?? {};
          const hg = match.home_goals!, ag = match.away_goals!;
          const realResult = hg > ag ? "home" : hg < ag ? "away" : "draw";
          const pick =
            (pred.homeWinPct ?? 0) >= (pred.drawPct ?? 0) && (pred.homeWinPct ?? 0) >= (pred.awayWinPct ?? 0)
              ? "home"
              : (pred.awayWinPct ?? 0) >= (pred.drawPct ?? 0)
              ? "away"
              : "draw";
          const was_correct = pick === realResult;

          const totalGoals = hg + ag;
          const over_under_correct =
            typeof pred.over25Pct === "number"
              ? (pred.over25Pct >= 50 ? totalGoals > 2.5 : totalGoals <= 2.5)
              : null;
          const btts_correct =
            typeof pred.bttsPct === "number"
              ? (pred.bttsPct >= 50 ? hg > 0 && ag > 0 : hg === 0 || ag === 0)
              : null;

          const totalCorners = (match.home_corners ?? 0) + (match.away_corners ?? 0);
          const corners_correct =
            typeof pred.expectedCornersMin === "number" && typeof pred.expectedCornersMax === "number" &&
            (match.home_corners != null || match.away_corners != null)
              ? totalCorners >= pred.expectedCornersMin && totalCorners <= pred.expectedCornersMax
              : null;

          const totalYellow = (match.home_yellow ?? 0) + (match.away_yellow ?? 0);
          const cards_correct =
            typeof pred.expectedYellow === "number" && (match.home_yellow != null || match.away_yellow != null)
              ? Math.abs(totalYellow - pred.expectedYellow) <= 1
              : null;

          await supabase
            .from("predictions")
            .update({
              result_checked: true,
              was_correct,
              over_under_correct,
              btts_correct,
              corners_correct,
              cards_correct,
            })
            .eq("id", p.id!);
          evaluated++;
        }

        return Response.json({ ok: true, scanned: pending?.length ?? 0, evaluated });
      },
    },
  },
});
