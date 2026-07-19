import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getGlobalLeaderboard } from "@/lib/social.functions";
import { Trophy, Medal, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Ranking — Placar Certo" },
      { name: "description", content: "Ranking global de acertos de previsões." },
    ],
  }),
});

function LeaderboardPage() {
  const fn = useServerFn(getGlobalLeaderboard);
  const { data = [], isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: async () => await fn() });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7 text-primary" /> Ranking global
        </h1>
        <p className="text-sm text-muted-foreground">Top usuários por acertos de previsões.</p>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}

      {!isLoading && data.length === 0 && (
        <div className="card-surface p-8 text-center text-sm text-muted-foreground">
          Nenhuma previsão conferida ainda. Faça previsões e importe os resultados!
        </div>
      )}

      {data.length > 0 && (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-input/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Usuário</th>
                <th className="text-right p-3">Acertos</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Precisão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row, i) => {
                const acc = Number(row.accuracy ?? 0);
                const badge = row.total >= 10
                  ? acc >= 70 ? "🏆" : acc >= 55 ? "🥈" : acc >= 40 ? "🥉" : ""
                  : "";
                return (
                  <tr key={row.user_id}>
                    <td className="p-3 font-mono">
                      {i < 3 ? <Medal className={`inline h-4 w-4 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-amber-700"}`} /> : i + 1}
                    </td>
                    <td className="p-3">
                      <span className="mr-1">{badge}</span>{row.display_name}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-primary">{row.correct}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{row.total}</td>
                    <td className="p-3 text-right font-mono">{acc.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
