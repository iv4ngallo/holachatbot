-- Organic · datos por usuario (Supabase)
-- Usa el mismo proyecto y las mismas cuentas que PrecIA (tabla perfiles y trigger ya creados con precia/supabase.sql).
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.

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
