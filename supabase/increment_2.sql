-- Linger Increment 2: memories, media, reminders, and secure storage
-- Run this file once in Supabase SQL Editor after Increment 1 is working.

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  memory_type text not null default 'thought'
    check (memory_type in ('photo', 'diary', 'thought', 'letter', 'voice', 'video')),
  occurred_at date not null,
  reminder_at timestamptz,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_owner_occurred_idx
  on public.memories(owner_id, occurred_at desc);
create index if not exists memories_owner_reminder_idx
  on public.memories(owner_id, reminder_at)
  where reminder_at is not null;

create table if not exists public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);

create index if not exists memory_media_memory_idx on public.memory_media(memory_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
before update on public.memories
for each row execute procedure public.set_updated_at();

alter table public.memories enable row level security;
alter table public.memory_media enable row level security;

drop policy if exists "Users can read their memories" on public.memories;
create policy "Users can read their memories"
on public.memories for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create their memories" on public.memories;
create policy "Users can create their memories"
on public.memories for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their memories" on public.memories;
create policy "Users can update their memories"
on public.memories for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their memories" on public.memories;
create policy "Users can delete their memories"
on public.memories for delete
using (auth.uid() = owner_id);

drop policy if exists "Users can read their memory media" on public.memory_media;
create policy "Users can read their memory media"
on public.memory_media for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create their memory media" on public.memory_media;
create policy "Users can create their memory media"
on public.memory_media for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.memories
    where memories.id = memory_id and memories.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete their memory media" on public.memory_media;
create policy "Users can delete their memory media"
on public.memory_media for delete
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their memory files" on storage.objects;
create policy "Users can view their memory files"
on storage.objects for select to authenticated
using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their memory files" on storage.objects;
create policy "Users can upload their memory files"
on storage.objects for insert to authenticated
with check (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their memory files" on storage.objects;
create policy "Users can delete their memory files"
on storage.objects for delete to authenticated
using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);
