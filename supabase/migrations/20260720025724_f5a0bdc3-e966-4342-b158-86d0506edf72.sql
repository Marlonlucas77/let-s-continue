
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pool_leaderboard(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_prediction_stats(_user uuid)
 RETURNS TABLE(total bigint, correct bigint, accuracy double precision, last_30_correct bigint, last_30_total bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE result_checked)::BIGINT AS total,
    COUNT(*) FILTER (WHERE was_correct)::BIGINT AS correct,
    CASE WHEN COUNT(*) FILTER (WHERE result_checked) > 0
      THEN (COUNT(*) FILTER (WHERE was_correct)::float / COUNT(*) FILTER (WHERE result_checked)::float) * 100
      ELSE 0 END AS accuracy,
    COUNT(*) FILTER (WHERE was_correct AND created_at > now() - interval '30 days')::BIGINT AS last_30_correct,
    COUNT(*) FILTER (WHERE result_checked AND created_at > now() - interval '30 days')::BIGINT AS last_30_total
  FROM public.predictions
  WHERE user_id = _user AND user_id = auth.uid()
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_prediction_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_prediction_stats(uuid) TO authenticated;
