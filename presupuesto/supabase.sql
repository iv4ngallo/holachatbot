-- Presupuesto Personal · datos por usuario (Supabase)
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Es seguro ejecutarlo más de una vez. Usa el mismo proyecto de Supabase que PrecIA y Organic.

-- 1) Una fila por documento (meses, items, categorias y meta), separadas por usuario.
create table if not exists public.presupuesto_docs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  coleccion  text not null check (coleccion in ('meses', 'items', 'categorias', 'meta')),
  doc_id     text not null check (char_length(doc_id) between 1 and 64),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, coleccion, doc_id)
);

-- 2) Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.presupuesto_docs enable row level security;

drop policy if exists "presupuesto: leer los propios"   on public.presupuesto_docs;
drop policy if exists "presupuesto: crear los propios"  on public.presupuesto_docs;
drop policy if exists "presupuesto: editar los propios" on public.presupuesto_docs;
drop policy if exists "presupuesto: borrar los propios" on public.presupuesto_docs;

create policy "presupuesto: leer los propios"   on public.presupuesto_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "presupuesto: crear los propios"  on public.presupuesto_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "presupuesto: editar los propios" on public.presupuesto_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "presupuesto: borrar los propios" on public.presupuesto_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 3) Nadie sin sesión toca la tabla.
revoke all on public.presupuesto_docs from anon;
grant select, insert, update, delete on public.presupuesto_docs to authenticated;
