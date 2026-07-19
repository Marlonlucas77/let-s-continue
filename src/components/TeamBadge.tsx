import { teamInitials } from "@/lib/stats";

export function TeamBadge({ name, logoUrl, color, size = 40 }: { name: string; logoUrl?: string | null; color?: string | null; size?: number }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="grid place-items-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: color || "#10b981", fontSize: size * 0.4 }}
    >
      {teamInitials(name)}
    </div>
  );
}
