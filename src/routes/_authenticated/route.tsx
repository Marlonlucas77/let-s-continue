import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Users, Swords, History, LogOut, Crown, Shield, Trophy, UsersRound, Radio } from "lucide-react";
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

const baseNav = [
  { to: "/upcoming", label: "Jogos", icon: CalendarClock },
  { to: "/live", label: "Ao vivo", icon: Radio },
  { to: "/teams", label: "Times", icon: Users },
  { to: "/h2h", label: "H2H", icon: Swords },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/leaderboard", label: "Ranking", icon: Trophy },
  { to: "/pools", label: "Bolões", icon: UsersRound },
  { to: "/pricing", label: "Planos", icon: Crown },
] as const;

function AuthedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkAdminFn = useServerFn(checkIsAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => await checkAdminFn(),
    staleTime: 5 * 60 * 1000,
  });
  const nav: Array<{ to: string; label: string; icon: any }> = [
    ...baseNav,
    ...(adminCheck?.isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-60 border-r border-border flex-col p-4 gap-1">
        <Link to="/upcoming" className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">P</div>
          <span className="font-display text-lg font-bold">Placar Certo</span>
        </Link>
        {nav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          );
        })}
        <button onClick={logout} className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground">
          <LogOut className="h-4 w-4" />Sair
        </button>
      </aside>

      <header className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/upcoming" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">P</div>
          <span className="font-display font-bold">Placar Certo</span>
        </Link>
        <button onClick={logout} className="text-sm text-muted-foreground"><LogOut className="h-4 w-4" /></button>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background flex justify-around py-2">
        {nav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <item.icon className="h-5 w-5" />{item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
