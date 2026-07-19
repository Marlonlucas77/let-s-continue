-- Com 1.233+ ligas habilitadas, a fila do cron processava em ordem
-- essencialmente arbitrária — uma liga popular como o Brasileirão podia
-- ficar esperando atrás de centenas de campeonatos obscuros. Adiciona uma
-- prioridade pra ligas conhecidas serem processadas primeiro.
alter table public.tracked_leagues add column if not exists priority integer not null default 0;

-- Prioriza as principais ligas do mundo (mesmo critério da lista curada
-- usada no import em massa) — essas processam antes das demais.
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

-- Força o Brasileirão especificamente pra virar elegível já na próxima
-- execução do cron, independente de quando rodou pela última vez —
-- resolve o caso concreto do Santos sumido da lista local.
update public.tracked_leagues
set last_run_at = null
where (league_name ilike '%brasileir%' or (league_name ilike '%serie a%' and country ilike '%brazil%'))
  and country ilike '%brazil%';
