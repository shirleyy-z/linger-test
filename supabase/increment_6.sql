-- Linger Increment 6: collaborative collections, multi-collection memories,
-- AI event groups, resurfacing history, and Wrapped foundations.
-- Run once after increment_5.sql.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8)),
  cover_emoji text not null default '📖' check (char_length(cover_emoji) <= 16),
  paper_style text not null default 'garden',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_members (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create table if not exists public.collection_memories (
  collection_id uuid not null references public.collections(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, memory_id)
);

create table if not exists public.collection_events (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 1200),
  theme text not null default '' check (char_length(theme) <= 120),
  suggested_stickers text[] not null default '{}',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_memories (
  event_id uuid not null references public.collection_events(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  primary key (event_id, memory_id)
);

create table if not exists public.resurfacing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  surfaced_at timestamptz not null default now(),
  reason text not null default 'nostalgia'
);

create index if not exists collection_members_user_idx on public.collection_members(user_id, joined_at desc);
create index if not exists collection_memories_memory_idx on public.collection_memories(memory_id, added_at desc);
create index if not exists collection_memories_collection_idx on public.collection_memories(collection_id, added_at desc);
create index if not exists collection_events_collection_idx on public.collection_events(collection_id, start_date desc);
create index if not exists resurfacing_user_idx on public.resurfacing_history(user_id, surfaced_at desc);

create or replace function public.is_collection_member(target_collection uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.collection_members where collection_id = target_collection and user_id = auth.uid()); $$;

create or replace function public.is_collection_owner(target_collection uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.collection_members where collection_id = target_collection and user_id = auth.uid() and role = 'owner'); $$;

create or replace function public.add_collection_owner()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.collection_members(collection_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists collections_add_owner on public.collections;
create trigger collections_add_owner after insert on public.collections for each row execute procedure public.add_collection_owner();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections for each row execute procedure public.set_updated_at();
drop trigger if exists collection_events_set_updated_at on public.collection_events;
create trigger collection_events_set_updated_at before update on public.collection_events for each row execute procedure public.set_updated_at();

create or replace function public.join_collection_by_code(code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_id uuid;
begin
  select id into target_id from public.collections where invite_code = upper(trim(code));
  if target_id is null then raise exception 'Invite code not found'; end if;
  insert into public.collection_members(collection_id, user_id, role) values(target_id, auth.uid(), 'member') on conflict do nothing;
  return target_id;
end; $$;
grant execute on function public.join_collection_by_code(text) to authenticated;

alter table public.collections enable row level security;
alter table public.collection_members enable row level security;
alter table public.collection_memories enable row level security;
alter table public.collection_events enable row level security;
alter table public.event_memories enable row level security;
alter table public.resurfacing_history enable row level security;

create policy "Members read collections" on public.collections for select using (public.is_collection_member(id));
create policy "Users create collections" on public.collections for insert with check (auth.uid() = owner_id);
create policy "Owners update collections" on public.collections for update using (public.is_collection_owner(id)) with check (public.is_collection_owner(id));
create policy "Owners delete collections" on public.collections for delete using (public.is_collection_owner(id));

create policy "Members read membership" on public.collection_members for select using (public.is_collection_member(collection_id));
create policy "Members can leave" on public.collection_members for delete using (auth.uid() = user_id and role <> 'owner');

create policy "Members read collection memories" on public.collection_memories for select using (public.is_collection_member(collection_id));
create policy "Members add owned memories" on public.collection_memories for insert with check (
  public.is_collection_member(collection_id) and auth.uid() = added_by and
  exists(select 1 from public.memories m where m.id = memory_id and m.owner_id = auth.uid())
);
create policy "Members remove own memory links" on public.collection_memories for delete using (
  public.is_collection_member(collection_id) and
  (added_by = auth.uid() or public.is_collection_owner(collection_id))
);

-- Owners retain normal access; collection members may also read memories shared into their collections.
drop policy if exists "Users can read their memories" on public.memories;
create policy "Users read owned or shared memories" on public.memories for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.collection_memories cm
    where cm.memory_id = memories.id and public.is_collection_member(cm.collection_id)
  )
);

drop policy if exists "Users can read their memory media" on public.memory_media;
create policy "Users read owned or shared memory media" on public.memory_media for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.collection_memories cm
    where cm.memory_id = memory_media.memory_id and public.is_collection_member(cm.collection_id)
  )
);

create policy "Members read events" on public.collection_events for select using (public.is_collection_member(collection_id));
create policy "Members create events" on public.collection_events for insert with check (public.is_collection_member(collection_id) and auth.uid() = created_by);
create policy "Members update events" on public.collection_events for update using (public.is_collection_member(collection_id));
create policy "Members delete events" on public.collection_events for delete using (public.is_collection_member(collection_id));

create policy "Members read event memories" on public.event_memories for select using (
  exists(select 1 from public.collection_events e where e.id = event_id and public.is_collection_member(e.collection_id))
);
create policy "Members add event memories" on public.event_memories for insert with check (
  exists(select 1 from public.collection_events e where e.id = event_id and public.is_collection_member(e.collection_id))
);
create policy "Members remove event memories" on public.event_memories for delete using (
  exists(select 1 from public.collection_events e where e.id = event_id and public.is_collection_member(e.collection_id))
);

create policy "Users read resurfacing history" on public.resurfacing_history for select using (auth.uid() = user_id);
create policy "Users create resurfacing history" on public.resurfacing_history for insert with check (auth.uid() = user_id);

-- Shared collection members need signed URL access to the owner's private files.
drop policy if exists "Collection members can view shared memory files" on storage.objects;
create policy "Collection members can view shared memory files" on storage.objects for select to authenticated
using (
  bucket_id = 'memories' and exists (
    select 1 from public.memory_media mm
    join public.collection_memories cm on cm.memory_id = mm.memory_id
    where mm.storage_path = name and public.is_collection_member(cm.collection_id)
  )
);
