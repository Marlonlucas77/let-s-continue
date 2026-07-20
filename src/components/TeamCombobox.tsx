import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Pencil } from "lucide-react";
import { TeamBadge } from "@/components/TeamBadge";

export type ComboTeam = { id: string; name: string; logo_url?: string | null; league?: string | null; country?: string | null };

// Marca times "digitados livremente" (não existem na lista local importada)
// com esse prefixo de id, pra quem usa o componente saber diferenciar.
export const CUSTOM_TEAM_PREFIX = "custom:";
export function isCustomTeam(team: ComboTeam | null | undefined): boolean {
  return !!team && team.id.startsWith(CUSTOM_TEAM_PREFIX);
}

export function TeamCombobox({ teams, value, onChange, placeholder, onQueryChange, extraTeams = [], loading = false }: {
  teams: ComboTeam[]; value: ComboTeam | null; onChange: (team: ComboTeam | null) => void; placeholder?: string;
  onQueryChange?: (q: string) => void; extraTeams?: ComboTeam[]; loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { onQueryChange?.(query); }, [query, onQueryChange]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const merged = [...teams];
    const seen = new Set(teams.map((t) => t.id));
    for (const t of extraTeams) if (!seen.has(t.id)) { merged.push(t); seen.add(t.id); }
    const pool = q ? merged.filter((t) => t.name.toLowerCase().includes(q)) : merged;
    return pool.slice(0, 50);
  }, [teams, extraTeams, query]);

  const exactMatch = results.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  const canUseFreeText = query.trim().length >= 2 && !exactMatch;

  const useFreeText = () => {
    const name = query.trim();
    onChange({ id: `${CUSTOM_TEAM_PREFIX}${name.toLowerCase()}`, name });
    setQuery("");
    setOpen(false);
  };

  if (value && !open) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-md bg-input border border-border px-3 py-2">
        {isCustomTeam(value) ? (
          <span title="Time digitado, não está na sua lista importada">
            <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
          </span>
        ) : (
          <TeamBadge name={value.name} size={20} />
        )}
        <span className="flex-1 text-sm truncate">{value.name}</span>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(""); setOpen(true); }}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative mt-1" ref={wrapperRef}>
      <div className="flex items-center gap-2 rounded-md bg-input border border-border px-3 focus-within:border-primary transition-colors">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && canUseFreeText) { e.preventDefault(); useFreeText(); } }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent py-2 text-sm outline-none"
        />
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">Buscando times…</div>
          )}
          {!loading && results.length === 0 && !canUseFreeText && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Digite pelo menos 2 letras.</div>
          )}
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t); setQuery(""); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-input"
            >
              <TeamBadge name={t.name} size={20} />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[35%]">{t.league || t.country}</span>
            </button>
          ))}
          {canUseFreeText && (
            <button
              type="button"
              onClick={useFreeText}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-input border-t border-border text-primary"
            >
              <Pencil className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Usar "{query.trim()}" mesmo assim</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
