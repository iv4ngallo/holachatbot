-- Hola Apps · avatares de las cuentas (Supabase Storage)
-- Crea el bucket público «avatars»; cada usuario solo puede subir, cambiar y borrar archivos dentro de su carpeta (<id de usuario>/...).
-- Es seguro ejecutarlo más de una vez.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: ver los propios"    on storage.objects;
drop policy if exists "avatars: subir los propios"  on storage.objects;
drop policy if exists "avatars: editar los propios" on storage.objects;
drop policy if exists "avatars: borrar los propios" on storage.objects;

create policy "avatars: ver los propios" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: subir los propios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: editar los propios" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: borrar los propios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
