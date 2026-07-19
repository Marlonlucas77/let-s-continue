-- Concede o plano Elite (o mais alto) pra conta admin2@placarcerto.com.
-- Só insere se esse usuário já existir (precisa ter criado conta no app
-- primeiro) — não cria a conta sozinho.
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where email = 'admin2@placarcerto.com'
  limit 1;

  if target_user_id is not null then
    insert into public.subscriptions (
      user_id, plan, status, price_id, payment_method,
      current_period_start, current_period_end
    )
    values (
      target_user_id, 'elite', 'active', 'elite_monthly', 'manual_grant',
      now(), now() + interval '10 years'
    );
  end if;
end $$;
