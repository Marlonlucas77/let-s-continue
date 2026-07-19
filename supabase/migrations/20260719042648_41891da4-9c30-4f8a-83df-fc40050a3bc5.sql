-- Add color column to teams
alter table public.teams add column if not exists color text;

-- Add last_run_at to tracked_leagues for cron jobs
alter table public.tracked_leagues add column if not exists last_run_at timestamp with time zone;
