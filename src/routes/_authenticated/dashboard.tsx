import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { Users, ListOrdered, Target, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [teams, recent, allMatches, preds] = await Promise.all([
        supabase.from("teams").select("*").order("created_at", { ascending: false }),
        supabase.from("matches").select("*, home_team:home_team_id(name,color,logo_url), away_team:away_team_id(name,color,logo_url)").order("match_date", { ascending: false }).limit(5),
        supabase.from("matches").select("match_date, home_goals, away_goals, home_corners, away_corners").order("match_date", { ascending: false }).limit(20),
        supabase.from("predictions").select("*"),
      ]);
      return { teams: teams.data ?? [], matches: recent.data ?? [], allMatches: allMatches.data ?? [], preds: preds.data ?? [] };
    },
  });

  const teamsCount = data?.teams.length ?? 0;
  const predsCount = data?.preds.length ?? 0;
  const correct = data?.preds.filter((p) => p.result_checked && p.was_correct).length ?? 0;
  const checked = data?.preds.filter((p) => p.result_checked).length ?? 0;
  const accuracy = checked > 0 ? Math.round((correct / checked) * 100) : 0;

  const chartData = (data?.allMatches ?? []).slice().reverse().map((m: any, i: number) => ({
    idx: i + 1,
    date: m.match_date,
    Gols: (m.home_goals ?? 0) + (m.away_goals ?? 0),
    Escanteios: (m.home_corners ?? 0) + (m.away_corners ?? 0),
  }));

  const teamBars = (() => {
    const map = new Map<string, { name: string; gf: number; ga: number; games: number }>();
    for (const m of data?.matches ?? []) {
      const h = m.home_team?.name; const a = m.away_team?.name;
      if (h) {
        const e = map.get(h) ?? { name: h, gf: 0, ga: 0, games: 0 };
        e.gf += m.home_goals; e.ga += m.away_goals; e.games++;
        map.set(h, e);
      }
      if (a) {
        const e = map.get(a) ?? { name: a, gf: 0, ga: 0, games: 0 };
        e.gf += m.away_goals; e.ga += m.home_goals; e.games++;
        map.set(a, e);
      }
    }
    return Array.from(map.values()).slice(0, 6).map((t) => ({
      name: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
      "Gols marcados": +(t.gf / t.games).toFixed(2),
      "Gols sofridos": +(t.ga / t.games).toFixed(2),
    }));
  })();

  const cards = [
    { label: "Times cadastrados", value: teamsCount, icon: Users },
    { label: "Jogos recentes", value: data?.matches.length ?? 0, icon: ListOrdered },
    { label: "Previsões geradas", value: predsCount, icon: Target },
    { label: "Taxa de acerto", value: `${accuracy}%`, icon: TrendingUp },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-1">Resumo da sua análise</p>

      <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="grid gap-6 mt-8 lg:grid-cols-2">
          <div className="card-surface p-5">
            <h2 className="font-display font-semibold mb-3">Gols e escanteios (últimos jogos)</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gols" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Escanteios" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-surface p-5">
            <h2 className="font-display font-semibold mb-3">Média de gols por time</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Gols marcados" fill="var(--primary)" />
                  <Bar dataKey="Gols sofridos" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Últimos jogos</h2>
            <Link to="/matches" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {data?.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogo cadastrado. <Link to="/matches" className="text-primary">Adicione o primeiro</Link>.</p>
          ) : (
            <ul className="space-y-2">
              {data?.matches.map((m: any) => (
                <li key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <TeamBadge name={m.home_team.name} logoUrl={m.home_team.logo_url} color={m.home_team.color} size={28} />
                  <span className="text-sm font-medium flex-1 truncate">{m.home_team.name}</span>
                  <span className="font-mono text-sm">{m.home_goals} - {m.away_goals}</span>
                  <span className="text-sm font-medium flex-1 truncate text-right">{m.away_team.name}</span>
                  <TeamBadge name={m.away_team.name} logoUrl={m.away_team.logo_url} color={m.away_team.color} size={28} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="font-display font-semibold mb-4">Comece por aqui</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/teams" className="text-primary hover:underline">1. Cadastre os times</Link></li>
            <li><Link to="/matches" className="text-primary hover:underline">2. Adicione o histórico de jogos</Link></li>
            <li><Link to="/predictions" className="text-primary hover:underline">3. Gere uma previsão</Link></li>
            <li><Link to="/h2h" className="text-primary hover:underline">4. Compare no confronto direto</Link></li>
            <li><Link to="/history" className="text-primary hover:underline">5. Acompanhe seu acerto</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
