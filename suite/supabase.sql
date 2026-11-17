-- Hola Chatbot · tablas de AgendIA y Hábitos Atómicos (Supabase)
-- Mismo proyecto y mismas cuentas que PrecIA y Organic (perfiles ya existe).
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.

-- Una fila por usuario con todo su estado de la app.
create table if not exists public.agendia_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.habitos_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

-- Seguridad por filas (RLS): cada usuario solo ve y modifica lo suyo.
alter table public.agendia_docs enable row level security;
alter table public.habitos_docs enable row level security;

drop policy if exists "agendia: leer lo propio"   on public.agendia_docs;
drop policy if exists "agendia: crear lo propio"  on public.agendia_docs;
drop policy if exists "agendia: editar lo propio" on public.agendia_docs;
drop policy if exists "agendia: borrar lo propio" on public.agendia_docs;
create policy "agendia: leer lo propio"   on public.agendia_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "agendia: crear lo propio"  on public.agendia_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "agendia: editar lo propio" on public.agendia_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "agendia: borrar lo propio" on public.agendia_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "habitos: leer lo propio"   on public.habitos_docs;
drop policy if exists "habitos: crear lo propio"  on public.habitos_docs;
drop policy if exists "habitos: editar lo propio" on public.habitos_docs;
drop policy if exists "habitos: borrar lo propio" on public.habitos_docs;
create policy "habitos: leer lo propio"   on public.habitos_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "habitos: crear lo propio"  on public.habitos_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "habitos: editar lo propio" on public.habitos_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habitos: borrar lo propio" on public.habitos_docs
  for delete to authenticated using ((select auth.uid()) = user_id);
