-- O relógio compartilhado do limitador de requisições (claim_api_sports_slot)
-- só anda pra frente e nunca se autocorrige. Depois de um dia inteiro de
-- testes pesados (importação de ~100 ligas, várias rodadas de "Rodar
-- agora"), ele ficou muitos segundos (ou minutos) à frente do tempo real,
-- fazendo qualquer chamada nova — mesmo um clique isolado em "Ao vivo" —
-- ficar esperando um tempo enorme antes de disparar.
update public.api_sports_rate_limit set last_dispatch_at = now() where id = 1;
