import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyAffiliate, savePixKey } from "@/lib/affiliate.functions";
import { Copy, Share2, Wallet, Users, CheckCircle2, Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [
      { title: "Programa de Afiliados — PlacarCerto" },
      { name: "description", content: "Indique amigos e ganhe 50% do primeiro mês de cada assinatura." },
    ],
  }),
  component: AffiliatePage,
});

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AffiliatePage() {
  const getFn = useServerFn(getMyAffiliate);
  const saveFn = useServerFn(savePixKey);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["affiliate"], queryFn: () => getFn() });

  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("email");

  const save = useMutation({
    mutationFn: () => saveFn({ data: { pixKey, pixKeyType } }),
    onSuccess: () => {
      toast.success("Chave Pix salva.");
      qc.invalidateQueries({ queryKey: ["affiliate"] });
      setPixKey("");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = data?.code ? `${origin}/auth?ref=${data.code}` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const share = async () => {
    if (!link) return;
    const text = `Estou usando o PlacarCerto — previsões de futebol com IA. Use meu link e ganhe acesso: ${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: "PlacarCerto", text, url: link }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado!");
    }
  };

  if (isLoading) return <div className="max-w-4xl mx-auto p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Programa de afiliados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indique amigos e ganhe <strong>50% do primeiro mês</strong> de cada assinatura paga. Pagamento via Pix, manual, todo mês.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Indicações" value={String(data?.totalReferrals ?? 0)} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Assinaram" value={String(data?.paidReferrals ?? 0)} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="A receber" value={fmtBRL(data?.pendingCents ?? 0)} highlight />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Já recebido" value={fmtBRL(data?.paidCents ?? 0)} />
      </div>

      {/* Link */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-semibold">Seu link de indicação</h2>
        <div className="flex gap-2 items-center">
          <input readOnly value={link} className="flex-1 rounded-md bg-muted/40 border border-border px-3 py-2 text-sm font-mono" />
          <button onClick={copy} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <button onClick={share} className="rounded-md bg-muted border border-border px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Código: <code className="font-mono">{data?.code}</code> — quem se cadastra pelo link fica vinculado a você para sempre.
        </p>
      </section>

      {/* Pix */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-semibold">Chave Pix para receber</h2>
        {data?.pixKey ? (
          <p className="text-sm">
            Salva: <strong className="font-mono">{data.pixKey}</strong>{" "}
            <span className="text-muted-foreground">({data.pixKeyType})</span>
          </p>
        ) : (
          <p className="text-sm text-amber-400">Cadastre sua chave Pix para receber as comissões.</p>
        )}
        <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
          <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} className="rounded-md bg-muted/40 border border-border px-3 py-2 text-sm">
            <option value="email">E-mail</option>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="phone">Celular</option>
            <option value="random">Aleatória</option>
          </select>
          <input
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="Digite sua chave Pix"
            className="rounded-md bg-muted/40 border border-border px-3 py-2 text-sm"
          />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || pixKey.trim().length < 4}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar"}
          </button>
        </div>
      </section>

      {/* Commissions */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-semibold">Suas comissões</h2>
        {!data?.commissions.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma comissão ainda. Compartilhe seu link para começar!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr><th className="py-2">Data</th><th>Indicado</th><th>Valor</th><th>Status</th></tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="text-muted-foreground">{c.referred_email ? maskEmail(c.referred_email) : "—"}</td>
                    <td className="font-medium">{fmtBRL(c.amount_cents)}</td>
                    <td>
                      {c.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" /> Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Referrals */}
      <section className="card-surface p-5 space-y-3">
        <h2 className="font-semibold">Quem você indicou</h2>
        {!data?.referrals.length ? (
          <p className="text-sm text-muted-foreground">Ninguém ainda. Que tal mandar seu link no zap?</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.referrals.map((r) => (
              <li key={r.id} className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-muted-foreground">{r.email ? maskEmail(r.email) : "—"}</span>
                <span className="text-xs">
                  {r.subscribed
                    ? <span className="text-emerald-400">✓ Assinou</span>
                    : <span className="text-muted-foreground">Ainda não assinou</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground text-center">
        Dúvidas? Fale com a gente em <Link to="/feedback" className="underline">Feedback</Link>.
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card-surface p-4 ${highlight ? "border-primary/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return e;
  return `${u.slice(0, 2)}***@${d}`;
}
