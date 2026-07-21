
CREATE OR REPLACE FUNCTION public.get_cron_secret() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = private, public AS $$
  SELECT cron_secret FROM private.cron_config WHERE id = 1
$$;

REVOKE ALL ON FUNCTION public.get_cron_secret() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO service_role;
