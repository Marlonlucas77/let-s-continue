create table public.ai_prediction_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.ai_prediction_usage to authenticated;
grant all on public.ai_prediction_usage to service_role;
alter table public.ai_prediction_usage enable row level security;
create policy "own usage select" on public.ai_prediction_usage for select using (auth.uid() = user_id);
create policy "own usage insert" on public.ai_prediction_usage for insert with check (auth.uid() = user_id);
create index idx_ai_usage_user_created on public.ai_prediction_usage(user_id, created_at desc);