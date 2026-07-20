-- Guarda o resultado da última busca de jogos ao vivo, atualizada em
-- segundo plano pelo cron (não quando o usuário abre a tela). Isso tira
-- a tela "Ao vivo" da dependência de a API externa responder na hora do
-- clique — ela só lê o que já está salvo, rápido e sem risco de erro de
-- limite de requisições no momento em que a pessoa está usando o app.
create table if not exists public.live_fixtures_cache (
  id integer primary key default 1,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.live_fixtures_cache (id, data, updated_at)
values (1, '[]'::jsonb, now())
on conflict (id) do nothing;

alter table public.live_fixtures_cache enable row level security;

-- Qualquer usuário logado pode ler (não é dado pessoal, é o placar
-- público dos jogos em andamento). Só o servidor (service_role) escreve.
create policy "Authenticated users can read live cache"
  on public.live_fixtures_cache for select
  using (auth.role() = 'authenticated');
