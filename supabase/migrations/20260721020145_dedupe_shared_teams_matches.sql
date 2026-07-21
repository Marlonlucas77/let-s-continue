-- Antes dessa correção, cada conta importava seus próprios times/jogos
-- de forma isolada — se duas contas habilitassem a mesma liga, o mesmo
-- time real (ex: Palmeiras) virava duas linhas diferentes em `teams`,
-- uma por conta. Essa migration:
--   1. Deduplica times com o mesmo nome, reaponta as referências em
--      matches/predictions pro time "sobrevivente" antes de apagar as
--      duplicatas.
--   2. Deduplica jogos com o mesmo api_fixture_id.
--   3. Troca os índices únicos de "por usuário" pra globais, pra não
--      duplicar de novo daqui pra frente.

-- 1. Deduplicar times por nome (mantém o mais antigo como "sobrevivente")
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

-- 2. Deduplicar jogos por api_fixture_id (mantém o mais recente)
delete from public.matches m
where m.api_fixture_id is not null
  and m.id not in (
    select distinct on (api_fixture_id) id
    from public.matches
    where api_fixture_id is not null
    order by api_fixture_id, created_at desc nulls last
  );

-- 3. Índices únicos globais (não mais por usuário)
drop index if exists public.matches_api_fixture_id_idx;
create unique index if not exists matches_api_fixture_id_global_idx
  on public.matches (api_fixture_id) where api_fixture_id is not null;
