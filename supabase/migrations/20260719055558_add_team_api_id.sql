-- Corrige integração "Jogos ao vivo" <-> histórico local:
-- o código já referenciava teams.api_id (para casar fixtures da API-Sports
-- com os times importados) mas a coluna nunca foi criada.
alter table public.teams add column if not exists api_id integer;

-- Acelera o lookup por api_id feito a cada carregamento da lista de jogos.
create index if not exists teams_user_api_id_idx on public.teams (user_id, api_id);

-- Evita times duplicados do mesmo time da API-Sports para o mesmo usuário.
create unique index if not exists teams_user_api_id_unique
  on public.teams (user_id, api_id)
  where api_id is not null;
