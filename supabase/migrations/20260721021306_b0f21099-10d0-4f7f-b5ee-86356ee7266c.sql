do $$
declare
  dup record;
  survivor_id uuid;
begin
  for dup in
    select lower(name) as name_lc
    from public.teams
    group by lower(name)
    having count(*) > 1
  loop
    select id into survivor_id
    from public.teams
    where lower(name) = dup.name_lc
    order by created_at asc nulls last
    limit 1;

    update public.matches set home_team_id = survivor_id
    where lower((select name from public.teams t where t.id = home_team_id)) = dup.name_lc
      and home_team_id <> survivor_id;
    update public.matches set away_team_id = survivor_id
    where lower((select name from public.teams t where t.id = away_team_id)) = dup.name_lc
      and away_team_id <> survivor_id;
    update public.predictions set home_team_id = survivor_id
    where lower((select name from public.teams t where t.id = home_team_id)) = dup.name_lc
      and home_team_id <> survivor_id;
    update public.predictions set away_team_id = survivor_id
    where lower((select name from public.teams t where t.id = away_team_id)) = dup.name_lc
      and away_team_id <> survivor_id;

    delete from public.teams
    where lower(name) = dup.name_lc and id <> survivor_id;
  end loop;
end $$;

delete from public.matches m
where m.api_fixture_id is not null
  and m.id not in (
    select distinct on (api_fixture_id) id
    from public.matches
    where api_fixture_id is not null
    order by api_fixture_id, created_at desc nulls last
  );

drop index if exists public.matches_api_fixture_id_idx;
create unique index if not exists matches_api_fixture_id_global_idx
  on public.matches (api_fixture_id) where api_fixture_id is not null;