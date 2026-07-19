import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("id, kind, ref_id, label, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: "team" | "league"; refId: number; label?: string }) => {
    if (data.kind !== "team" && data.kind !== "league") throw new Error("kind inválido");
    if (!Number.isInteger(data.refId)) throw new Error("refId inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .eq("ref_id", data.refId)
      .maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return { favored: false };
    }
    await supabase
      .from("favorites")
      .insert({ user_id: userId, kind: data.kind, ref_id: data.refId, label: data.label ?? null });
    return { favored: true };
  });
