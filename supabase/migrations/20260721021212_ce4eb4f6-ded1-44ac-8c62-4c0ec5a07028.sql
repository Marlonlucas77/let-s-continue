DROP POLICY IF EXISTS "Authenticated users can read all teams" ON public.teams;
CREATE POLICY "Authenticated users can read all teams" ON public.teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read all matches" ON public.matches;
CREATE POLICY "Authenticated users can read all matches" ON public.matches FOR SELECT TO authenticated USING (true);