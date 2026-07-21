import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

const ZERO_DECIMAL = new Set(["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);
function toMajor(amount: number, currency: string): number {
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return amount;
  if (THREE_DECIMAL.has(c)) return amount / 1000;
  return amount / 100;
}


async function requireAdmin(context: any) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito: apenas administradores.");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
    const { data: subs } = await supabaseAdmin.from("subscriptions").select("*");

    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const subMap = new Map((subs ?? []).map((s: any) => [s.user_id, s]));

    return users.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      display_name: (profMap.get(u.id) as any)?.display_name ?? null,
      roles: roleMap.get(u.id) ?? [],
      plan: (subMap.get(u.id) as any)?.plan ?? "free",
      sub_status: (subMap.get(u.id) as any)?.status ?? null,
    }));
  });

export const adminToggleRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "moderator" | "user"; grant: boolean }) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "moderator", "user"]),
      grant: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_PRICES_BRL } = await import("@/lib/plan-limits.server");
    const [{ count: users }, { count: matches }, { count: predictions }, { count: teams }, { count: tracked }, { data: activeSubs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("matches").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("predictions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("teams").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("tracked_leagues").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("subscriptions").select("plan").eq("status", "active"),
    ]);
    const plans: Record<string, number> = {};
    for (const s of activeSubs ?? []) plans[s.plan] = (plans[s.plan] ?? 0) + 1;

    // Receita estimada = soma de (assinantes ativos × preço) por plano.
    // "Estimada" porque não guardamos o valor exato cobrado por assinatura
    // (a fonte de verdade real é o Stripe) — isso usa os preços atuais de
    // /pricing, então planos comprados com preço antigo ficam levemente
    // imprecisos se o preço já mudou.
    let monthlyRevenueBRL = 0;
    for (const [plan, count] of Object.entries(plans)) {
      const price = (PLAN_PRICES_BRL as Record<string, number>)[plan] ?? 0;
      monthlyRevenueBRL += price * count;
    }

    return {
      users: users ?? 0,
      matches: matches ?? 0,
      predictions: predictions ?? 0,
      teams: teams ?? 0,
      trackedLeagues: tracked ?? 0,
      plans,
      monthlyRevenueBRL: Math.round(monthlyRevenueBRL * 100) / 100,
    };
  });

export const adminCronStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: runs }, { count: neverRun }, { count: totalLeagues }] = await Promise.all([
      supabaseAdmin.from("cron_runs").select("*").order("started_at", { ascending: false }).limit(10),
      supabaseAdmin.from("tracked_leagues").select("*", { count: "exact", head: true }).is("last_run_at", null),
      supabaseAdmin.from("tracked_leagues").select("*", { count: "exact", head: true }),
    ]);

    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { count: stale } = await supabaseAdmin
      .from("tracked_leagues")
      .select("*", { count: "exact", head: true })
      .not("last_run_at", "is", null)
      .lt("last_run_at", cutoff);

    const lastRun = runs?.[0] ?? null;
    return {
      lastRun,
      recentRuns: runs ?? [],
      neverRunLeagues: neverRun ?? 0,
      staleLeagues: stale ?? 0,
      totalLeagues: totalLeagues ?? 0,
    };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
