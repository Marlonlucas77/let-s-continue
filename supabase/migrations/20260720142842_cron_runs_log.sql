-- Registro de cada execução do cron (agendada ou manual via admin) —
-- permite ao painel admin mostrar quando foi a última vez que rodou,
-- quantas ligas foram processadas, e se algo deu errado, sem precisar
-- ficar testando manualmente pra saber se está tudo saudável.
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by text not null default 'schedule', -- 'schedule' | 'manual'
  processed_count integer,
  live_fixtures_updated integer,
  error text
);

create index if not exists cron_runs_started_at_idx on public.cron_runs (started_at desc);

alter table public.cron_runs enable row level security;

-- Só admin lê (é informação operacional interna, não dado de usuário).
create policy "Admins can read cron runs" on public.cron_runs
  for select using (public.has_role(auth.uid(), 'admin'));
