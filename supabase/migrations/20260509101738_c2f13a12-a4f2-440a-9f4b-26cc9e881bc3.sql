-- 1. Role enum
do $$ begin
  create type public.collab_role as enum ('owner','editor','viewer');
exception when duplicate_object then null; end $$;

-- 2. Saved maps: share link fields + realtime full row
alter table public.saved_maps
  add column if not exists share_token uuid unique default gen_random_uuid(),
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_role text not null default 'viewer'
    check (share_role in ('viewer','editor'));

alter table public.saved_maps replica identity full;

-- 3. Collaborators table
create table if not exists public.map_collaborators (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.saved_maps(id) on delete cascade,
  user_email text not null,
  role public.collab_role not null default 'viewer',
  invited_by uuid not null,
  created_at timestamptz not null default now(),
  unique (map_id, user_email)
);

create index if not exists map_collaborators_map_id_idx on public.map_collaborators(map_id);
create index if not exists map_collaborators_email_idx on public.map_collaborators(user_email);

alter table public.map_collaborators enable row level security;
alter table public.map_collaborators replica identity full;

-- 4. Helper functions (security definer to avoid RLS recursion)
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email::text from auth.users where id = auth.uid();
$$;

create or replace function public.user_can_access_map(_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.saved_maps m
    where m.id = _map_id and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.map_collaborators c
    where c.map_id = _map_id
      and lower(c.user_email) = lower(public.current_user_email())
  );
$$;

create or replace function public.user_can_edit_map(_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.saved_maps m
    where m.id = _map_id and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.map_collaborators c
    where c.map_id = _map_id
      and c.role in ('owner','editor')
      and lower(c.user_email) = lower(public.current_user_email())
  );
$$;

create or replace function public.user_owns_map(_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.saved_maps m
    where m.id = _map_id and m.user_id = auth.uid()
  );
$$;

-- 5. Saved maps policies — replace select / update with collab-aware ones
drop policy if exists saved_maps_select_own on public.saved_maps;
drop policy if exists saved_maps_update_own on public.saved_maps;

create policy "saved_maps_select_collab"
  on public.saved_maps
  for select
  using (public.user_can_access_map(id));

create policy "saved_maps_update_collab"
  on public.saved_maps
  for update
  using (public.user_can_edit_map(id));

-- 6. Collaborators policies
drop policy if exists collab_select_visible on public.map_collaborators;
drop policy if exists collab_insert_owner on public.map_collaborators;
drop policy if exists collab_update_owner on public.map_collaborators;
drop policy if exists collab_delete_owner on public.map_collaborators;

create policy "collab_select_visible"
  on public.map_collaborators
  for select
  using (public.user_can_access_map(map_id));

create policy "collab_insert_owner"
  on public.map_collaborators
  for insert
  with check (public.user_owns_map(map_id) and invited_by = auth.uid());

create policy "collab_update_owner"
  on public.map_collaborators
  for update
  using (public.user_owns_map(map_id));

create policy "collab_delete_owner"
  on public.map_collaborators
  for delete
  using (public.user_owns_map(map_id));

-- 7. Realtime
do $$ begin
  alter publication supabase_realtime add table public.saved_maps;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.map_collaborators;
exception when duplicate_object then null; end $$;