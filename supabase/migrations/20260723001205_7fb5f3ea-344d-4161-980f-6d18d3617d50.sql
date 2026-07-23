-- Drop unused affiliate function (module removed) and revoke authenticated EXECUTE
-- from SECURITY DEFINER functions that are not used at all by end-user clients.

DROP FUNCTION IF EXISTS public.get_affiliate_stats(uuid);

-- get_pool_leaderboard is not exposed in the current UI; revoke authenticated
-- EXECUTE to minimize the SECURITY DEFINER surface.
REVOKE EXECUTE ON FUNCTION public.get_pool_leaderboard(uuid) FROM authenticated, anon, PUBLIC;