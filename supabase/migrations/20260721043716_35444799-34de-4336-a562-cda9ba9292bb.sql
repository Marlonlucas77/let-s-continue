-- Destravar todas as ligas atuais para todos os usuários (permitem re-selecionar).
UPDATE public.tracked_leagues SET is_locked = false;

-- Coluna para vincular a assinatura recorrente Stripe de cada liga extra.
ALTER TABLE public.tracked_leagues
  ADD COLUMN IF NOT EXISTS extra_stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS extra_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS extra_status text;

CREATE INDEX IF NOT EXISTS tracked_leagues_extra_sub_idx
  ON public.tracked_leagues (extra_stripe_subscription_id)
  WHERE extra_stripe_subscription_id IS NOT NULL;