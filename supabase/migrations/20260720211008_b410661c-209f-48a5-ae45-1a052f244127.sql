create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  triggered_by text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  success boolean,
  error text,
  details jsonb
);
grant all on public.cron_runs to service_role;
alter table public.cron_runs enable row level security;
create policy "service role only" on public.cron_runs for all to service_role using (true) with check (true);

alter table public.profiles add column if not exists email_alerts_enabled boolean not null default false;
alter table public.profiles add column if not exists last_alert_sent_on date;