-- Linger Increment 11: remove the "Your year, retold" narrative + then-vs-now callback feature.
-- It kept caching a permanent 'failed' status on first error with no retry path, so it never
-- recovered once it failed once. Removed rather than fixed — the newer Wrapped snapshot cards
-- (wrapped_snapshots) cover the same "AI-generated year recap" ground and self-heal on failure.
-- Optional to run: this only drops a table nothing else references anymore. Safe to skip if you'd
-- rather keep the old data around; the app no longer reads or writes this table either way.

drop table if exists public.wrapped_reports;
