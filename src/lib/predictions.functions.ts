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

// Previsão com IA generativa de verdade (LLM), diferente do modelo
// estatístico acima. Importante pra casos onde o histórico local não
// reflete o nível real dos times (ex: um time de elite mundial x um time
// regional que nunca se enfrentaram) — o modelo estatístico só enxerga o
// que está no seu banco, a IA traz conhecimento geral de futebol pra
// completar isso.
export const getAiTeamPrediction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    homeName: z.string(),
    awayName: z.string(),
    homeLeague: z.string().nullable().optional(),
    awayLeague: z.string().nullable().optional(),
    statModel: z.any().optional(), // previsão estatística local, se existir, como contexto extra
  }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const statLine = data.statModel
      ? `\n\nModelo estatístico local (baseado só no histórico importado, pode não refletir o nível real dos times): casa ${data.statModel.homeWinPct}% / empate ${data.statModel.drawPct}% / fora ${data.statModel.awayWinPct}%, gols esperados ${data.statModel.expectedGoals}. Use isso como referência secundária, não como verdade — corrija com seu conhecimento real sobre os times se achar que está errado.`
      : "";

    const system = `Você é um analista esportivo especialista em futebol, com conhecimento real sobre a força atual dos clubes, elenco, campeonato que disputam e nível competitivo. Retorne APENAS JSON válido, sem markdown, sem texto extra.`;
    const prompt = `Preveja o confronto ${data.homeName}${data.homeLeague ? ` (${data.homeLeague})` : ""} (mandante) vs ${data.awayName}${data.awayLeague ? ` (${data.awayLeague})` : ""} (visitante).

Use seu conhecimento real sobre o nível desses times (força do elenco, competição que disputam, tradição) — não invente que são equivalentes só porque não há dados suficientes. Se um time é claramente mais forte (ex: um gigante europeu contra um time regional de outro continente), reflita isso nas probabilidades.${statLine}

Responda estritamente neste JSON:
{
  "predictedScore": { "home": <int>, "away": <int> },
  "winner": "home" | "draw" | "away",
  "homeWinPct": <int 0-100>,
  "drawPct": <int 0-100>,
  "awayWinPct": <int 0-100>,
  "confidence": <int 0-100>,
  "risk": "baixo" | "medio" | "alto",
  "topPicks": [
    { "market": "<mercado>", "pick": "<palpite>", "confidence": <int 0-100>, "reason": "<motivo curto>" }
  ],
  "keyInsight": "<uma frase decisiva sobre o jogo, mencionando o motivo real — nível dos times, momento, etc.>"
}
homeWinPct + drawPct + awayWinPct deve somar 100. Inclua 3 palpites em topPicks. Seja realista e direto.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas requisições à IA. Aguarde um instante.");
      if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Erro da IA: ${res.status}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let prediction: any;
    try {
      prediction = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      prediction = m ? JSON.parse(m[0]) : {};
    }

    return { prediction };
  });
