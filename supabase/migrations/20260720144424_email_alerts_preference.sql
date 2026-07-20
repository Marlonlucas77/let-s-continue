-- Preferência de alertas por e-mail (opt-in, desligado por padrão — não
-- manda e-mail sem a pessoa pedir) e controle de quando foi o último
-- envio, pra não mandar duas vezes no mesmo dia.
alter table public.profiles add column if not exists email_alerts_enabled boolean not null default false;
alter table public.profiles add column if not exists last_alert_sent_on date;
