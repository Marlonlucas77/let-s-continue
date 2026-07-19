-- Hoje só existe "was_correct" (acerto do vencedor 1x2). Para dar "taxa de
-- acertos" por mercado (over/under, BTTS, escanteios, cartões), como pedido,
-- precisamos guardar o resultado de cada mercado separadamente.
alter table public.predictions add column if not exists over_under_correct boolean;
alter table public.predictions add column if not exists btts_correct boolean;
alter table public.predictions add column if not exists corners_correct boolean;
alter table public.predictions add column if not exists cards_correct boolean;
