-- Hola Apps · tabla de EconomIA (Supabase)
-- Mismo proyecto y mismas cuentas que las demás apps de la suite.
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.

-- Una fila por usuario con todo su avance (módulos vistos, repaso, laboratorio de bolsa).
create table if not exists public.economia_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

-- Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.economia_docs enable row level security;

drop policy if exists "economia: leer lo propio"   on public.economia_docs;
drop policy if exists "economia: crear lo propio"  on public.economia_docs;
drop policy if exists "economia: editar lo propio" on public.economia_docs;
drop policy if exists "economia: borrar lo propio" on public.economia_docs;
create policy "economia: leer lo propio"   on public.economia_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "economia: crear lo propio"  on public.economia_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "economia: editar lo propio" on public.economia_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "economia: borrar lo propio" on public.economia_docs
  for delete to authenticated using ((select auth.uid()) = user_id);
