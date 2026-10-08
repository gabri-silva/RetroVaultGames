-- Atualização do chat. Execute no SQL Editor do seu projeto Supabase.
-- Preserva os cadastros, credenciais e capas existentes.
create table if not exists public.retrovault_chat (
  id uuid primary key,
  user_id uuid not null,
  nick text not null check (char_length(nick) between 3 and 20),
  color text not null check (color ~ '^#[a-fA-F0-9]{6}$'),
  text text not null check (char_length(text) between 25 and 500),
  created_at timestamptz not null default now()
);
create index if not exists retrovault_chat_created_at_idx on public.retrovault_chat (created_at desc);
alter table public.retrovault_chat enable row level security;
revoke all on public.retrovault_chat from public, anon, authenticated;
grant select, insert, delete on public.retrovault_chat to service_role;
-- Leitura e envio passam pelo servidor; nenhuma permissão direta ao navegador.
