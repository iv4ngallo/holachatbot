-- Numérica · ajustes por usuario (Supabase)
-- Mismo proyecto y mismas cuentas que PrecIA, Organic, AgendIA y Presupuesto.
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.
-- Guarda una fila por usuario con sus sistemas de diseño importados, contenido, elementos activos y preferencias.
-- Si la tabla aún no existe, la app funciona igual y guarda solo en el navegador.

create table if not exists public.numerica_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

alter table public.numerica_docs enable row level security;

drop policy if exists "numerica: leer lo propio"   on public.numerica_docs;
drop policy if exists "numerica: crear lo propio"  on public.numerica_docs;
drop policy if exists "numerica: editar lo propio" on public.numerica_docs;
drop policy if exists "numerica: borrar lo propio" on public.numerica_docs;
create policy "numerica: leer lo propio"   on public.numerica_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "numerica: crear lo propio"  on public.numerica_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "numerica: editar lo propio" on public.numerica_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "numerica: borrar lo propio" on public.numerica_docs
  for delete to authenticated using ((select auth.uid()) = user_id);
