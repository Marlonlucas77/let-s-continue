
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.cron_config (
  id int PRIMARY KEY DEFAULT 1,
  cron_secret text NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO private.cron_config (id, cron_secret)
VALUES (1, encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- Helper acessível apenas ao service_role (segurança definer restrita)
CREATE OR REPLACE FUNCTION private.get_cron_secret() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = private AS $$
  SELECT cron_secret FROM private.cron_config WHERE id = 1
$$;

REVOKE ALL ON FUNCTION private.get_cron_secret() FROM public, anon, authenticated;

-- Reprograma jobs existentes para enviar o header x-cron-secret
DO $$
DECLARE
  v_secret text;
  v_base text := 'https://project--63b71282-596e-4141-bace-22d3c702eecc.lovable.app/api/public/cron';
BEGIN
  SELECT cron_secret INTO v_secret FROM private.cron_config WHERE id = 1;

  -- Remove agendamentos antigos
  PERFORM cron.unschedule(jobname) FROM cron.job
  WHERE jobname IN (
    'football-fixture-refresh',
    'football-prediction-generator',
    'evaluate-predictions-nightly',
    'send-favorite-alerts-daily'
  );

  -- Importa jogos a cada hora
  PERFORM cron.schedule(
    'football-fixture-refresh', '0 * * * *',
    format($f$
      select net.http_post(
        url := '%s/refresh-fixtures',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      ) as request_id;
    $f$, v_base, v_secret)
  );

  -- Avalia previsões toda madrugada
  PERFORM cron.schedule(
    'evaluate-predictions-nightly', '0 4 * * *',
    format($f$
      select net.http_post(
        url := '%s/evaluate-predictions',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      ) as request_id;
    $f$, v_base, v_secret)
  );

  -- Envia alertas de times favoritos toda manhã (10h UTC = 7h BRT)
  PERFORM cron.schedule(
    'send-favorite-alerts-daily', '0 10 * * *',
    format($f$
      select net.http_post(
        url := '%s/send-alerts',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      ) as request_id;
    $f$, v_base, v_secret)
  );
END $$;
