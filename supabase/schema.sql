-- ============================================================
--  Esquema de la base de datos (Supabase / PostgreSQL)
--  Ejecute este archivo completo en:  Supabase → SQL Editor
-- ============================================================

-- ---------- 1. Perfiles y roles ----------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users on delete cascade,
  correo      text not null,
  nombre      text,
  rol         text not null default 'editor' check (rol in ('admin','editor')),
  creado_en   timestamptz not null default now()
);

comment on table public.perfiles is 'Usuarios del panel. El rol admin puede gestionar usuarios; editor solo contenido y consultas.';

-- Crea el perfil automáticamente al registrarse un usuario
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, correo, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    -- el primer usuario del sistema queda como admin
    case when (select count(*) from public.perfiles) = 0 then 'admin' else 'editor' end
  );
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Helpers de rol (evitan recursión en las políticas)
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
as $$ select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin') $$;

create or replace function public.es_staff()
returns boolean
language sql
security definer
set search_path = public
as $$ select exists (select 1 from public.perfiles where id = auth.uid()) $$;


-- ---------- 2. Contenido del sitio ----------
create table if not exists public.contenido (
  id             int primary key default 1,
  datos          jsonb not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users on delete set null,
  constraint una_sola_fila check (id = 1)
);

comment on table public.contenido is 'Documento único con todo el contenido editable del sitio (textos, colores, secciones, colecciones).';

-- Historial de versiones: permite volver atrás desde el panel
create table if not exists public.contenido_versiones (
  id         bigserial primary key,
  datos      jsonb not null,
  creado_en  timestamptz not null default now(),
  creado_por uuid references auth.users on delete set null
);

create or replace function public.guardar_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contenido_versiones (datos, creado_por)
  values (old.datos, old.actualizado_por);
  -- conserva las últimas 30 versiones
  delete from public.contenido_versiones
  where id in (
    select id from public.contenido_versiones order by id desc offset 30
  );
  return new;
end;
$$;

drop trigger if exists al_actualizar_contenido on public.contenido;
create trigger al_actualizar_contenido
  before update on public.contenido
  for each row execute function public.guardar_version();


-- ---------- 3. Consultas del formulario ----------
create table if not exists public.consultas (
  id         bigserial primary key,
  nombre     text not null,
  empresa    text,
  correo     text not null,
  telefono   text,
  necesita   text[],
  mensaje    text,
  estado     text not null default 'nueva' check (estado in ('nueva','en_proceso','cerrada')),
  leida      boolean not null default false,
  notas      text,
  origen     text,
  creado_en  timestamptz not null default now()
);

create index if not exists consultas_estado_idx on public.consultas (estado);
create index if not exists consultas_creado_idx on public.consultas (creado_en desc);

comment on table public.consultas is 'Solicitudes enviadas desde el formulario público.';


-- ---------- 4. Seguridad a nivel de fila ----------
alter table public.perfiles             enable row level security;
alter table public.contenido            enable row level security;
alter table public.contenido_versiones  enable row level security;
alter table public.consultas            enable row level security;

-- Perfiles
drop policy if exists perfiles_leer     on public.perfiles;
drop policy if exists perfiles_admin    on public.perfiles;
create policy perfiles_leer  on public.perfiles for select using (id = auth.uid() or public.es_admin());
create policy perfiles_admin on public.perfiles for all    using (public.es_admin()) with check (public.es_admin());

-- Contenido: lectura pública (el sitio es público), escritura solo del equipo
drop policy if exists contenido_publico   on public.contenido;
drop policy if exists contenido_escritura on public.contenido;
create policy contenido_publico   on public.contenido for select using (true);
create policy contenido_escritura on public.contenido for all
  using (public.es_staff()) with check (public.es_staff());

-- Versiones: solo el equipo
drop policy if exists versiones_staff on public.contenido_versiones;
create policy versiones_staff on public.contenido_versiones for all
  using (public.es_staff()) with check (public.es_staff());

-- Consultas: cualquiera puede enviar, solo el equipo puede leer y editar
drop policy if exists consultas_enviar on public.consultas;
drop policy if exists consultas_staff  on public.consultas;
drop policy if exists consultas_editar on public.consultas;
drop policy if exists consultas_borrar on public.consultas;
create policy consultas_enviar on public.consultas for insert to anon, authenticated with check (true);
create policy consultas_staff  on public.consultas for select using (public.es_staff());
create policy consultas_editar on public.consultas for update using (public.es_staff()) with check (public.es_staff());
create policy consultas_borrar on public.consultas for delete using (public.es_admin());


-- ---------- 5. Almacenamiento de imágenes ----------
insert into storage.buckets (id, name, public)
values ('medios', 'medios', true)
on conflict (id) do nothing;

drop policy if exists medios_leer    on storage.objects;
drop policy if exists medios_subir   on storage.objects;
drop policy if exists medios_borrar  on storage.objects;
create policy medios_leer   on storage.objects for select using (bucket_id = 'medios');
create policy medios_subir  on storage.objects for insert to authenticated with check (bucket_id = 'medios');
create policy medios_borrar on storage.objects for delete to authenticated using (bucket_id = 'medios');


-- ---------- 6. Fila inicial de contenido ----------
-- El panel la sobrescribe en el primer guardado. Si está vacía,
-- el sitio usa js/content-default.js como respaldo.
insert into public.contenido (id, datos)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
