import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listLiveFixtures } from "@/lib/api-sports.functions";
import { translateCountry, translateLeague, translateTeam } from "@/lib/country-i18n";
import { TeamBadge } from "@/components/TeamBadge";
import { Loader2, Radio, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Ao vivo — Placar Certo" },
      { name: "description", content: "Placar em tempo real dos jogos em andamento." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const liveFn = useServerFn(listLiveFixtures);
  // Agora é uma leitura rápida do cache (atualizado em segundo plano pelo
  // cron), não mais uma chamada direta à API externa na hora do clique —
  // por isso pode ficar sempre habilitado e atualizar automaticamente,
  // sem risco de bater limite de requisições.
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["live-fixtures"],
    queryFn: async () => await liveFn(),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
  });
  const fixtures = data?.fixtures ?? [];
  const dataUpdatedAt = data?.updatedAt ? new Date(data.updatedAt).getTime() : 0;

  // A tela mostra uma mensagem simples pro usuário de propósito, mas o
  // erro técnico real vai pro console — sem isso, não dá pra diagnosticar
  // à distância quando alguém manda print da tela de erro.
  useEffect(() => {
    if (error) console.error("[Ao vivo] Erro real:", (error as Error).message);
  }, [error]);

  const grouped = fixtures.reduce<Record<string, any[]>>((acc, f) => {
    const key = `${translateCountry(f.country)} · ${translateLeague(f.league)}`;
    (acc[key] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <span className="relative inline-flex">
              <Radio className="h-6 w-6 text-red-500" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            </span>
            Ao vivo
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-md bg-input border border-border px-3 py-1.5 text-xs font-medium hover:bg-card disabled:opacity-50 shrink-0"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando jogos ao vivo...
        </div>
      ) : error ? (
        <div className="card-surface p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">Placar ao vivo indisponível no momento</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Não conseguimos buscar os jogos ao vivo agora. Tenta de novo em alguns instantes.
          </p>
          <button 
            onClick={() => refetch()} 
            className="text-xs rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : fixtures.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">Nenhum jogo ao vivo agora</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Não há partidas em andamento no momento. Você pode filtrar por liga ou buscar times específicos no menu lateral.
          </p>

          <button 
            onClick={() => window.location.reload()} 
            className="text-xs rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90"
          >
            Verificar novamente
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([league, games]) => (
            <div key={league}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{league}</div>
              <div className="space-y-2">
                {games.map((f) => <LiveCard key={f.fixtureId} f={f} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {dataUpdatedAt > 0 && (
        <p className="mt-6 text-[10px] text-muted-foreground">
          Última atualização: {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}
        </p>
      )}
    </div>
  );
}

function LiveCard({ f }: { f: any }) {
  const statusLabel =
    f.status === "HT" ? "Intervalo" :
    f.status === "FT" ? "Encerrado" :
    f.status === "1H" || f.status === "2H" || f.status === "ET" ? `${f.elapsed ?? 0}'` :
    f.status;
  return (
    <div className="card-surface p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge name={f.home.name} logoUrl={f.home.logo} />
          <span className="font-medium truncate">{translateTeam(f.home.name)}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="font-mono text-xl font-bold tabular-nums">
            {f.home.goals} <span className="text-muted-foreground mx-1">-</span> {f.away.goals}
          </div>
          <span className="text-[10px] uppercase tracking-wide text-red-500 font-medium">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-medium truncate text-right">{translateTeam(f.away.name)}</span>
          <TeamBadge name={f.away.name} logoUrl={f.away.logo} />
        </div>
      </div>
    </div>
  );
}
