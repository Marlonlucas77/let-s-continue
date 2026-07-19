import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { generatePrediction, computeTeamStats } from "@/lib/stats";
import { Sparkles, Save, Crown, Lock, AlertTriangle } from "lucide-react";
import { useSubscription, FREE_PREDICTION_LIMIT } from "@/hooks/useSubscription";

export const Route = createFileRoute("/_authenticated/predictions")({
  component: PredictionsPage,
});

function PredictionsPage() {
  const qc = useQueryClient();
  const { isPremium, remaining, canSavePrediction, monthCount } = useSubscription();
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches-raw"],
    queryFn: async () => (await supabase.from("matches").select("*")).data ?? [],
  });

  const rawPrediction = useMemo(() => {
    if (!homeId || !awayId || homeId === awayId) return null;
    return generatePrediction(homeId, awayId, matches);
  }, [homeId, awayId, matches]);

  const home = teams.find((t) => t.id === homeId);
  const away = teams.find((t) => t.id === awayId);

  const h2h = useMemo(() => {
    if (!homeId || !awayId) return [];
    return matches.filter((m) => (m.home_team_id === homeId && m.away_team_id === awayId) || (m.home_team_id === awayId && m.away_team_id === homeId));
  }, [matches, homeId, awayId]);

  const homeStats = homeId ? computeTeamStats(homeId, matches, "home") : null;
  const awayStats = awayId ? computeTeamStats(awayId, matches, "away") : null;

  const differentCompetition = !!home && !!away && (home.league ?? home.country) !== (away.league ?? away.country);
  const neverPlayed = !!home && !!away && h2h.length === 0;

  // Times que nunca se enfrentaram e são de competições diferentes não têm
  // como ser comparados com confiança real — o modelo não tem como saber
  // se uma liga é mais forte que a outra. Penaliza a confiança em vez de
  // deixar ela parecer tão alta quanto a de um confronto normal.
  const prediction = useMemo(() => {
    if (!rawPrediction) return null;
    if (neverPlayed && differentCompetition) {
      return { ...rawPrediction, confidenceScore: Math.round(rawPrediction.confidenceScore * 0.4) };
    }
    return rawPrediction;
  }, [rawPrediction, neverPlayed, differentCompetition]);

  const teamsByLeague = useMemo(() => {
    const groups = new Map<string, typeof teams>();
    for (const t of teams) {
      const key = t.league || t.country || "Outros";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries());
  }, [teams]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!prediction) return;
      if (!canSavePrediction) throw new Error("Limite grátis atingido. Assine para salvar mais.");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("predictions").insert({
        user_id: user!.id, home_team_id: homeId, away_team_id: awayId,
        predicted_data: prediction as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Previsão salva no histórico");
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["predictions-month"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Previsões</h1>
          <p className="text-sm text-muted-foreground mt-1">Modelo estatístico (Poisson) baseado no seu histórico importado. Para análise com IA generativa, use a tela Jogos.</p>
        </div>
        {isPremium ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-medium text-primary">
            <Crown className="h-3.5 w-3.5" /> Premium — ilimitado
          </span>
        ) : (
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full bg-input border border-border px-3 py-1 text-xs font-medium hover:border-primary/50">
            <Crown className="h-3.5 w-3.5 text-primary" /> {remaining}/{FREE_PREDICTION_LIMIT} grátis este mês
          </Link>
        )}
      </div>

      {!isPremium && monthCount >= FREE_PREDICTION_LIMIT && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
          <Lock className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold">Você atingiu o limite grátis</div>
            <div className="text-muted-foreground">Faça upgrade pra Premium e salve previsões ilimitadas.</div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Assinar
          </Link>
        </div>
      )}


      {teams.length === 0 && (
        <div className="mt-6 card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Você ainda não importou nenhum time. Importe uma liga pra começar a gerar previsões.</p>
          <Link to="/import" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Ir para Importar
          </Link>
        </div>
      )}

      {teams.length > 0 && (
      <div className="card-surface p-5 mt-6 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 -mt-1 mb-1 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{teams.length} time(s) disponível(eis) — só aparecem times que você já importou.</span>
          <Link to="/import" className="text-primary hover:underline shrink-0">Importar mais ligas/times →</Link>
        </div>
        <div>
          <label className="text-sm font-medium">Time mandante</label>
          <select value={homeId} onChange={(e) => setHomeId(e.target.value)} className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm">
            <option value="">Selecionar...</option>
            {teamsByLeague.map(([league, ts]) => (
              <optgroup key={league} label={league}>
                {ts.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Time visitante</label>
          <select value={awayId} onChange={(e) => setAwayId(e.target.value)} className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm">
            <option value="">Selecionar...</option>
            {teamsByLeague.map(([league, ts]) => (
              <optgroup key={league} label={league}>
                {ts.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      )}

      {neverPlayed && differentCompetition && (
        <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-400">Esses times nunca se enfrentaram</div>
            <div className="text-muted-foreground mt-0.5">
              {home?.name} e {away?.name} são de competições diferentes ({home?.league || home?.country || "?"} e {away?.league || away?.country || "?"}) e não há confronto direto no seu histórico.
              A previsão abaixo é uma simulação estatística baseada só no desempenho isolado de cada time — não representa um jogo real esperado.
            </div>
          </div>
        </div>
      )}

      {prediction && home && away && (
        <>
          <div className="card-surface p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TeamBadge name={home.name} logoUrl={home.logo_url} size={48} />
                <div>
                  <div className="font-semibold">{home.name}</div>
                  <div className="text-xs text-muted-foreground">Mandante</div>
                </div>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="font-semibold">{away.name}</div>
                  <div className="text-xs text-muted-foreground">Visitante</div>
                </div>
                <TeamBadge name={away.name} logoUrl={away.logo_url} size={48} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <ProbCard label="Vitória casa" value={prediction.homeWinPct} color="var(--color-primary)" muted={prediction.confidenceScore < 50} />
              <ProbCard label="Empate" value={prediction.drawPct} color="var(--color-muted-foreground)" muted={prediction.confidenceScore < 50} />
              <ProbCard label="Vitória fora" value={prediction.awayWinPct} color="var(--color-accent)" muted={prediction.confidenceScore < 50} />
            </div>
            {prediction.confidenceScore < 50 && (
              <p className="text-xs text-amber-400 mb-4">Confiança do modelo baixa ({prediction.confidenceScore}%) — trate esses números como uma estimativa grosseira, não uma previsão forte.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Gols esperados" value={prediction.expectedGoals.toString()} />
              <Stat label="Over 2.5" value={`${prediction.over25Pct}%`} />
              <Stat label="Ambas marcam" value={`${prediction.bttsPct}%`} />
              <Stat label="Escanteios" value={`${prediction.expectedCornersMin}–${prediction.expectedCornersMax}`} />
              <Stat label="Cartões amarelos" value={`~${prediction.expectedYellow}`} />
              <Stat label="Confiança do modelo" value={`${prediction.confidenceScore}%`} />
            </div>

            <p className="mt-6 text-xs text-muted-foreground italic">{prediction.basis}</p>

            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !canSavePrediction} title={canSavePrediction ? "" : "Limite grátis atingido"} className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {canSavePrediction ? <Save className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {canSavePrediction ? "Salvar previsão" : "Assine para salvar"}
            </button>
          </div>

          <div className="grid gap-4 mt-6 md:grid-cols-2">
            {homeStats && <TeamStatsCard title={`${home.name} (em casa)`} stats={homeStats} />}
            {awayStats && <TeamStatsCard title={`${away.name} (fora)`} stats={awayStats} />}
          </div>

          {h2h.length > 0 && (
            <div className="card-surface p-5 mt-6">
              <h3 className="font-display font-semibold mb-3">Confronto direto ({h2h.length})</h3>
              <ul className="space-y-1 text-sm">
                {h2h.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex justify-between py-1">
                    <span className="text-muted-foreground">{m.match_date}</span>
                    <span className="font-mono">{m.home_goals} - {m.away_goals}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProbCard({ label, value, color, muted }: { label: string; value: number; color: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-input p-4 text-center ${muted ? "opacity-60" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1" style={{ color: muted ? "var(--color-muted-foreground)" : color }}>{value}%</div>
      <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: muted ? "var(--color-muted-foreground)" : color }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-input border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-lg mt-1">{value}</div>
    </div>
  );
}

function TeamStatsCard({ title, stats }: { title: string; stats: ReturnType<typeof computeTeamStats> }) {
  return (
    <div className="card-surface p-5">
      <h3 className="font-display font-semibold mb-3">{title}</h3>
      {stats.games === 0 ? <p className="text-sm text-muted-foreground">Sem histórico</p> : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Jogos:</span> <b>{stats.games}</b></div>
          <div><span className="text-muted-foreground">V-E-D:</span> <b>{stats.wins}-{stats.draws}-{stats.losses}</b></div>
          <div><span className="text-muted-foreground">Média gols:</span> <b>{stats.avgGoalsFor.toFixed(2)}</b></div>
          <div><span className="text-muted-foreground">Média sofr.:</span> <b>{stats.avgGoalsAgainst.toFixed(2)}</b></div>
          <div><span className="text-muted-foreground">BTTS:</span> <b>{stats.bttsPct.toFixed(0)}%</b></div>
          <div><span className="text-muted-foreground">Over 2.5:</span> <b>{stats.over25Pct.toFixed(0)}%</b></div>
          <div><span className="text-muted-foreground">Clean Sheets:</span> <b>{stats.csPct.toFixed(0)}%</b></div>
          <div><span className="text-muted-foreground">Média Cartões:</span> <b>{stats.avgYellow.toFixed(1)}</b></div>
          <div className="col-span-2 flex gap-1 mt-2">
            <span className="text-muted-foreground text-xs">Forma:</span>
            {stats.form.slice(0, 5).map((r, i) => (
              <span key={i} className={`h-5 w-5 rounded text-[10px] font-bold grid place-items-center ${r === "W" ? "bg-primary text-primary-foreground" : r === "L" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
