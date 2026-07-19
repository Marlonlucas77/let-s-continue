import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarClock, Users, Swords, History, LogOut, Crown, Shield, Trophy, UsersRound, Radio,
  LayoutDashboard, Sparkles, MoreHorizontal, X, Settings, UserCircle,
} from "lucide-react";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

type NavItem = { to: string; label: string; icon: any };

// Agrupado por função, pra ficar claro onde cada coisa mora — antes várias
// dessas páginas (Painel, Previsões, Importar, Partidas) não apareciam em
// lugar nenhum do menu, só eram acessíveis digitando a URL direto.
const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "", items: [{ to: "/dashboard", label: "Painel", icon: LayoutDashboard }] },
  {
    label: "Previsões",
    items: [
      { to: "/upcoming", label: "Jogos", icon: CalendarClock },
      { to: "/predictions", label: "Previsão IA", icon: Sparkles },
      { to: "/h2h", label: "H2H", icon: Swords },
      { to: "/live", label: "Ao vivo", icon: Radio },
    ],
  },
  {
    label: "Dados",
    items: [
      { to: "/teams", label: "Times", icon: Users },
    ],
  },
  {
    label: "Comunidade",
    items: [
      { to: "/history", label: "Histórico", icon: History },
      { to: "/leaderboard", label: "Ranking", icon: Trophy },
      { to: "/pools", label: "Bolões", icon: UsersRound },
      { to: "/pricing", label: "Planos", icon: Crown },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

// Para a barra inferior no celular só cabem uns 5 ícones — o resto vai
// dentro do botão "Mais".
const mobilePrimary: NavItem[] = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/upcoming", label: "Jogos", icon: CalendarClock },
  { to: "/predictions", label: "Previsão IA", icon: Sparkles },
  { to: "/history", label: "Histórico", icon: History },
];

function AuthedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const checkAdminFn = useServerFn(checkIsAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => await checkAdminFn(),
    staleTime: 5 * 60 * 1000,
  });

  const groups = adminCheck?.isAdmin
    ? [...navGroups, { label: "Admin", items: [{ to: "/admin", label: "Admin", icon: Shield }] }]
    : navGroups;
  const allItems = groups.flatMap((g) => g.items);
  const mobileMoreItems = allItems.filter((i) => !mobilePrimary.some((m) => m.to === i.to));

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-60 border-r border-border flex-col p-4 gap-1 overflow-y-auto">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">P</div>
          <span className="font-display text-lg font-bold">Placar Certo</span>
        </Link>
        {groups.map((group, gi) => (
          <div key={gi} className={group.label ? "mt-3" : ""}>
            {group.label && (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
                  <item.icon className="h-4 w-4" />{item.label}
                </Link>
              );
            })}
          </div>
        ))}
        <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground">
          <LogOut className="h-4 w-4" />Sair
        </button>
      </aside>

      <header className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">P</div>
          <span className="font-display font-bold">Placar Certo</span>
        </Link>
        <button onClick={logout} className="text-sm text-muted-foreground"><LogOut className="h-4 w-4" /></button>
      </header>

      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMoreOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-background border-t border-border rounded-t-2xl p-4 pb-8 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Mais opções</span>
              <button onClick={() => setMobileMoreOpen(false)} className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {mobileMoreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-md px-2 py-3 text-xs ${pathname === item.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card"}`}
                >
                  <item.icon className="h-5 w-5" />{item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background flex justify-around py-2">
        {mobilePrimary.map((item) => {
          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <item.icon className="h-5 w-5" />{item.label}
            </Link>
          );
        })}
        <button onClick={() => setMobileMoreOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />Mais
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
