ALTER TABLE public.tracked_leagues
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_paid_extra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

UPDATE public.tracked_leagues SET is_locked = true WHERE is_locked IS DISTINCT FROM true;

CREATE UNIQUE INDEX IF NOT EXISTS tracked_leagues_stripe_session_idx
  ON public.tracked_leagues(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;