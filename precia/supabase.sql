-- PrecIA · sistema de usuarios (Supabase)
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Es seguro ejecutarlo más de una vez.

-- 1) Perfiles: una fila por usuario registrado. Un solo rol: 'user'.
create table if not exists public.perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  email     text,
  nombre    text,
  rol       text not null default 'user' check (rol = 'user'),
  creado_en timestamptz not null default now()
);

-- 2) Datos de PrecIA: una fila por documento (meta + una por lista), separadas por usuario.
create table if not exists public.precia_docs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  doc_id     text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_id)
);

-- 3) Al registrarse alguien, se crea su perfil automáticamente.
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

-- 4) Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.perfiles    enable row level security;
alter table public.precia_docs enable row level security;

drop policy if exists "perfil: leer el propio"      on public.perfiles;
drop policy if exists "perfil: editar el propio"    on public.perfiles;
create policy "perfil: leer el propio"   on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: editar el propio" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "docs: leer los propios"    on public.precia_docs;
drop policy if exists "docs: crear los propios"   on public.precia_docs;
drop policy if exists "docs: editar los propios"  on public.precia_docs;
drop policy if exists "docs: borrar los propios"  on public.precia_docs;
create policy "docs: leer los propios"   on public.precia_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "docs: crear los propios"  on public.precia_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "docs: editar los propios" on public.precia_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "docs: borrar los propios" on public.precia_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 5) Sincronización en vivo entre dispositivos (Realtime).
do $$
begin
  alter publication supabase_realtime add table public.precia_docs;
exception when duplicate_object then null;
end $$;
