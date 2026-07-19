import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamBadge } from "@/components/TeamBadge";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { translateCountry, translateLeague, translateTeam } from "@/lib/country-i18n";

export const Route = createFileRoute("/_authenticated/matches")({
  component: MatchesPage,
});

const empty = {
  home_team_id: "", away_team_id: "", match_date: new Date().toISOString().slice(0, 10),
  home_goals: 0, away_goals: 0, home_goals_ht: 0, away_goals_ht: 0,
  home_corners: 0, away_corners: 0, home_yellow: 0, away_yellow: 0, home_red: 0, away_red: 0,
};

function MatchesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [leagueFilter, setLeagueFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [isDebouncing, setIsDebouncing] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await supabase.from("teams").select("*").order("name")).data ?? [],
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*, home_team:home_team_id(name,color,logo_url,league,country), away_team:away_team_id(name,color,logo_url,league,country)").order("match_date", { ascending: false });
      return data ?? [];
    },
  });

  const lq = leagueFilter.trim().toLowerCase();
  const tq = teamFilter.trim().toLowerCase();
  const filteredMatches = matches.filter((m: any) => {
    const leagueOk = !lq || [
      m.home_team?.league, 
      m.away_team?.league, 
      m.home_team?.country, 
      m.away_team?.country, 
      translateLeague(m.home_team?.league), 
      translateLeague(m.away_team?.league), 
      translateCountry(m.home_team?.country), 
      translateCountry(m.away_team?.country)
    ].some(v => v?.toLowerCase().includes(lq));
    
    const teamOk = !tq || (
      m.home_team?.name?.toLowerCase().includes(tq) || 
      m.away_team?.name?.toLowerCase().includes(tq) ||
      translateTeam(m.home_team?.name).toLowerCase().includes(tq) ||
      translateTeam(m.away_team?.name).toLowerCase().includes(tq)
    );
    return leagueOk && teamOk;
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (form.home_team_id === form.away_team_id) throw new Error("Times devem ser diferentes");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("matches").insert({ ...form, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Jogo salvo"); setForm(empty); setShowForm(false); qc.invalidateQueries({ queryKey: ["matches"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("matches").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["matches"] }); },
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV vazio");
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      const req = ["home_team", "away_team", "match_date", "home_goals", "away_goals"];
      for (const r of req) if (idx(r) === -1) throw new Error(`Coluna faltando: ${r}`);
      const teamMap = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));
      const { data: { user } } = await supabase.auth.getUser();
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(",").map((x) => x.trim());
        const hid = teamMap.get(c[idx("home_team")].toLowerCase());
        const aid = teamMap.get(c[idx("away_team")].toLowerCase());
        if (!hid || !aid) throw new Error(`Linha ${i + 1}: time não cadastrado`);
        const num = (k: string) => { const j = idx(k); return j >= 0 ? parseInt(c[j]) || 0 : 0; };
        rows.push({
          user_id: user!.id, home_team_id: hid, away_team_id: aid,
          match_date: c[idx("match_date")],
          home_goals: num("home_goals"), away_goals: num("away_goals"),
          home_goals_ht: num("home_goals_ht"), away_goals_ht: num("away_goals_ht"),
          home_corners: num("home_corners"), away_corners: num("away_corners"),
          home_yellow: num("home_yellow"), away_yellow: num("away_yellow"),
          home_red: num("home_red"), away_red: num("away_red"),
        });
      }
      const { error } = await supabase.from("matches").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { toast.success(`${n} jogo(s) importado(s)`); qc.invalidateQueries({ queryKey: ["matches"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const csv = "home_team,away_team,match_date,home_goals,away_goals,home_goals_ht,away_goals_ht,home_corners,away_corners,home_yellow,away_yellow,home_red,away_red\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "modelo-jogos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const numField = (key: keyof typeof form, label: string) => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type="number" min={0} value={form[key] as number} onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value) || 0 })} className="mt-1 w-full rounded-md bg-input border border-border px-2 py-1.5 text-sm" />
    </div>
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Jogos</h1>
          <p className="text-sm text-muted-foreground">{filteredMatches.length} de {matches.length} registrado(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="hidden sm:inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <Download className="h-4 w-4" />Modelo
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={teams.length < 2 || importMut.isPending} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">
            <Upload className="h-4 w-4" />CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importMut.mutate(f); e.target.value = ""; }} />
          <button onClick={() => setShowForm(!showForm)} disabled={teams.length < 2} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" />Novo
          </button>
        </div>
      </div>

      {teams.length < 2 && (
        <div className="card-surface p-4 mb-4 text-sm text-muted-foreground">Cadastre ao menos 2 times antes de adicionar jogos.</div>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Filtrar por liga ou país..."
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary transition-all pr-10"
          />
          {leagueFilter && (
             <button 
               onClick={() => setLeagueFilter("")}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
             >
               ×
             </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Filtrar por time..."
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-input/50 px-3 py-2 text-sm outline-none focus:border-primary transition-all pr-10"
          />
          {teamFilter && (
             <button 
               onClick={() => setTeamFilter("")}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
             >
               ×
             </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="card-surface p-5 mb-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm">Mandante *</label>
              <select required value={form.home_team_id} onChange={(e) => setForm({ ...form, home_team_id: e.target.value })} className="mt-1 w-full rounded-md bg-input border border-border px-2 py-2 text-sm">
                <option value="">Selecionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Visitante *</label>
              <select required value={form.away_team_id} onChange={(e) => setForm({ ...form, away_team_id: e.target.value })} className="mt-1 w-full rounded-md bg-input border border-border px-2 py-2 text-sm">
                <option value="">Selecionar...</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm">Data *</label>
              <input required type="date" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} className="mt-1 w-full rounded-md bg-input border border-border px-2 py-2 text-sm" />
            </div>
          </div>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-6">
            {numField("home_goals", "Gols casa")}
            {numField("away_goals", "Gols fora")}
            {numField("home_goals_ht", "Gols casa 1T")}
            {numField("away_goals_ht", "Gols fora 1T")}
            {numField("home_corners", "Escanteios casa")}
            {numField("away_corners", "Escanteios fora")}
            {numField("home_yellow", "Amarelos casa")}
            {numField("away_yellow", "Amarelos fora")}
            {numField("home_red", "Vermelhos casa")}
            {numField("away_red", "Vermelhos fora")}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMut.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Salvar</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="card-surface divide-y divide-border">
        {filteredMatches.map((m: any) => (
          <div key={m.id} className="p-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground w-20">{m.match_date}</span>
            <TeamBadge name={m.home_team.name} logoUrl={m.home_team.logo_url} color={m.home_team.color} size={32} />
            <span className="font-medium flex-1 min-w-0 truncate">{translateTeam(m.home_team.name)}</span>
            <span className="font-mono font-bold text-lg">{m.home_goals} - {m.away_goals}</span>
            <span className="font-medium flex-1 min-w-0 truncate text-right">{translateTeam(m.away_team.name)}</span>
            <TeamBadge name={m.away_team.name} logoUrl={m.away_team.logo_url} color={m.away_team.color} size={32} />
            <button onClick={() => { if (confirm("Remover jogo?")) deleteMut.mutate(m.id); }} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {filteredMatches.length === 0 && (
          <div className="p-8 text-sm text-muted-foreground text-center space-y-3">
            <p>Nenhum jogo {(lq || tq) ? "encontrado com esse filtro" : "registrado ainda"}.</p>
            {!lq && !tq && matches.length === 0 && (
              <a href="/import" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Importar jogos das suas ligas
              </a>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
