-- Hola Apps · tabla de Palabritas (Supabase)
-- Mismo proyecto y mismas cuentas que las demás apps de la suite.
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.

-- Una fila por usuario con todo su avance (nivel, palabras vistas, caja de repaso, racha).
create table if not exists public.palabritas_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

-- Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.palabritas_docs enable row level security;

drop policy if exists "palabritas: leer lo propio"   on public.palabritas_docs;
drop policy if exists "palabritas: crear lo propio"  on public.palabritas_docs;
drop policy if exists "palabritas: editar lo propio" on public.palabritas_docs;
drop policy if exists "palabritas: borrar lo propio" on public.palabritas_docs;
create policy "palabritas: leer lo propio"   on public.palabritas_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "palabritas: crear lo propio"  on public.palabritas_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "palabritas: editar lo propio" on public.palabritas_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "palabritas: borrar lo propio" on public.palabritas_docs
  for delete to authenticated using ((select auth.uid()) = user_id);
