import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generatePrediction, computeTeamStats } from "./stats";

// Previsão instantânea usando o histórico já importado no banco local
// (times casados por api_id). Não faz nenhuma chamada à API-Sports, então
// é muito mais rápida que a análise ao vivo — e é a única fonte que temos
// para escanteios e cartões, já que a API não retorna isso na listagem de
// jogos futuros.
const MIN_GAMES_FOR_LOCAL_PREDICTION = 3;

export const getLocalPrediction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    homeApiId: z.number().int(),
    awayApiId: z.number().int(),
  }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, api_id")
      .eq("user_id", userId)
      .in("api_id", [data.homeApiId, data.awayApiId]);
    if (teamsError) throw new Error(teamsError.message);

    const homeTeam = teams?.find((t) => t.api_id === data.homeApiId);
    const awayTeam = teams?.find((t) => t.api_id === data.awayApiId);

    if (!homeTeam || !awayTeam) {
      return { available: false as const, reason: "Times não importados no histórico local ainda." };
    }

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", userId)
      .or(`home_team_id.eq.${homeTeam.id},away_team_id.eq.${homeTeam.id},home_team_id.eq.${awayTeam.id},away_team_id.eq.${awayTeam.id}`)
      .order("match_date", { ascending: false })
      .limit(200);
    if (matchesError) throw new Error(matchesError.message);

    const homeStats = computeTeamStats(homeTeam.id, matches ?? [], "all");
    const awayStats = computeTeamStats(awayTeam.id, matches ?? [], "all");
    if (homeStats.games < MIN_GAMES_FOR_LOCAL_PREDICTION || awayStats.games < MIN_GAMES_FOR_LOCAL_PREDICTION) {
      return { available: false as const, reason: "Histórico local insuficiente para uma previsão confiável." };
    }

    const prediction = generatePrediction(homeTeam.id, awayTeam.id, matches ?? []);

    return {
      available: true as const,
      prediction,
      home: homeStats,
      away: awayStats,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    };
  });
