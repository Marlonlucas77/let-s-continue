import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { confirmExtraLeaguePurchase } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

const search = z.object({ session_id: z.string().optional() });

export const Route = createFileRoute("/checkout/league-return")({
  validateSearch: (s) => search.parse(s),
  component: LeagueReturn,
});

function LeagueReturn() {
  const { session_id } = useSearch({ from: "/checkout/league-return" });
  const qc = useQueryClient();
  const confirmFn = useServerFn(confirmExtraLeaguePurchase);

  const mut = useMutation({
    mutationFn: async () => {
      if (!session_id) throw new Error("session_id ausente na URL.");
      return (await confirmFn({ data: { sessionId: session_id, environment: getStripeEnvironment() } })) as {
        ok: boolean; error?: string; alreadyProcessed?: boolean; league?: { leagueName: string };
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracked-leagues"] });
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
  });

  useEffect(() => { if (session_id) mut.mutate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session_id]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card-surface p-8 max-w-md w-full text-center">
        {mut.isPending || (!mut.data && !mut.error) ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="font-display text-xl font-bold mb-2">Confirmando seu pagamento…</h1>
            <p className="text-sm text-muted-foreground">Ativando a assinatura da liga extra (R$5/mês).</p>
          </>
        ) : mut.data?.ok ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Liga adicionada!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mut.data.alreadyProcessed
                ? "Esse pagamento já tinha sido processado — sua liga já estava liberada."
                : `${mut.data.league?.leagueName ?? "A liga"} já aparece nas suas ligas monitoradas.`}
            </p>
            <Link to="/settings" className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              Voltar para configurações
            </Link>
          </>
        ) : (
          <>
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold mb-2">Não consegui liberar a liga</h1>
            <p className="text-sm text-muted-foreground mb-2">
              {mut.data?.error ?? (mut.error as Error | undefined)?.message ?? "Erro desconhecido."}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Se o pagamento foi feito, tente recarregar essa página. Se persistir, fale com o suporte informando a sessão <code>{session_id}</code>.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => mut.mutate()} className="rounded-md border border-border px-4 py-2 text-sm">Tentar de novo</button>
              <Link to="/settings" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">Voltar</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
