-- Sky Port · suite compartida (Sky Port, Dôjo · Universo Praes, TEGC BGS)
-- Proyecto Supabase: hfmfafconyyfqfbxeqsl (el mismo de /skyport/). Pega en SQL Editor → New query.
--
-- PASO 1 (solo lectura): revisa cómo está hoy. Ejecuta estas dos consultas y compara con lo esperado.
--   select id, email, email_confirmed_at, created_at from auth.users order by created_at;
--   select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'hub_state';
--
-- PASO 2: seguridad por filas de hub_state. Solo entra quien tenga sesión; como las cuentas las crea el administrador
-- (sin registro público), "authenticated" equivale a "usuarios definidos para este proyecto".
-- Si el PASO 1 muestra otras políticas distintas a las de abajo, bórralas antes (drop policy ... on public.hub_state)
-- porque las políticas se suman: una permisiva más amplia anularía a las demás.

create table if not exists public.hub_state (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hub_state enable row level security;

drop policy if exists "skyport: leer"    on public.hub_state;
drop policy if exists "skyport: crear"   on public.hub_state;
drop policy if exists "skyport: editar"  on public.hub_state;
create policy "skyport: leer"   on public.hub_state for select to authenticated using (true);
create policy "skyport: crear"  on public.hub_state for insert to authenticated with check (true);
create policy "skyport: editar" on public.hub_state for update to authenticated using (true) with check (true);
-- Sin política de borrado: nadie puede borrar filas desde el navegador.

-- PASO 3: en el panel (no se hace con SQL)
--   Authentication → Sign In / Providers → Email: activado. "Allow new users to sign up": DESACTIVADO.
--   Authentication → Users → Add user → Create new user: correo y contraseña, con "Auto Confirm User" marcado.
--   Authentication → URL Configuration: Site URL = https://holaibague.co ; Redirect URLs = https://holaibague.co/**
--     (necesario para "Olvidé mi contraseña": sin esa URL el correo de recuperación no vuelve al sitio).
