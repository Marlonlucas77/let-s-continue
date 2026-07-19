-- Concede o cargo de admin (acesso ao painel /admin) pra
-- admin2@placarcerto.com. Só insere se a conta já existir.
do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where email = 'admin2@placarcerto.com'
  limit 1;

  if target_user_id is not null then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end $$;
