-- Organic · usuarios y datos por usuario (Supabase)
-- Para un proyecto de Supabase propio de Organic. Pégalo completo en SQL Editor → New query → Run.
-- Es seguro ejecutarlo más de una vez.

-- 1) Perfiles: una fila por usuario registrado. Un solo rol: 'user'.
create table if not exists public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  email     text,
  nombre    text,
  rol       text not null default 'user' check (rol = 'user'),
  creado_en timestamptz not null default now()
);

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

alter table public.perfiles enable row level security;
drop policy if exists "perfil: leer el propio"   on public.perfiles;
drop policy if exists "perfil: editar el propio" on public.perfiles;
create policy "perfil: leer el propio"   on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: editar el propio" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 2) Datos de Organic.
-- Una fila por seed (tipo 'seed') y una fila 'meta' por usuario (workspaces y orden).
create table if not exists public.organic_docs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tipo       text not null check (tipo in ('meta', 'seed')),
  doc_id     text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tipo, doc_id)
);

-- Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.organic_docs enable row level security;

drop policy if exists "organic: leer los propios"   on public.organic_docs;
drop policy if exists "organic: crear los propios"  on public.organic_docs;
drop policy if exists "organic: editar los propios" on public.organic_docs;
drop policy if exists "organic: borrar los propios" on public.organic_docs;
create policy "organic: leer los propios"   on public.organic_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "organic: crear los propios"  on public.organic_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "organic: editar los propios" on public.organic_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "organic: borrar los propios" on public.organic_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Sincronización en vivo entre dispositivos (Realtime).
do $$
begin
  alter publication supabase_realtime add table public.organic_docs;
exception when duplicate_object then null;
end $$;
