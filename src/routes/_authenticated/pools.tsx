import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMyPools, createPool, joinPool } from "@/lib/social.functions";
import { Users, Plus, LogIn, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pools")({
  component: PoolsPage,
  head: () => ({
    meta: [
      { title: "Bolões — Placar Certo" },
      { name: "description", content: "Crie e participe de bolões privados." },
    ],
  }),
});

function PoolsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyPools);
  const createFn = useServerFn(createPool);
  const joinFn = useServerFn(joinPool);

  const { data: pools = [], isLoading } = useQuery({ queryKey: ["pools"], queryFn: async () => await listFn() });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const createMut = useMutation({
    mutationFn: async () => await createFn({ data: { name } }),
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["pools"] }); toast.success("Bolão criado"); },
    onError: (e: any) => toast.error(e.message),
  });
  const joinMut = useMutation({
    mutationFn: async () => await joinFn({ data: { code } }),
    onSuccess: () => { setCode(""); qc.invalidateQueries({ queryKey: ["pools"] }); toast.success("Entrou no bolão"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> Bolões
        </h1>
        <p className="text-sm text-muted-foreground">Compita com amigos em grupos privados.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Criar bolão</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do bolão"
            className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
          />
          <button
            onClick={() => createMut.mutate()}
            disabled={!name.trim() || createMut.isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1"
          >
            {createMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Criar
          </button>
        </div>

        <div className="card-surface p-4 space-y-3">
          <h2 className="font-medium flex items-center gap-2"><LogIn className="h-4 w-4" /> Entrar por código</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de convite"
            className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={() => joinMut.mutate()}
            disabled={!code.trim() || joinMut.isPending}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-input disabled:opacity-50 inline-flex items-center gap-1"
          >
            {joinMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Entrar
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Meus bolões ({pools.length})</h2>
        {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
        {!isLoading && pools.length === 0 && (
          <div className="card-surface p-6 text-sm text-muted-foreground text-center">
            Você ainda não participa de nenhum bolão.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {pools.map((p) => (
            <Link
              key={p.id}
              to="/pools/$poolId"
              params={{ poolId: p.id }}
              className="card-surface p-4 hover:border-primary/50 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Criado {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "---"}</div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(p.invite_code); toast.success("Código copiado"); }}
                  className="text-xs font-mono inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-input"
                >
                  <Copy className="h-3 w-3" /> {p.invite_code}
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
