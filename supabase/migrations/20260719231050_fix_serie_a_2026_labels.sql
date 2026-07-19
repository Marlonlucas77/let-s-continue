-- Corrige o bug de "flip-flop" de liga: antes, um time que aparecesse em
-- mais de uma competição (liga nacional + copa) tinha o rótulo trocado
-- toda vez, escondendo ele do filtro da liga principal (foi o que
-- aconteceu com o Santos, sumindo do filtro "Serie A"). O código já foi
-- corrigido pra não fazer isso mais daqui pra frente — essa migration
-- restaura o rótulo certo pros 20 clubes confirmados da Série A 2026
-- (independente de qual rótulo errado eles tenham pego antes).
update public.teams
set league = 'Brasileirão Série A'
where country ilike '%brazil%'
  and (
    name ilike 'palmeiras%' or name ilike 'flamengo%' or name ilike 'fluminense%'
    or name ilike 'bahia%' or name ilike 'sao paulo%' or name ilike 'são paulo%'
    or name ilike 'athletico paranaense%' or name ilike 'atletico-pr%'
    or name ilike 'coritiba%' or name ilike 'vasco%'
    or name ilike 'atletico-mg%' or name ilike 'atlético-mg%' or name ilike 'atletico mineiro%'
    or name ilike 'cruzeiro%' or name ilike 'mirassol%' or name ilike 'botafogo%'
    or name ilike 'internacional%' or name ilike 'vitoria%' or name ilike 'vitória%'
    or name ilike 'corinthians%' or name ilike 'bragantino%' or name ilike 'santos%'
    or name ilike 'gremio%' or name ilike 'grêmio%' or name ilike 'ceara%' or name ilike 'ceará%'
    or name ilike 'fortaleza%'
  );
