
-- predictions
DROP POLICY IF EXISTS "Users manage their own predictions" ON public.predictions;
CREATE POLICY "Users manage their own predictions" ON public.predictions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- tracked_leagues
DROP POLICY IF EXISTS "Users manage their own tracked leagues" ON public.tracked_leagues;
CREATE POLICY "Users manage their own tracked leagues" ON public.tracked_leagues
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- pools
DROP POLICY IF EXISTS "Owners can update pools" ON public.pools;
CREATE POLICY "Owners can update pools" ON public.pools
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- fixture_analysis_cache (admin)
DROP POLICY IF EXISTS "Admins manage cache" ON public.fixture_analysis_cache;
CREATE POLICY "Admins manage cache" ON public.fixture_analysis_cache
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
