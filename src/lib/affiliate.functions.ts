import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkIsAdmin } from "@/lib/admin.functions";

export type AffiliateStats = {
  code: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  totalReferrals: number;
  paidReferrals: number;
  pendingCents: number;
  paidCents: number;
  totalCents: number;
  referrals: Array<{
    id: string;
    email: string | null;
    created_at: string;
    subscribed: boolean;
  }>;
  commissions: Array<{
    id: string;
    amount_cents: number;
    status: string;
    created_at: string;
    paid_at: string | null;
    referred_email: string | null;
  }>;
};

export const getMyAffiliate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AffiliateStats> => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, pix_key, pix_key_type")
      .eq("id", userId)
      .maybeSingle();

    const { data: stats } = await supabase.rpc("get_affiliate_stats", { _user_id: userId });
    const s = (stats as any)?.[0] ?? {};

    const { data: refs } = await supabase
      .from("referrals")
      .select("id, referred_id, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const referredIds = (refs ?? []).map((r: any) => r.referred_id);
    const emailsMap = new Map<string, string>();
    if (referredIds.length) {
      const { data: prof } = await supabase.from("profiles").select("id, email").in("id", referredIds);
      (prof ?? []).forEach((p: any) => emailsMap.set(p.id, p.email));
    }

    // Which referred users have any commission = they subscribed at least once
    const { data: comms } = await supabase
      .from("affiliate_commissions")
      .select("id, amount_cents, status, created_at, paid_at, referred_id")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    const subscribedSet = new Set((comms ?? []).map((c: any) => c.referred_id));

    return {
      code: (profile as any)?.referral_code ?? null,
      pixKey: (profile as any)?.pix_key ?? null,
      pixKeyType: (profile as any)?.pix_key_type ?? null,
      totalReferrals: Number(s.total_referrals ?? 0),
      paidReferrals: Number(s.paid_referrals ?? 0),
      pendingCents: Number(s.pending_cents ?? 0),
      paidCents: Number(s.paid_cents ?? 0),
      totalCents: Number(s.total_cents ?? 0),
      referrals: (refs ?? []).map((r: any) => ({
        id: r.id,
        email: emailsMap.get(r.referred_id) ?? null,
        created_at: r.created_at,
        subscribed: subscribedSet.has(r.referred_id),
      })),
      commissions: (comms ?? []).map((c: any) => ({
        id: c.id,
        amount_cents: c.amount_cents,
        status: c.status,
        created_at: c.created_at,
        paid_at: c.paid_at,
        referred_email: emailsMap.get(c.referred_id) ?? null,
      })),
    };
  });

export const savePixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pixKey: string; pixKeyType: string }) => d)
  .handler(async ({ data, context }) => {
    const key = data.pixKey.trim();
    if (key.length < 4 || key.length > 120) throw new Error("Chave Pix inválida");
    const type = ["cpf", "cnpj", "email", "phone", "random"].includes(data.pixKeyType) ? data.pixKeyType : "email";
    const { error } = await context.supabase
      .from("profiles")
      .update({ pix_key: key, pix_key_type: type })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const attachReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    if (!code || code.length < 4 || code.length > 20) return { ok: false, reason: "invalid_code" };

    // Already has a referral row? skip
    const { data: existing } = await context.supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: false, reason: "already_referred" };

    // Find referrer by code
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || (referrer as any).id === context.userId) return { ok: false, reason: "invalid_code" };

    const { error } = await context.supabase.from("referrals").insert({
      referrer_id: (referrer as any).id,
      referred_id: context.userId,
      referral_code: code,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  });

// -------------- Admin --------------

export type AdminCommission = {
  id: string;
  referrer_id: string;
  referrer_email: string | null;
  referrer_pix: string | null;
  referrer_pix_type: string | null;
  referred_email: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  paid_note: string | null;
};

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending" | "paid" | "all" }) => d)
  .handler(async ({ data, context }): Promise<AdminCommission[]> => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("affiliate_commissions")
      .select("id, referrer_id, referred_id, amount_cents, status, created_at, paid_at, paid_note")
      .order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;

    const ids = Array.from(new Set([
      ...(rows ?? []).map((r: any) => r.referrer_id),
      ...(rows ?? []).map((r: any) => r.referred_id),
    ]));
    const emailMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, pix_key, pix_key_type")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => emailMap.set(p.id, p));
    }
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      referrer_id: r.referrer_id,
      referrer_email: emailMap.get(r.referrer_id)?.email ?? null,
      referrer_pix: emailMap.get(r.referrer_id)?.pix_key ?? null,
      referrer_pix_type: emailMap.get(r.referrer_id)?.pix_key_type ?? null,
      referred_email: emailMap.get(r.referred_id)?.email ?? null,
      amount_cents: r.amount_cents,
      status: r.status,
      created_at: r.created_at,
      paid_at: r.paid_at,
      paid_note: r.paid_note,
    }));
  });

export const adminMarkCommissionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_note: data.note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
