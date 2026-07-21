// Autenticação dos endpoints de cron.
// O segredo é gerado e guardado no schema `private` (ver migration
// dos cron jobs), acessível apenas ao service_role. O agendador do
// próprio banco (pg_cron) envia o valor no header `x-cron-secret`, e
// aqui a gente valida contra o valor guardado no banco.
//
// Aceita também o env var CRON_SECRET, se algum dia alguém quiser
// disparar manualmente ou usar um agendador externo.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

let cachedDbSecret: string | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function getDbSecret(): Promise<string | null> {
  if (cachedDbSecret && Date.now() - cachedAt < TTL_MS) return cachedDbSecret;
  const { data } = await supabaseAdmin
    .from("cron_config" as any)
    .select("cron_secret")
    .eq("id", 1)
    .maybeSingle();
  const value = (data as any)?.cron_secret ?? null;
  if (value) {
    cachedDbSecret = value;
    cachedAt = Date.now();
  }
  return value;
}

export async function isAuthorizedCron(request: Request): Promise<boolean> {
  const header = request.headers.get("x-cron-secret");
  if (!header) return false;
  const envSecret = process.env.CRON_SECRET;
  if (envSecret && header === envSecret) return true;
  const dbSecret = await getDbSecret();
  return !!dbSecret && header === dbSecret;
}
