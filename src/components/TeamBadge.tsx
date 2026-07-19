import { teamInitials } from "@/lib/stats";

// Não exibe o brasão/logo real do time — são marcas registradas dos
// clubes e ligas, e mostrar isso publicamente num produto comercial é
// risco de propriedade intelectual. Sempre usa um avatar genérico com as
// iniciais do time em vez da imagem.
export function TeamBadge({ name, color, size = 40 }: { name: string; logoUrl?: string | null; color?: string | null; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: color || "#10b981", fontSize: size * 0.4 }}
    >
      {teamInitials(name)}
    </div>
  );
}
