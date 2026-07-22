import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { useServerFn } from "@tanstack/react-start";
import { attachReferral } from "@/lib/affiliate.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const search = Route.useSearch();
  const attachRefFn = useServerFn(attachReferral);

  useEffect(() => {
    const fromUrl = search.ref;
    if (fromUrl && typeof window !== "undefined") {
      try { window.localStorage.setItem("pc_ref", fromUrl.toUpperCase()); } catch {}
    }
  }, [search.ref]);

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
          email,
          password,
          options: { data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Enviamos um código de 6 dígitos pro seu e-mail.");
        setStep("otp");
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

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Digite o código completo enviado ao seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      try {
        const ref = typeof window !== "undefined" ? window.localStorage.getItem("pc_ref") : null;
        if (ref) {
          await attachRefFn({ data: { code: ref } });
          window.localStorage.removeItem("pc_ref");
        }
      } catch {}
      toast.success("E-mail confirmado! Bem-vindo(a) ao Placar Certo.");
      navigate({ to: "/settings", search: { onboarding: "1" } });
    } catch (err: any) {
      toast.error(err.message ?? "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Novo código enviado.");
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível reenviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? "Erro no login com Google");
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro no login com Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center"><Logo size={48} /></div>
          <h1 className="font-display text-2xl font-bold">Placar<span className="text-primary"> Certo</span></h1>
          <p className="text-sm text-muted-foreground">
            {step === "otp"
              ? "Confirme seu e-mail"
              : mode === "login"
              ? "Entre para analisar seus jogos"
              : "Crie sua conta grátis"}
          </p>
        </div>

        {step === "otp" ? (
          <form onSubmit={verifyOtp} className="card-surface p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviamos um código para <strong className="text-foreground">{email}</strong>.
              Digite abaixo para ativar sua conta.
            </p>
            <div>
              <label className="text-sm font-medium">Código de confirmação</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6,8}"
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="mt-1 w-full rounded-md bg-input border border-border px-3 py-3 text-center text-2xl font-bold tracking-[0.4em]"
                placeholder="00000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Confirmar e entrar"}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground underline"
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); }}
                className="text-muted-foreground hover:text-foreground"
              >
                Voltar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className="card-surface p-6 space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
              Continuar com Google
            </button>
            <div className="relative flex items-center">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
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
        )}
      </div>
    </div>
  );
}
