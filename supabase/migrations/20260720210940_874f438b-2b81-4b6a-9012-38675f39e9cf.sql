alter table public.matches add column if not exists kickoff_at timestamptz;
alter table public.matches add column if not exists status text;
alter table public.matches add column if not exists api_fixture_id integer;
alter table public.matches add column if not exists league_name text;
alter table public.matches add column if not exists country text;
create index if not exists matches_kickoff_at_idx on public.matches (user_id, kickoff_at);
create unique index if not exists matches_api_fixture_id_idx on public.matches (user_id, api_fixture_id) where api_fixture_id is not null;