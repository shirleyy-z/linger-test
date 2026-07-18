-- Linger Increment 4: scrapbook canvas layout metadata and future-only reminders.
-- Run once after increment_3.sql.

alter table public.memories
  add column if not exists canvas_x integer,
  add column if not exists canvas_y integer,
  add column if not exists canvas_width integer,
  add column if not exists canvas_rotation numeric(5,2),
  add column if not exists canvas_z integer,
  add column if not exists paper_style text,
  add column if not exists sticker text;

alter table public.memories
  drop constraint if exists memories_canvas_x_check,
  add constraint memories_canvas_x_check check (canvas_x is null or canvas_x between 0 and 1600),
  drop constraint if exists memories_canvas_y_check,
  add constraint memories_canvas_y_check check (canvas_y is null or canvas_y between 0 and 4000),
  drop constraint if exists memories_canvas_width_check,
  add constraint memories_canvas_width_check check (canvas_width is null or canvas_width between 220 and 620),
  drop constraint if exists memories_canvas_rotation_check,
  add constraint memories_canvas_rotation_check check (canvas_rotation is null or canvas_rotation between -15 and 15);
