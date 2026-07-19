import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { listFavorites, toggleFavorite } from "@/lib/favorites.functions";

interface Props {
  kind: "team" | "league";
  refId: number;
  label?: string;
  className?: string;
}

export function FavoriteButton({ kind, refId, label, className = "" }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listFavorites);
  const toggleFn = useServerFn(toggleFavorite);

  const { data: favs = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => (await listFn()) as Array<{ kind: string; ref_id: number }>,
    staleTime: 60_000,
  });
  const active = favs.some((f) => f.kind === kind && Number(f.ref_id) === refId);

  const mut = useMutation({
    mutationFn: async () => toggleFn({ data: { kind, refId, label } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(r.favored ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); mut.mutate(); }}
      disabled={mut.isPending}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-card ${className}`}
    >
      <Star className={`h-4 w-4 ${active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
    </button>
  );
}
