
-- Indices
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON public.matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_league_name ON public.matches(league_name);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON public.matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_leagues_user_id ON public.tracked_leagues(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_leagues_league_id ON public.tracked_leagues(league_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_api_id ON public.teams(api_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_user ON public.pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON public.pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_fixture_cache_updated ON public.fixture_analysis_cache(updated_at);

-- Remove policies obsoletas antes de remover a coluna
DROP POLICY IF EXISTS "Users manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users manage their own teams" ON public.teams;

ALTER TABLE public.matches DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.teams DROP COLUMN IF EXISTS user_id;
