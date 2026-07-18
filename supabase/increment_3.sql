-- Linger Increment 3: global in-app reminders and richer written memories
-- Run once after increment_2.sql.

alter table public.memories
  add column if not exists reminder_notified_at timestamptz,
  add column if not exists letter_recipient text check (letter_recipient is null or char_length(letter_recipient) <= 120),
  add column if not exists letter_signoff text check (letter_signoff is null or char_length(letter_signoff) <= 120);

create index if not exists memories_due_reminders_idx
  on public.memories(owner_id, reminder_at)
  where reminder_at is not null and reminder_notified_at is null;
