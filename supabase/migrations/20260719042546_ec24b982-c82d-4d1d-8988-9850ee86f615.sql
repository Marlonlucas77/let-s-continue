-- 1. Enums
create type public.app_role as enum ('admin', 'moderator', 'user');

-- 2. Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamp with time zone default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- 3. User Roles
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- Security definer function for roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- 4. Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  logo_url text,
  league text,
  country text,
  created_at timestamp with time zone default now()
);
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
create policy "Users manage their own teams" on public.teams for all using (auth.uid() = user_id);

-- 5. Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  home_team_id uuid references public.teams(id) on delete cascade,
  away_team_id uuid references public.teams(id) on delete cascade,
  match_date date not null,
  home_goals integer default 0,
  away_goals integer default 0,
  home_goals_ht integer default 0,
  away_goals_ht integer default 0,
  home_corners integer default 0,
  away_corners integer default 0,
  home_yellow integer default 0,
  away_yellow integer default 0,
  home_red integer default 0,
  away_red integer default 0,
  created_at timestamp with time zone default now()
);
grant select, insert, update, delete on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "Users manage their own matches" on public.matches for all using (auth.uid() = user_id);

-- 6. Tracked Leagues
create table public.tracked_leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  league_id integer not null,
  season integer not null,
  league_name text not null,
  country text,
  include_stats boolean default false,
  created_at timestamp with time zone default now(),
  unique (user_id, league_id, season)
);
grant select, insert, update, delete on public.tracked_leagues to authenticated;
grant all on public.tracked_leagues to service_role;
alter table public.tracked_leagues enable row level security;
create policy "Users manage their own tracked leagues" on public.tracked_leagues for all using (auth.uid() = user_id);

-- 7. Predictions
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  home_team_id uuid references public.teams(id) on delete cascade,
  away_team_id uuid references public.teams(id) on delete cascade,
  predicted_data jsonb not null,
  result_checked boolean default false,
  was_correct boolean,
  created_at timestamp with time zone default now()
);
grant select, insert, update, delete on public.predictions to authenticated;
grant all on public.predictions to service_role;
alter table public.predictions enable row level security;
create policy "Users manage their own predictions" on public.predictions for all using (auth.uid() = user_id);

-- 8. Fixture Analysis Cache
create table public.fixture_analysis_cache (
  fixture_id integer primary key,
  home_id integer,
  away_id integer,
  analysis jsonb,
  ai_summary text,
  updated_at timestamp with time zone default now()
);
grant select on public.fixture_analysis_cache to authenticated;
grant all on public.fixture_analysis_cache to service_role;
alter table public.fixture_analysis_cache enable row level security;
create policy "All users can view analysis cache" on public.fixture_analysis_cache for select using (true);
create policy "Admins can manage analysis cache" on public.fixture_analysis_cache for all using (public.has_role(auth.uid(), 'admin'));

-- 9. Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null,
  status text not null,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users view their own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- Profiles sync trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
