import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchTeams, getTeamAnalysis } from "@/lib/api-sports.functions";
import { Search, Loader2, ArrowLeft, Trophy, Target, Shield } from "lucide-react";
import { translateCountry, translateTeam } from "@/lib/country-i18n";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/_authenticated/teams")({
  component: TeamsPage,
});

type Team = { id: number; name: string; country?: string; logo?: string; founded?: number; venue?: string };

function TeamsPage() {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<Team | null>(null);
  const searchFn = useServerFn(searchTeams);

  const { data: results = [], isFetching, error, refetch } = useQuery({
    queryKey: ["team-search", term],
    queryFn: async () => (await searchFn({ data: { query: term } })) as Team[],
    enabled: term.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });


  if (selected) return <TeamDetail team={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Times</h1>
        <p className="text-sm text-muted-foreground">Busque qualquer time do mundo e veja suas estatísticas.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (query.trim().length >= 2) setTerm(query.trim()); }}
        className="card-surface p-3 flex gap-2 mb-6"
      >
        <div className="flex-1 flex items-center gap-2 bg-input border border-border rounded-md px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Flamengo, Real Madrid, Barcelona..."
            className="flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Buscar
        </button>
      </form>

      {isFetching ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
        </div>
      ) : error ? (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-destructive font-medium mb-1">Não foi possível buscar times agora</p>
          <p className="text-xs text-muted-foreground mb-4">{(error as Error).message || "Erro na API de futebol."}</p>
          <button onClick={() => refetch()} className="text-xs rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium hover:opacity-90">
            Tentar novamente
          </button>
        </div>
      ) : term.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Digite o nome de um time para começar.</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum time encontrado para "{term}".</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((t) => (
            <div key={t.id} className="card-surface p-4 flex items-center gap-3 hover:border-primary/50 transition">
              <button onClick={() => setSelected(t)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                {t.logo ? (
                  <img src={t.logo} alt="" className="h-11 w-11 object-contain" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-primary/20 grid place-items-center text-xs font-bold">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{translateTeam(t.name)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {translateCountry(t.country) || "—"}{t.founded ? ` · fund. ${t.founded}` : ""}
                  </div>
                </div>
              </button>
              <FavoriteButton kind="team" refId={t.id} label={t.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamDetail({ team, onBack }: { team: Team; onBack: () => void }) {
  const analyzeFn = useServerFn(getTeamAnalysis);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["team-analysis", team.id],
    queryFn: async () => await analyzeFn({ data: { teamId: team.id } }),
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="max-w-5xl">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="card-surface p-5 mb-6 flex items-center gap-4">
        {team.logo && <img src={team.logo} alt="" className="h-16 w-16 object-contain" />}
        <div>
          <h1 className="font-display text-2xl font-bold">{translateTeam(team.name)}</h1>
          <p className="text-sm text-muted-foreground">
            {translateCountry(team.country)}{team.founded ? ` · fundado em ${team.founded}` : ""}{team.venue ? ` · ${team.venue}` : ""}
          </p>
        </div>
      </div>

      {error ? (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-destructive font-medium mb-1">Não foi possível carregar as estatísticas</p>
          <p className="text-xs text-muted-foreground mb-4">{(error as Error).message || "Erro na API de futebol."}</p>
          <button onClick={() => refetch()} className="text-xs rounded-md bg-primary px-3 py-1.5 text-primary-foreground font-medium hover:opacity-90">
            Tentar novamente
          </button>
        </div>
      ) : isLoading || !data ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Analisando últimos 20 jogos...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 mb-6">
            <Stat icon={Trophy} label="Vitórias" value={`${data.wins}/${data.games}`} />
            <Stat icon={Target} label="Gols/jogo" value={data.avgFor.toString()} />
            <Stat icon={Shield} label="Sofridos/jogo" value={data.avgAgainst.toString()} />
            <Stat icon={Target} label="Over 2.5" value={`${data.over25Pct}%`} />
            <Stat label="BTTS" value={`${data.bttsPct}%`} />
            <Stat label="Clean sheets" value={`${data.cleanSheetPct}%`} />
            <Stat label="Empates" value={String(data.draws)} />
            <Stat label="Derrotas" value={String(data.losses)} />
          </div>

          <div className="card-surface p-4 mb-6">
            <div className="text-xs uppercase text-muted-foreground mb-2">Forma recente</div>
            <div className="flex gap-1">
              {data.form.map((r: string, i: number) => (
                <span
                  key={i}
                  className={`h-7 w-7 grid place-items-center rounded text-xs font-bold ${
                    r === "W" ? "bg-emerald-500/20 text-emerald-400" :
                    r === "L" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}
                >{r}</span>
              ))}
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="text-xs uppercase text-muted-foreground mb-3">Últimos jogos</div>
            <div className="space-y-2">
              {data.recent.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <span className="text-xs text-muted-foreground w-20">{m.date}</span>
                  <span className="text-xs text-muted-foreground w-10">{m.home ? "Casa" : "Fora"}</span>
                  {m.opponentLogo && <img src={m.opponentLogo} className="h-5 w-5 object-contain" alt="" />}
                  <span className="flex-1 truncate">{m.opponent}</span>
                  <span className="font-mono font-semibold">{m.gf}-{m.ga}</span>
                  <span className={`text-xs font-bold w-5 text-center ${
                    m.result === "W" ? "text-emerald-400" : m.result === "L" ? "text-red-400" : "text-yellow-400"
                  }`}>{m.result}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs uppercase text-muted-foreground flex items-center gap-1 mb-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
