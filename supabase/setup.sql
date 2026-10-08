-- Execute uma vez no SQL Editor de um projeto Supabase dedicado ao RetroVaultPS2.
-- Não contém senhas nem chaves. Pode ser executado novamente sem apagar dados.
create table if not exists public.retrovault_state (
  key text primary key check (key in ('catalog', 'admin')),
  value jsonb not null
);
alter table public.retrovault_state enable row level security;
revoke all on public.retrovault_state from public, anon, authenticated;
grant select, insert, update, delete on public.retrovault_state to service_role;
-- Sem políticas públicas: somente o backend com secret key lê ou escreve.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retrovault-covers', 'retrovault-covers', true, 3000000,
  array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Bucket público somente para leitura das capas.
-- Nenhuma política de envio anônimo é criada. Upload passa pelo admin do servidor.
