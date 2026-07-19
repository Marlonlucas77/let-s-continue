import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGlobalLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_leaderboard", { _limit: 50 });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ user_id: string; display_name: string; total: number; correct: number; accuracy: number | null }>;
  });

export const listMyPools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Owner pools + member pools
    const { data: memberRows } = await context.supabase
      .from("pool_members")
      .select("pool_id")
      .eq("user_id", context.userId);
    const memberIds = (memberRows ?? []).map((r) => r.pool_id);
    const { data, error } = await context.supabase
      .from("pools")
      .select("id, name, invite_code, owner_id, created_at")
      .or(`owner_id.eq.${context.userId}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    if (!input?.name?.trim()) throw new Error("Nome obrigatório");
    return { name: input.name.trim().slice(0, 60) };
  })
  .handler(async ({ data, context }) => {
    const { data: pool, error } = await context.supabase
      .from("pools")
      .insert({ name: data.name, owner_id: context.userId })
      .select("id, invite_code")
      .single();
    if (error) throw new Error(error.message);
    // Owner joins as member
    await context.supabase.from("pool_members").insert({ pool_id: pool.id, user_id: context.userId });
    return pool;
  });

export const joinPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => ({ code: (input?.code ?? "").trim().toLowerCase() }))
  .handler(async ({ data, context }) => {
    if (!data.code) throw new Error("Código obrigatório");
    const { data: pool, error } = await context.supabase
      .from("pools")
      .select("id, name")
      .eq("invite_code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pool) throw new Error("Bolão não encontrado");
    const { error: insErr } = await context.supabase
      .from("pool_members")
      .insert({ pool_id: pool.id, user_id: context.userId });
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);
    return pool;
  });

export const leavePool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { poolId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pool_members")
      .delete()
      .eq("pool_id", data.poolId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPool = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { poolId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: pool, error } = await context.supabase
      .from("pools")
      .select("id, name, invite_code, owner_id, created_at")
      .eq("id", data.poolId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pool) throw new Error("Bolão não encontrado");
    const { data: leaderboard, error: lbErr } = await context.supabase.rpc("get_pool_leaderboard", { _pool_id: data.poolId });
    if (lbErr) throw new Error(lbErr.message);
    return { pool, leaderboard: (leaderboard ?? []) as Array<{ user_id: string; display_name: string; total: number; correct: number; accuracy: number | null }> };
  });
