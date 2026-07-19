import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

export type ComboTeam = { id: string; name: string; logo_url?: string | null; league?: string | null; country?: string | null };

export function TeamCombobox({ teams, value, onChange, placeholder }: {
  teams: ComboTeam[]; value: string; onChange: (id: string) => void; placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = teams.find((t) => t.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : teams;
    return pool.slice(0, 50);
  }, [teams, query]);

  if (selected && !open) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-md bg-input border border-border px-3 py-2">
        {selected.logo_url && <img src={selected.logo_url} alt="" className="h-5 w-5 object-contain shrink-0" />}
        <span className="flex-1 text-sm truncate">{selected.name}</span>
        <button
          type="button"
          onClick={() => { onChange(""); setQuery(""); setOpen(true); }}
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
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent py-2 text-sm outline-none"
        />
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum time encontrado.</div>
          ) : (
            results.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-input"
              >
                {t.logo_url && <img src={t.logo_url} alt="" className="h-5 w-5 object-contain shrink-0" />}
                <span className="flex-1 truncate">{t.name}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[35%]">{t.league || t.country}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
