-- ReadyFlipGo · fuentes propias y preferencias por usuario (Supabase)
-- Mismo proyecto y mismas cuentas que el resto de Hola Apps.
-- Pégalo completo en Supabase → SQL Editor → New query → Run. Es seguro ejecutarlo más de una vez.

create table if not exists public.readyflipgo_docs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  json       text not null,
  updated_at timestamptz not null default now()
);

alter table public.readyflipgo_docs enable row level security;

drop policy if exists "readyflipgo: leer lo propio"   on public.readyflipgo_docs;
drop policy if exists "readyflipgo: crear lo propio"  on public.readyflipgo_docs;
drop policy if exists "readyflipgo: editar lo propio" on public.readyflipgo_docs;
drop policy if exists "readyflipgo: borrar lo propio" on public.readyflipgo_docs;
create policy "readyflipgo: leer lo propio"   on public.readyflipgo_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "readyflipgo: crear lo propio"  on public.readyflipgo_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "readyflipgo: editar lo propio" on public.readyflipgo_docs
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "readyflipgo: borrar lo propio" on public.readyflipgo_docs
  for delete to authenticated using ((select auth.uid()) = user_id);
