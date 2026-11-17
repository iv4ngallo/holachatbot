-- Sky Port · suite compartida (Sky Port, Dôjo · Universo Praes, TEGC BGS)
-- Proyecto Supabase: hfmfafconyyfqfbxeqsl. Esquema real en producción: cada persona solo ve y edita SUS filas.
-- Clave primaria (owner_id, id); owner_id se llena solo con el usuario que escribe (auth.uid()).
-- Las apps guardan aquí: id "main" (Sky Port), "bgs" y "bgs-hechas-<usuario>" (TEGC BGS).
--
-- IMPORTANTE: no uses políticas "to authenticated using (true)": harían que todas las cuentas vean y editen todas las filas.
-- Es seguro ejecutarlo más de una vez.

create table if not exists public.hub_state (
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

alter table public.hub_state enable row level security;

drop policy if exists "dueno_lee"        on public.hub_state;
drop policy if exists "dueno_inserta"    on public.hub_state;
drop policy if exists "dueno_actualiza"  on public.hub_state;
drop policy if exists "dueno_borra"      on public.hub_state;
create policy "dueno_lee"       on public.hub_state for select to authenticated using ((select auth.uid()) = owner_id);
create policy "dueno_inserta"   on public.hub_state for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "dueno_actualiza" on public.hub_state for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "dueno_borra"     on public.hub_state for delete to authenticated using ((select auth.uid()) = owner_id);

-- En el panel (no se hace con SQL)
--   Authentication → Sign In / Providers → Email: activado. "Allow new users to sign up": DESACTIVADO.
--   Authentication → Users → Add user → Create new user: correo y contraseña, con "Auto Confirm User" marcado.
--   Authentication → URL Configuration: Site URL = https://holaibague.co ; Redirect URLs = https://holaibague.co/**
