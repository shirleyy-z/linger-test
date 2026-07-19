-- Linger Increment 8: cached Gemini-generated Wrapped narrative + "then vs. now" callback.
-- Run once after increment_7.sql.

create table if not exists public.wrapped_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 1900 and 3000),
  narrative text check (narrative is null or char_length(narrative) <= 2000),
  callback_before_memory_id uuid references public.memories(id) on delete set null,
  callback_after_memory_id uuid references public.memories(id) on delete set null,
  callback_text text check (callback_text is null or char_length(callback_text) <= 600),
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, year)
);

create index if not exists wrapped_reports_owner_year_idx on public.wrapped_reports(owner_id, year);

alter table public.wrapped_reports enable row level security;

drop policy if exists "Users read their wrapped reports" on public.wrapped_reports;
create policy "Users read their wrapped reports"
on public.wrapped_reports for select
using (auth.uid() = owner_id);

drop policy if exists "Users create their wrapped reports" on public.wrapped_reports;
create policy "Users create their wrapped reports"
on public.wrapped_reports for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users update their wrapped reports" on public.wrapped_reports;
create policy "Users update their wrapped reports"
on public.wrapped_reports for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
