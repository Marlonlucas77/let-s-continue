-- Reset completo pedido pelo usuário: limpa times importados, jogos,
-- previsões salvas e ligas monitoradas, pra recomeçar do zero com o
-- código já corrigido (rótulo de liga por jogo real, sem flip-flop,
-- lista curada de ~100 ligas em vez de 1.233, Brasileirão sempre
-- garantido no cron). Depois dessa limpeza, é necessário:
--   1. Ir em Configurações e clicar em "Habilitar principais"
--   2. Clicar em "Rodar agora" (algumas vezes, pra cobrir as ~100 ligas)
-- Times/jogos aparecem conforme cada liga é processada.

-- matches e predictions têm "on delete cascade" pra teams, então apagar
-- teams já limpa as duas — mas apaga explícito por clareza/segurança.
delete from public.predictions;
delete from public.matches;
delete from public.teams;
delete from public.tracked_leagues;
