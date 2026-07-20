CREATE TABLE public.live_fixtures_cache (
  id INTEGER PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.live_fixtures_cache (id, data) VALUES (1, '[]'::jsonb);
GRANT SELECT ON public.live_fixtures_cache TO authenticated;
GRANT ALL ON public.live_fixtures_cache TO service_role;
ALTER TABLE public.live_fixtures_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read live cache" ON public.live_fixtures_cache FOR SELECT TO authenticated USING (true);