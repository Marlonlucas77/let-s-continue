-- O app roda em múltiplas instâncias de servidor (Cloudflare Workers). Um
-- throttle guardado só em memória (variável JS) não protege de verdade,
-- porque cada instância tem sua própria cópia da variável — instâncias
-- diferentes podem disparar chamadas à API-Sports ao mesmo tempo sem saber
-- uma da outra, estourando o limite por minuto mesmo com o throttle "ativo".
--
-- Esta tabela vira o relógio compartilhado: cada chamada "reserva" o
-- próximo horário disponível de forma atômica (uma linha, uma trava de
-- linha por UPDATE), garantindo espaçamento real entre chamadas não
-- importa quantas instâncias do servidor estejam rodando ao mesmo tempo.
create table if not exists public.api_sports_rate_limit (
  id integer primary key default 1,
  last_dispatch_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.api_sports_rate_limit (id, last_dispatch_at)
values (1, now())
on conflict (id) do nothing;

alter table public.api_sports_rate_limit enable row level security;
-- Sem policies: só acessível via service_role (bypassa RLS), que é como o
-- servidor chama essa função. Nenhum usuário final acessa isso direto.

create or replace function public.claim_api_sports_slot(min_interval_ms integer)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.api_sports_rate_limit
  set last_dispatch_at = greatest(last_dispatch_at + (min_interval_ms || ' milliseconds')::interval, now())
  where id = 1
  returning last_dispatch_at;
$$;

revoke all on function public.claim_api_sports_slot(integer) from public, anon, authenticated;
grant execute on function public.claim_api_sports_slot(integer) to service_role;
