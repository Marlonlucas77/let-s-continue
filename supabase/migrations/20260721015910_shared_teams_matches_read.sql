-- Times e jogos vêm de uma API pública de futebol — não são dados
-- privados de cada usuário. Antes, cada conta só enxergava os times/jogos
-- que ELA MESMA tinha importado, o que significava: conta nova = zero
-- jogos até rodar o próprio import, mesmo que outro usuário já tivesse
-- importado exatamente a mesma liga minutos antes.
--
-- Adiciona políticas de LEITURA compartilhada — qualquer usuário logado
-- pode ler qualquer linha de teams/matches. Escrita continua restrita
-- (a política "for all" antiga cobre isso, e na prática só o cron escreve
-- de qualquer forma, usando service_role que ignora RLS). Múltiplas
-- políticas permissivas pra um mesmo comando (aqui, SELECT) se combinam
-- com OU — então isso só amplia quem pode LER, sem afrouxar quem pode
-- escrever.
create policy "Authenticated users can read all teams"
  on public.teams for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read all matches"
  on public.matches for select
  using (auth.role() = 'authenticated');
