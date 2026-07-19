import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { Check, X, Trash2, RefreshCw } from "lucide-react";
import { autoCheckPredictions } from "@/lib/api-sports.functions";


export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const qc = useQueryClient();
  const { data: preds = [] } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const { data } = await supabase.from("predictions").select("*, home_team:home_team_id(name,color,logo_url), away_team:away_team_id(name,color,logo_url)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markMut = useMutation({
    mutationFn: async ({ id, correct }: { id: string; correct: boolean }) => {
      const { error } = await supabase.from("predictions").update({ result_checked: true, was_correct: correct }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("predictions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["predictions"] }); },
  });

  const autoCheck = useServerFn(autoCheckPredictions);
  const autoMut = useMutation({
    mutationFn: async () => autoCheck({ data: undefined as any }),
    onSuccess: (r: any) => {
      if (r.checked > 0) toast.success(`Verificados ${r.checked}, acertos: ${r.correct}`);
      qc.invalidateQueries({ queryKey: ["predictions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hasUnchecked = preds.some((p) => !p.result_checked);
  useEffect(() => {
    if (hasUnchecked && !autoMut.isPending && !autoMut.isSuccess) {
      autoMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnchecked]);

  const checked = preds.filter((p) => p.result_checked);
  const correct = checked.filter((p) => p.was_correct).length;
  const accuracy = checked.length ? Math.round((correct / checked.length) * 100) : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Histórico de Previsões</h1>
          <p className="text-sm text-muted-foreground">{preds.length} previsão(ões) · verificação automática cruzando com jogos importados</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => autoMut.mutate()}
            disabled={autoMut.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-input border border-border px-3 py-2 text-sm hover:bg-card disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${autoMut.isPending ? "animate-spin" : ""}`} />
            Verificar
          </button>
          <div className="card-surface px-4 py-3 text-right">
            <div className="text-xs text-muted-foreground">Acurácia</div>
            <div className="font-display text-2xl font-bold text-primary">{accuracy}%</div>
            <div className="text-xs text-muted-foreground">{correct}/{checked.length} conferidas</div>
          </div>
        </div>
      </div>


      <div className="space-y-3">
        {preds.map((p: any) => {
          const d = p.predicted_data as any;
          return (
            <div key={p.id} className="card-surface p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                <TeamBadge name={p.home_team.name} logoUrl={p.home_team.logo_url} color={p.home_team.color} size={28} />
                <span className="font-medium">{p.home_team.name}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium">{p.away_team.name}</span>
                <TeamBadge name={p.away_team.name} logoUrl={p.away_team.logo_url} color={p.away_team.color} size={28} />
                <div className="flex-1" />
                {p.result_checked ? (
                  <span className={`text-xs px-2 py-1 rounded-full ${p.was_correct ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                    {p.was_correct ? "Acertou" : "Errou"}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => markMut.mutate({ id: p.id, correct: true })} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20" title="Marcar como acerto"><Check className="h-4 w-4" /></button>
                    <button onClick={() => markMut.mutate({ id: p.id, correct: false })} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20" title="Marcar como erro"><X className="h-4 w-4" /></button>
                  </div>
                )}
                <button onClick={() => { if (confirm("Remover?")) delMut.mutate(p.id); }} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <Chip label="Casa" value={`${d.homeWinPct}%`} />
                <Chip label="Empate" value={`${d.drawPct}%`} />
                <Chip label="Fora" value={`${d.awayWinPct}%`} />
                <Chip label="Over 2.5" value={`${d.over25Pct}%`} />
                <Chip label="BTTS" value={`${d.bttsPct}%`} />
              </div>
            </div>
          );
        })}
        {preds.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhuma previsão salva.</p>}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-input border border-border px-2 py-1"><span className="text-muted-foreground">{label}:</span> <b>{value}</b></div>;
}
