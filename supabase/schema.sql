-- Carpintero database schema.
--
-- Tables are prefixed `carpintero_` because the Supabase project this app
-- ships against ("ansiedad") is shared across multiple apps in development —
-- the prefix keeps this app's tables from colliding with anyone else's.
--
-- Apply with the Supabase SQL Editor, or `supabase db push` if you keep this
-- file under supabase/migrations instead.

create extension if not exists pgcrypto;

create table public.carpintero_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Proyecto sin título',
  is_public boolean not null default false,
  share_slug text unique,
  thumbnail_svg text,
  current_version_id uuid,
  is_template boolean not null default false,
  template_source text check (template_source in ('seed', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carpintero_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.carpintero_projects(id) on delete cascade,
  design_json jsonb not null,
  label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.carpintero_projects
  add constraint carpintero_projects_current_version_fk
  foreign key (current_version_id) references public.carpintero_project_versions(id) on delete set null;

create index carpintero_project_versions_project_id_idx on public.carpintero_project_versions(project_id);
create index carpintero_projects_owner_id_idx on public.carpintero_projects(owner_id);
create index carpintero_projects_share_slug_idx on public.carpintero_projects(share_slug) where share_slug is not null;

create table public.carpintero_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  thickness_mm numeric not null,
  price_per_sqm numeric,
  price_per_sheet numeric,
  sheet_width_m numeric not null default 1.83,
  sheet_height_m numeric not null default 2.44,
  currency text not null default 'CLP',
  created_at timestamptz not null default now()
);

create index carpintero_materials_owner_id_idx on public.carpintero_materials(owner_id);

create table public.carpintero_project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.carpintero_projects(id) on delete cascade,
  material_id uuid not null references public.carpintero_materials(id) on delete restrict,
  scope text not null default 'project' check (scope in ('project', 'column', 'module')),
  target_id text,
  created_at timestamptz not null default now(),
  unique (project_id, scope, target_id)
);

create table public.carpintero_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.carpintero_projects(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index carpintero_comments_project_id_idx on public.carpintero_comments(project_id);

-- Row Level Security --------------------------------------------------------

alter table public.carpintero_projects enable row level security;
alter table public.carpintero_project_versions enable row level security;
alter table public.carpintero_materials enable row level security;
alter table public.carpintero_project_materials enable row level security;
alter table public.carpintero_comments enable row level security;

-- projects: owner has full access; anyone (incl. anon) can read public projects
create policy "carpintero_projects_owner_select" on public.carpintero_projects
  for select using (auth.uid() = owner_id);

create policy "carpintero_projects_public_select" on public.carpintero_projects
  for select using (is_public = true);

create policy "carpintero_projects_owner_insert" on public.carpintero_projects
  for insert with check (auth.uid() = owner_id);

create policy "carpintero_projects_owner_update" on public.carpintero_projects
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "carpintero_projects_owner_delete" on public.carpintero_projects
  for delete using (auth.uid() = owner_id);

-- seed templates (owner_id null, is_template true) are readable by any authenticated user
create policy "carpintero_projects_seed_template_select" on public.carpintero_projects
  for select using (is_template = true and owner_id is null);

-- project_versions: readable/writable by project owner; readable by anyone if project is public
create policy "carpintero_versions_owner_all" on public.carpintero_project_versions
  for all using (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "carpintero_versions_public_select" on public.carpintero_project_versions
  for select using (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.is_public = true)
  );

-- materials: global catalog (owner_id null) readable by everyone; own materials CRUD by owner
create policy "carpintero_materials_global_select" on public.carpintero_materials
  for select using (owner_id is null);

create policy "carpintero_materials_owner_select" on public.carpintero_materials
  for select using (auth.uid() = owner_id);

create policy "carpintero_materials_owner_insert" on public.carpintero_materials
  for insert with check (auth.uid() = owner_id);

create policy "carpintero_materials_owner_update" on public.carpintero_materials
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "carpintero_materials_owner_delete" on public.carpintero_materials
  for delete using (auth.uid() = owner_id);

-- project_materials: follow project ownership; public read if project public
create policy "carpintero_project_materials_owner_all" on public.carpintero_project_materials
  for all using (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy "carpintero_project_materials_public_select" on public.carpintero_project_materials
  for select using (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and p.is_public = true)
  );

-- comments: anyone can read comments on public projects; owner can read/manage comments on own projects
create policy "carpintero_comments_public_select" on public.carpintero_comments
  for select using (
    exists (select 1 from public.carpintero_projects p where p.id = project_id and (p.is_public = true or p.owner_id = auth.uid()))
  );

create policy "carpintero_comments_authenticated_insert" on public.carpintero_comments
  for insert with check (
    auth.uid() is not null
    and author_id = auth.uid()
    and exists (select 1 from public.carpintero_projects p where p.id = project_id and (p.is_public = true or p.owner_id = auth.uid()))
  );

create policy "carpintero_comments_owner_delete" on public.carpintero_comments
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from public.carpintero_projects p where p.id = project_id and p.owner_id = auth.uid())
  );
