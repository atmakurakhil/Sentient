-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  focus text,
  goal text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- saved_maps
create table public.saved_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  question text not null default '',
  mode text not null default 'map',
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  strokes jsonb not null default '[]'::jsonb,
  canvas_x double precision not null default 0,
  canvas_y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.saved_maps enable row level security;
create policy "saved_maps_select_own" on public.saved_maps for select using (auth.uid() = user_id);
create policy "saved_maps_insert_own" on public.saved_maps for insert with check (auth.uid() = user_id);
create policy "saved_maps_update_own" on public.saved_maps for update using (auth.uid() = user_id);
create policy "saved_maps_delete_own" on public.saved_maps for delete using (auth.uid() = user_id);
create index saved_maps_user_id_idx on public.saved_maps (user_id, created_at desc);

-- chat_threads
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_threads enable row level security;
create policy "chat_threads_select_own" on public.chat_threads for select using (auth.uid() = user_id);
create policy "chat_threads_insert_own" on public.chat_threads for insert with check (auth.uid() = user_id);
create policy "chat_threads_update_own" on public.chat_threads for update using (auth.uid() = user_id);
create policy "chat_threads_delete_own" on public.chat_threads for delete using (auth.uid() = user_id);
create index chat_threads_user_idx on public.chat_threads (user_id, updated_at desc);

-- chat_messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "chat_messages_select_own" on public.chat_messages for select
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "chat_messages_insert_own" on public.chat_messages for insert
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "chat_messages_delete_own" on public.chat_messages for delete
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger set_saved_maps_updated_at before update on public.saved_maps
for each row execute function public.set_updated_at();
create trigger set_chat_threads_updated_at before update on public.chat_threads
for each row execute function public.set_updated_at();