import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

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

  // Depois do cadastro, entra nesse modo: pede o código de 6 dígitos
  // enviado por e-mail antes de liberar o acesso de verdade.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const finishLogin = async () => {
    toast.success("Conta confirmada! Agora escolha as ligas que você quer acompanhar.");
    navigate({ to: "/settings", search: { onboarding: "1" } });
  };

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
        toast.success("Enviamos um código de confirmação pro seu e-mail.");
        setAwaitingCode(true);
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

  const confirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (error) throw error;
      await finishLogin();
    } catch (err: any) {
      toast.error(err.message ?? "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Reenviamos o código.");
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível reenviar o código.");
    } finally {
      setResending(false);
    }
  };

  if (awaitingCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex justify-center"><Logo size={48} /></div>
            <h1 className="font-display text-2xl font-bold">Confirme seu e-mail</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enviamos um código de 6 dígitos pra <span className="text-foreground font-medium">{email}</span>.
            </p>
          </div>

          <form onSubmit={confirmCode} className="card-surface p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Código de confirmação</label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-center text-lg tracking-[0.5em] font-mono"
              />
            </div>
            <button type="submit" disabled={loading || code.length < 6} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {loading ? "Confirmando..." : "Confirmar e entrar"}
            </button>
            <button type="button" onClick={resendCode} disabled={resending} className="w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
              {resending ? "Reenviando..." : "Não recebeu? Reenviar código"}
            </button>
            <button
              type="button"
              onClick={() => { setAwaitingCode(false); setCode(""); }}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

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
