import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Previsão com IA generativa de verdade (LLM) — não depende de nenhuma
// chamada à API-Sports além do que já se sabe do confronto (nomes dos
// times, liga, país). Usa o conhecimento do próprio modelo sobre futebol
// real em vez de puxar estatísticas detalhadas jogo a jogo, o que evita
// estourar limite de requisições e é bem mais rápido.
//
// Retorna no mesmo formato do modelo estatístico local (stats.ts), pra
// dar pra usar como fonte da previsão em qualquer tela sem precisar
// adaptar a interface.
const aiPredictionSchema = z.object({
  homeName: z.string(),
  awayName: z.string(),
  homeLeague: z.string().nullable().optional(),
  awayLeague: z.string().nullable().optional(),
  matchDate: z.string().nullable().optional(),
  statModel: z.any().optional(), // previsão estatística local, se existir, como contexto extra
});

export const getAiFixturePrediction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => aiPredictionSchema.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const statLine = data.statModel
      ? `\n\nModelo estatístico local (baseado só no histórico importado, pode não refletir o nível real dos times): casa ${data.statModel.homeWinPct}% / empate ${data.statModel.drawPct}% / fora ${data.statModel.awayWinPct}%, gols esperados ${data.statModel.expectedGoals}. Use isso como referência secundária, não como verdade — corrija com seu conhecimento real sobre os times se achar que está errado.`
      : "";

    const system = `Você é um analista esportivo especialista em futebol, com conhecimento real sobre a força atual dos clubes, elenco, estilo de jogo, campeonato que disputam e nível competitivo. Retorne APENAS JSON válido, sem markdown, sem texto extra.`;
    const prompt = `Preveja o confronto ${data.homeName}${data.homeLeague ? ` (${data.homeLeague})` : ""} (mandante) vs ${data.awayName}${data.awayLeague ? ` (${data.awayLeague})` : ""} (visitante)${data.matchDate ? `, em ${data.matchDate}` : ""}.

Use seu conhecimento real sobre o nível desses times (força do elenco, competição que disputam, tradição, momento atual, estilo de jogo — times mais ofensivos tendem a mais escanteios/gols, ligas mais físicas tendem a mais cartões). Não invente que são equivalentes só porque não há dados detalhados — se um time é claramente mais forte, reflita isso nas probabilidades. Seja específico sobre o motivo (não genérico).${statLine}

Responda estritamente neste JSON:
{
  "predictedScore": { "home": <int>, "away": <int> },
  "homeWinPct": <int 0-100>,
  "drawPct": <int 0-100>,
  "awayWinPct": <int 0-100>,
  "expectedGoals": <número, ex: 2.6>,
  "over25Pct": <int 0-100>,
  "bttsPct": <int 0-100>,
  "expectedCornersMin": <int>,
  "expectedCornersMax": <int>,
  "expectedYellow": <int>,
  "confidenceScore": <int 0-100, honesto — baixo se você tem pouca certeza>,
  "risk": "baixo" | "medio" | "alto",
  "homeAnalysis": "<1-2 frases sobre o momento/força do time da casa>",
  "awayAnalysis": "<1-2 frases sobre o momento/força do time visitante>",
  "topPicks": [
    { "market": "<mercado>", "pick": "<palpite>", "confidence": <int 0-100>, "reason": "<motivo curto e específico>" }
  ],
  "keyInsight": "<uma frase decisiva sobre o jogo, mencionando o motivo real>",
  "basis": "<frase curta explicando a base da previsão, ex: 'IA generativa — conhecimento geral de futebol, sem histórico jogo a jogo'>"
}
homeWinPct + drawPct + awayWinPct deve somar 100. Inclua 6 palpites em topPicks, cobrindo mercados variados: Resultado Final (1x2), Dupla Chance, Over/Under 2.5 gols, Ambas Marcam, Escanteios (over/under), Cartões (over/under) — um de cada, com motivo específico pro confronto. Seja realista e direto.`;

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
    let ai: any;
    try {
      ai = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      ai = m ? JSON.parse(m[0]) : {};
    }

    return {
      prediction: {
        homeWinPct: ai.homeWinPct ?? 33,
        drawPct: ai.drawPct ?? 34,
        awayWinPct: ai.awayWinPct ?? 33,
        expectedGoals: ai.expectedGoals ?? 2.5,
        over25Pct: ai.over25Pct ?? 50,
        bttsPct: ai.bttsPct ?? 50,
        expectedCornersMin: ai.expectedCornersMin ?? 7,
        expectedCornersMax: ai.expectedCornersMax ?? 12,
        expectedYellow: ai.expectedYellow ?? 4,
        confidenceScore: ai.confidenceScore ?? 40,
        basis: ai.basis || "IA generativa — conhecimento geral de futebol.",
      },
      predictedScore: ai.predictedScore,
      risk: ai.risk,
      topPicks: ai.topPicks,
      keyInsight: ai.keyInsight,
      homeAnalysis: ai.homeAnalysis,
      awayAnalysis: ai.awayAnalysis,
    };
  });
