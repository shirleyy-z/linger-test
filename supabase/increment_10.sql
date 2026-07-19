-- Linger Increment 10: Wrapped snapshot cards (Spotify-Wrapped-style) — a second, separate
-- Wrapped feature on top of the existing narrative/callback in wrapped_reports.
-- Run once after increment_8.sql (increment 9 was reverted before ever shipping, so the
-- numbering skips straight from 8 to 10 — nothing missing).
--
-- Built incrementally: this migration creates the full column set up front, but generation code
-- is being shipped in batches (busiest month + colour first), so most columns stay null until
-- later batches populate them. gemini_status and color_status are tracked separately because the
-- Gemini-derived cards and the colour card are computed independently with different failure
-- modes — one failing should never block the other from rendering.

create table if not exists public.wrapped_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 1900 and 3000),

  drink text check (drink is null or char_length(drink) <= 80),
  drink_reason text check (drink_reason is null or char_length(drink_reason) <= 300),
  season text check (season is null or season in ('spring', 'summer', 'autumn', 'winter')),
  season_reason text check (season_reason is null or char_length(season_reason) <= 300),
  busiest_month text check (busiest_month is null or busiest_month ~ '^\d{4}-\d{2}$'),
  busiest_month_count int check (busiest_month_count is null or busiest_month_count >= 0),
  busiest_month_caption text check (busiest_month_caption is null or char_length(busiest_month_caption) <= 300),
  recurring_themes jsonb,
  cast_of_characters jsonb,
  memory_word text check (memory_word is null or char_length(memory_word) <= 40),
  dominant_color text check (dominant_color is null or dominant_color ~ '^#[0-9a-fA-F]{6}$'),

  gemini_status text not null default 'pending' check (gemini_status in ('pending', 'done', 'failed')),
  color_status text not null default 'pending' check (color_status in ('pending', 'done', 'failed')),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, year)
);

create index if not exists wrapped_snapshots_owner_year_idx on public.wrapped_snapshots(owner_id, year);

alter table public.wrapped_snapshots enable row level security;

drop policy if exists "Users read their wrapped snapshots" on public.wrapped_snapshots;
create policy "Users read their wrapped snapshots"
on public.wrapped_snapshots for select
using (auth.uid() = owner_id);

drop policy if exists "Users create their wrapped snapshots" on public.wrapped_snapshots;
create policy "Users create their wrapped snapshots"
on public.wrapped_snapshots for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users update their wrapped snapshots" on public.wrapped_snapshots;
create policy "Users update their wrapped snapshots"
on public.wrapped_snapshots for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
