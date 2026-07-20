import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        // Confirmação por código desligada temporariamente (pedido do
        // usuário, pra facilitar testes). Se o projeto no Supabase ainda
        // exigir confirmação de e-mail (config "Confirm email"), o login
        // não vem com sessão ativa mesmo assim — nesse caso É NECESSÁRIO
        // desligar aquela opção lá também (Authentication -> Providers ->
        // Email -> "Confirm email").
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          toast.success("Conta criada! Agora escolha as ligas que você quer acompanhar.");
          navigate({ to: "/settings", search: { onboarding: "1" } });
        } else {
          toast.success("Conta criada. Se pedir confirmação, faça login normalmente.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center"><Logo size={48} /></div>
          <h1 className="font-display text-2xl font-bold">Placar<span className="text-primary"> Certo</span></h1>
          <p className="text-sm text-muted-foreground">{mode === "login" ? "Entre para analisar seus jogos" : "Crie sua conta grátis"}</p>
        </div>

        <form onSubmit={submit} className="card-surface p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm" />
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Confirmar senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="mt-1 text-xs text-destructive">As senhas não são iguais.</p>
              )}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          {mode === "signup" && (
            <p className="text-center text-[11px] text-muted-foreground">
              Ao criar conta, você concorda com nossos{" "}
              <Link to="/terms" className="underline hover:text-foreground">Termos de Uso</Link> e{" "}
              <Link to="/privacy" className="underline hover:text-foreground">Política de Privacidade</Link>.
            </p>
          )}
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
