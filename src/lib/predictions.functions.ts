import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generatePrediction } from "./stats";

export const getAdvancedPrediction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    fixtureId: z.number(),
    homeId: z.number(),
    awayId: z.number()
  }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Busca histórico dos times para o cálculo
    const { data: homeTeams } = await supabase.from("teams").select("id, name").eq("user_id", userId);
    const { data: awayTeams } = await supabase.from("teams").select("id, name").eq("user_id", userId);

    const homeTeam = homeTeams?.find(t => t.name.toLowerCase().includes(data.homeId.toString()));
    const awayTeam = awayTeams?.find(t => t.name.toLowerCase().includes(data.awayId.toString()));

    if (!homeTeam || !awayTeam) {
      return { error: "Times não encontrados no banco local. Importe a liga primeiro." };
    }

    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", userId)
      .or(`home_team_id.eq.${homeTeam.id},away_team_id.eq.${homeTeam.id},home_team_id.eq.${awayTeam.id},away_team_id.eq.${awayTeam.id}`)
      .order("match_date", { ascending: false });

    const prediction = generatePrediction(homeTeam.id, awayTeam.id, matches ?? []);

    return { prediction };
  });
