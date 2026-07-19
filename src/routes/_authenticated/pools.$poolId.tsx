import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPool, leavePool } from "@/lib/social.functions";
import { ArrowLeft, Copy, LogOut, Loader2, Medal } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pools/$poolId")({
  component: PoolDetail,
});

function PoolDetail() {
  const { poolId } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(getPool);
  const leaveFn = useServerFn(leavePool);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pool", poolId],
    queryFn: async () => await fn({ data: { poolId } }),
  });
  const leaveMut = useMutation({
    mutationFn: async () => await leaveFn({ data: { poolId } }),
    onSuccess: () => { toast.success("Você saiu do bolão"); navigate({ to: "/pools" }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  const { pool, leaderboard } = data;

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/pools" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos bolões
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">{pool.name}</h1>
          <button
            onClick={() => { navigator.clipboard.writeText(pool.invite_code); toast.success("Código copiado"); }}
            className="mt-2 text-xs font-mono inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-input"
          >
            <Copy className="h-3 w-3" /> Código: {pool.invite_code}
          </button>
        </div>
        <button
          onClick={() => { if (confirm("Sair deste bolão?")) leaveMut.mutate(); }}
          disabled={leaveMut.isPending}
          className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-input inline-flex items-center gap-1 text-muted-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="p-3 border-b border-border text-sm font-medium">Ranking do bolão</div>
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
            {leaderboard.map((row, i) => (
              <tr key={row.user_id}>
                <td className="p-3 font-mono">
                  {i < 3 ? <Medal className={`inline h-4 w-4 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-amber-700"}`} /> : i + 1}
                </td>
                <td className="p-3">{row.display_name}</td>
                <td className="p-3 text-right font-mono font-bold text-primary">{row.correct}</td>
                <td className="p-3 text-right font-mono text-muted-foreground">{row.total}</td>
                <td className="p-3 text-right font-mono">{row.accuracy ?? 0}%</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Nenhum membro ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
