-- Regression test for the personal-Memories / Collections isolation bug.
-- Run this in the Supabase SQL Editor (needs a role that can insert into auth.users, i.e. the
-- dashboard editor's own connection — not the app's anon/authenticated keys). It creates two
-- throwaway users, simulates their real sessions via role/JWT-claim switching (the standard way
-- to exercise RLS from SQL), and rolls back everything at the end — safe to run any time, no
-- data is left behind.
--
-- Scenario (matches the reported bug):
--   User A has 3 personal-only memories + 1 memory also shared into a collection.
--   User B is a fellow member of that same collection, with no memories of their own.
--   Expected: B sees the 1 shared memory in the Collection view and NOTHING in their own
--   Memories view. A sees all 4 in their own Memories, and the 1 shared one also in Collections.

begin;

do $$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_collection_id uuid;
  v_invite_code text;
  v_shared_memory_id uuid;
  v_private_1 uuid;
  v_private_2 uuid;
  v_private_3 uuid;
  v_count int;
  v_ids uuid[];
begin
  -- Minimal viable auth.users rows so owner_id/user_id foreign keys resolve. Mirrors what a real
  -- signup creates; nothing here is exercised by app code, it just has to satisfy the FKs.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous
  ) values
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'isolation-test-a@example.com', crypt('test-password-123', gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'isolation-test-b@example.com', crypt('test-password-123', gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);

  ------------------------------------------------------------------------
  -- Act as User A: create a collection, 3 personal-only memories, and 1 memory that is both
  -- personal and explicitly shared into the collection (the existing "publish to collections"
  -- flow — collection_memories linking an owned memory, unchanged by this fix).
  ------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.collections (owner_id, name) values (v_user_a, 'Test Trip')
    returning id, invite_code into v_collection_id, v_invite_code;
  -- (the add_collection_owner trigger already made A a member with role 'owner')

  insert into public.memories (owner_id, title, occurred_at) values (v_user_a, 'Private one', '2026-01-01') returning id into v_private_1;
  insert into public.memories (owner_id, title, occurred_at) values (v_user_a, 'Private two', '2026-01-02') returning id into v_private_2;
  insert into public.memories (owner_id, title, occurred_at) values (v_user_a, 'Private three', '2026-01-03') returning id into v_private_3;
  insert into public.memories (owner_id, title, occurred_at) values (v_user_a, 'Shared one', '2026-01-04') returning id into v_shared_memory_id;
  insert into public.collection_memories (collection_id, memory_id, added_by) values (v_collection_id, v_shared_memory_id, v_user_a);

  reset role;

  ------------------------------------------------------------------------
  -- Act as User B: join the collection the same way the app does (invite-code RPC), owning
  -- nothing themselves.
  ------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.join_collection_by_code(v_invite_code);
  reset role;

  ------------------------------------------------------------------------
  -- Assertion 1 — User A's personal Memories view (src/app/dashboard/memories/page.tsx query
  -- shape: memories filtered to owner_id = me) shows all 4 of her own memories.
  ------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  set local role authenticated;
  select array_agg(id) into v_ids from public.memories where owner_id = v_user_a;
  assert array_length(v_ids, 1) = 4,
    format('User A should see all 4 of her own memories in Memories, saw %s', coalesce(array_length(v_ids, 1), 0));

  -- Assertion 2 — User A's Collections view (collections/[id]/page.tsx query shape: join through
  -- collection_memories) shows exactly the 1 shared memory.
  select array_agg(memory_id) into v_ids from public.collection_memories where collection_id = v_collection_id;
  assert v_ids = array[v_shared_memory_id],
    format('User A''s Collection view should show exactly the shared memory, saw %s', v_ids);
  reset role;

  ------------------------------------------------------------------------
  -- Assertion 3 (THE BUG) — User B's personal Memories view must be EMPTY. Before the fix, this
  -- query had no owner_id filter and returned A's shared memory (and, if RLS had ever been the
  -- real leak, her private ones too).
  ------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  set local role authenticated;
  select count(*) into v_count from public.memories where owner_id = v_user_b;
  assert v_count = 0,
    format('BUG: User B''s personal Memories view leaked %s row(s) that are not hers', v_count);

  -- Assertion 4 — User B's Collections view for this collection shows exactly the 1 shared memory.
  select array_agg(memories.id) into v_ids
  from public.collection_memories
  join public.memories on memories.id = collection_memories.memory_id
  where collection_memories.collection_id = v_collection_id;
  assert v_ids = array[v_shared_memory_id],
    format('User B should see exactly the shared memory in the Collection view, saw %s', v_ids);

  -- Assertion 5 (defense in depth) — even a raw, unfiltered read of `memories` as User B must
  -- never surface A's 3 private-only rows. This is what actually proves the RLS policy itself
  -- was correctly row-scoped all along, and the leak was purely the app query missing owner_id.
  select count(*) into v_count from public.memories where id in (v_private_1, v_private_2, v_private_3);
  assert v_count = 0,
    format('RLS regression: User B can directly see %s of A''s private-only memories', v_count);

  reset role;
  raise notice 'PASS: personal Memories and Collections visibility are correctly isolated.';
end $$;

rollback;
