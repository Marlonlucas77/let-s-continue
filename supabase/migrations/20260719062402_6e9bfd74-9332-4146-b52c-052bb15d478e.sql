-- Adiciona coluna api_id em teams para casar times locais com fixtures da API-Sports
alter table public.teams add column if not exists api_id integer;
create index if not exists teams_user_api_id_idx on public.teams (user_id, api_id);
create unique index if not exists teams_user_api_id_unique
  on public.teams (user_id, api_id)
  where api_id is not null;

-- Adiciona colunas de acerto por mercado em predictions
alter table public.predictions add column if not exists over_under_correct boolean;
alter table public.predictions add column if not exists btts_correct boolean;
alter table public.predictions add column if not exists corners_correct boolean;
alter table public.predictions add column if not exists cards_correct boolean;