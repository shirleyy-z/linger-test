-- Linger Increment 5: support larger scrapbook pages and multiple attachments.
-- The memory_media table already supports multiple rows per memory, so no new media table is required.
-- Run once after increment_4.sql.

alter table public.memories
  drop constraint if exists memories_canvas_y_check,
  add constraint memories_canvas_y_check check (canvas_y is null or canvas_y between 0 and 20000);

create index if not exists memory_media_memory_created_idx
  on public.memory_media(memory_id, created_at asc);
