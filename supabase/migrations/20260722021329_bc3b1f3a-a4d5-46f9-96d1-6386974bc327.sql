
-- Revoke public execute on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_pool_leaderboard(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_api_sports_slot(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_affiliate_stats(uuid) FROM PUBLIC, anon;

-- Grant back to authenticated only where user-callable
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pool_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_affiliate_stats(uuid) TO authenticated;
