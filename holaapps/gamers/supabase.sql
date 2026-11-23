-- Hola Gamers · vínculo con Steam y biblioteca de juegos (Supabase)
-- Usa el mismo proyecto y los mismos usuarios que el resto de Hola Apps (tabla auth.users).
-- Es seguro ejecutarlo más de una vez. La función "steam-link" escribe con la llave de servicio;
-- el navegador solo puede leer lo propio y editar la biblioteca manual.

-- 1) Cuenta de Steam vinculada: una por usuario, y cada Steam ID solo en un usuario.
create table if not exists public.gamers_steam (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  steam_id       text not null unique,
  persona        text,
  avatar         text,
  vinculado_en   timestamptz not null default now(),
  sincronizado_en timestamptz
);

-- 2) Biblioteca importada (Steam) o agregada a mano (manual).
create table if not exists public.gamers_biblioteca (
  user_id    uuid not null references auth.users (id) on delete cascade,
  plataforma text not null check (plataforma in ('steam', 'manual')),
  app_id     text not null,
  nombre     text not null,
  minutos    integer not null default 0 check (minutos >= 0),
  ultima_vez timestamptz,
  creado_en  timestamptz not null default now(),
  primary key (user_id, plataforma, app_id)
);

alter table public.gamers_steam enable row level security;
alter table public.gamers_biblioteca enable row level security;

drop policy if exists "steam: leer el propio"      on public.gamers_steam;
drop policy if exists "steam: desvincular el propio" on public.gamers_steam;
create policy "steam: leer el propio" on public.gamers_steam
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "steam: desvincular el propio" on public.gamers_steam
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "biblioteca: leer la propia"    on public.gamers_biblioteca;
drop policy if exists "biblioteca: agregar manual"    on public.gamers_biblioteca;
drop policy if exists "biblioteca: quitar la propia"  on public.gamers_biblioteca;
create policy "biblioteca: leer la propia" on public.gamers_biblioteca
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "biblioteca: agregar manual" on public.gamers_biblioteca
  for insert to authenticated
  with check ((select auth.uid()) = user_id and plataforma = 'manual');
create policy "biblioteca: quitar la propia" on public.gamers_biblioteca
  for delete to authenticated using ((select auth.uid()) = user_id);
