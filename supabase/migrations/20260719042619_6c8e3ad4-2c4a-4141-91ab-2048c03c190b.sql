-- 1. Pools
create table public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default lower(substring(md5(random()::text) from 1 for 6)),
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now()
);
grant select, insert, update, delete on public.pools to authenticated;
grant all on public.pools to service_role;
alter table public.pools enable row level security;

-- 2. Pool Members
create table public.pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(pool_id, user_id)
);
grant select, insert, delete on public.pool_members to authenticated;
grant all on public.pool_members to service_role;
alter table public.pool_members enable row level security;

-- 3. Policies (applied after both tables exist)
create policy "Users can view pools they belong to" on public.pools for select using (
  auth.uid() = owner_id or 
  exists (select 1 from public.pool_members where pool_id = pools.id and user_id = auth.uid())
);
create policy "Users can create pools" on public.pools for insert with check (auth.uid() = owner_id);
create policy "Owners can update pools" on public.pools for update using (auth.uid() = owner_id);

create policy "Members can view other members in same pool" on public.pool_members for select using (
  exists (select 1 from public.pool_members m where m.pool_id = pool_members.pool_id and m.user_id = auth.uid()) or
  exists (select 1 from public.pools p where p.id = pool_members.pool_id and p.owner_id = auth.uid())
);
create policy "Users can join pools" on public.pool_members for insert with check (auth.uid() = user_id);
create policy "Users can leave pools" on public.pool_members for delete using (auth.uid() = user_id);

-- 4. Add missing columns to subscriptions
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists environment text default 'production';

-- 5. Fix Security Definer search_path
alter function public.has_role(_user_id uuid, _role app_role) set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- 6. RPCs for Leaderboards
create or replace function public.get_leaderboard(_limit int default 50)
returns table (
  user_id uuid,
  display_name text,
  total bigint,
  correct bigint,
  accuracy float
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    p.user_id,
    pr.email as display_name,
    count(*) as total,
    count(*) filter (where p.was_correct = true) as correct,
    (count(*) filter (where p.was_correct = true)::float / count(*)::float) * 100 as accuracy
  from public.predictions p
  join public.profiles pr on pr.id = p.user_id
  where p.result_checked = true
  group by p.user_id, pr.email
  order by correct desc, accuracy desc
  limit _limit;
$$;

create or replace function public.get_pool_leaderboard(_pool_id uuid)
returns table (
  user_id uuid,
  display_name text,
  total bigint,
  correct bigint,
  accuracy float
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    p.user_id,
    pr.email as display_name,
    count(*) as total,
    count(*) filter (where p.was_correct = true) as correct,
    (count(*) filter (where p.was_correct = true)::float / count(*)::float) * 100 as accuracy
  from public.predictions p
  join public.profiles pr on pr.id = p.user_id
  join public.pool_members pm on pm.user_id = p.user_id
  where p.result_checked = true and pm.pool_id = _pool_id
  group by p.user_id, pr.email
  order by correct desc, accuracy desc;
$$;
