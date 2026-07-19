
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('team','league')),
  ref_id INTEGER NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);

CREATE OR REPLACE FUNCTION public.get_my_prediction_stats(_user UUID)
RETURNS TABLE(total BIGINT, correct BIGINT, accuracy DOUBLE PRECISION, last_30_correct BIGINT, last_30_total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*) FILTER (WHERE result_checked)::BIGINT AS total,
    COUNT(*) FILTER (WHERE was_correct)::BIGINT AS correct,
    CASE WHEN COUNT(*) FILTER (WHERE result_checked) > 0
      THEN (COUNT(*) FILTER (WHERE was_correct)::float / COUNT(*) FILTER (WHERE result_checked)::float) * 100
      ELSE 0 END AS accuracy,
    COUNT(*) FILTER (WHERE was_correct AND created_at > now() - interval '30 days')::BIGINT AS last_30_correct,
    COUNT(*) FILTER (WHERE result_checked AND created_at > now() - interval '30 days')::BIGINT AS last_30_total
  FROM public.predictions
  WHERE user_id = _user
$$;
