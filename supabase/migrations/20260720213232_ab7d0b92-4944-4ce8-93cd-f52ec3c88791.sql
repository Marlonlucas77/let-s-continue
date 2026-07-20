
-- fixture_analysis_cache: restrict read to authenticated users only
DROP POLICY IF EXISTS "All users can view analysis cache" ON public.fixture_analysis_cache;
REVOKE SELECT ON public.fixture_analysis_cache FROM anon;
GRANT SELECT ON public.fixture_analysis_cache TO authenticated;
CREATE POLICY "Authenticated users can view analysis cache"
  ON public.fixture_analysis_cache FOR SELECT
  TO authenticated USING (true);

-- live_fixtures_cache: keep authenticated-only reads but make explicit
DROP POLICY IF EXISTS "Authenticated can read live cache" ON public.live_fixtures_cache;
REVOKE SELECT ON public.live_fixtures_cache FROM anon, PUBLIC;
GRANT SELECT ON public.live_fixtures_cache TO authenticated;
CREATE POLICY "Authenticated users can read live cache"
  ON public.live_fixtures_cache FOR SELECT
  TO authenticated USING (true);

-- api_sports_rate_limit: explicit service_role-only policy; force RLS
REVOKE ALL ON public.api_sports_rate_limit FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.api_sports_rate_limit TO service_role;
ALTER TABLE public.api_sports_rate_limit FORCE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages rate limit"
  ON public.api_sports_rate_limit FOR ALL
  TO service_role USING (true) WITH CHECK (true);
