
-- Shared rate limit
create table if not exists public.api_sports_rate_limit (
  id integer primary key default 1,
  last_dispatch_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.api_sports_rate_limit (id, last_dispatch_at)
values (1, now())
on conflict (id) do nothing;

alter table public.api_sports_rate_limit enable row level security;

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

-- Grant Elite to admin2
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = 'admin2@placarcerto.com' limit 1;
  if target_user_id is not null then
    insert into public.subscriptions (
      user_id, plan, status, price_id, payment_method,
      current_period_start, current_period_end
    )
    values (
      target_user_id, 'elite', 'active', 'elite_monthly', 'manual_grant',
      now(), now() + interval '10 years'
    );
  end if;
end $$;

-- Grant admin role
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = 'admin2@placarcerto.com' limit 1;
  if target_user_id is not null then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end $$;

-- user_roles select policy
drop policy if exists "Users read their own roles" on public.user_roles;
create policy "Users read their own roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- Prioritize tracked_leagues
alter table public.tracked_leagues add column if not exists priority integer not null default 0;

update public.tracked_leagues
set priority = 100
where league_name ilike '%premier league%'
   or league_name ilike '%la liga%'
   or league_name ilike '%serie a%'
   or league_name ilike '%bundesliga%'
   or league_name ilike '%ligue 1%'
   or league_name ilike '%brasileir%'
   or league_name ilike '%primeira liga%'
   or league_name ilike '%eredivisie%'
   or league_name ilike '%champions league%'
   or league_name ilike '%europa league%'
   or league_name ilike '%world cup%'
   or league_name ilike '%libertadores%'
   or league_name ilike '%copa america%'
   or league_name ilike '%mls%'
   or league_name ilike '%liga mx%';

update public.tracked_leagues
set last_run_at = null
where (league_name ilike '%brasileir%' or (league_name ilike '%serie a%' and country ilike '%brazil%'))
  and country ilike '%brazil%';

-- Prune to top ~100 leagues
delete from public.tracked_leagues
where not (
  league_name ilike '%premier league%' or league_name ilike '%la liga%'
  or league_name ilike '%serie a%' or league_name ilike '%bundesliga%'
  or league_name ilike '%ligue 1%' or league_name ilike '%primeira liga%'
  or league_name ilike '%eredivisie%' or league_name ilike '%pro league%'
  or league_name ilike '%premiership%' or league_name ilike '%süper lig%'
  or league_name ilike '%super lig%' or league_name ilike '%super league%'
  or league_name ilike '%superliga%' or league_name ilike '%allsvenskan%'
  or league_name ilike '%eliteserien%' or league_name ilike '%ekstraklasa%'
  or league_name ilike '%fortuna liga%' or league_name ilike '%hnl%'
  or league_name ilike '%super liga%' or league_name ilike '%liga i%'
  or league_name ilike '%nb i%' or league_name ilike '%premier liga%'
  or league_name ilike '%championship%' or league_name ilike '%segunda div%'
  or league_name ilike '%serie b%' or league_name ilike '%2. bundesliga%'
  or league_name ilike '%ligue 2%' or league_name ilike '%eerste divisie%'
  or league_name ilike '%fa cup%' or league_name ilike '%copa del rey%'
  or league_name ilike '%coppa italia%' or league_name ilike '%dfb pokal%'
  or league_name ilike '%coupe de france%' or league_name ilike '%efl cup%'
  or league_name ilike '%carabao cup%' or league_name ilike '%brasileir%'
  or league_name ilike '%liga profesional%' or league_name ilike '%primera divis%'
  or league_name ilike '%liga 1%' or league_name ilike '%mls%'
  or league_name ilike '%liga mx%' or league_name ilike '%leagues cup%'
  or league_name ilike '%j1 league%' or league_name ilike '%k league 1%'
  or league_name ilike '%chinese super league%' or league_name ilike '%saudi pro league%'
  or league_name ilike '%stars league%' or league_name ilike '%persian gulf%'
  or league_name ilike '%isl%' or league_name ilike '%a-league%'
  or league_name ilike '%uae league%' or league_name ilike '%egyptian premier league%'
  or league_name ilike '%premier soccer league%' or league_name ilike '%botola%'
  or league_name ilike '%npfl%' or league_name ilike '%copa do brasil%'
  or league_name ilike '%copa argentina%' or league_name ilike '%champions league%'
  or league_name ilike '%europa league%' or league_name ilike '%conference league%'
  or league_name ilike '%libertadores%' or league_name ilike '%sudamericana%'
  or league_name ilike '%concacaf champions%' or league_name ilike '%afc champions%'
  or league_name ilike '%caf champions league%' or league_name ilike '%world cup%'
  or league_name ilike '%nations league%' or league_name ilike '%euro championship%'
  or league_name ilike '%copa america%' or league_name ilike '%copa américa%'
  or league_name ilike '%africa cup of nations%' or league_name ilike '%asian cup%'
  or league_name ilike '%gold cup%'
);
