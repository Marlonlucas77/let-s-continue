-- user_roles tinha RLS habilitado mas nenhuma política de leitura —
-- sem policy, ninguém consegue ler nem o próprio cargo, o que quebra
-- silenciosamente a checagem "sou admin?" (sempre volta vazio).
create policy "Users read their own roles" on public.user_roles
  for select using (auth.uid() = user_id);
