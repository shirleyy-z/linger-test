-- Linger Increment 7: attribute shared memories to their author within collections.
-- Run once after increment_6.sql.

-- The app resolves authors via a separate query (see src/lib/authors.ts), not a PostgREST
-- embed, so no new foreign key is required here — only wider read access on profiles.
-- Previously only auth.uid() = id could read a profile, which silently hid co-members' display
-- names/avatars. Widen read access to people who share a collection.
drop policy if exists "Collection co-members can read profiles" on public.profiles;
create policy "Collection co-members can read profiles" on public.profiles for select using (
  auth.uid() = id or exists (
    select 1 from public.collection_members mine
    join public.collection_members theirs on theirs.collection_id = mine.collection_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
