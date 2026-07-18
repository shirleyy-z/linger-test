import type { SupabaseClient } from "@supabase/supabase-js";
import type { Memory, MemoryAuthor } from "@/lib/memories";

/**
 * Best-effort author lookup. Runs as a separate query (not a PostgREST embed) so a
 * missing relationship, stale schema cache, or RLS gap degrades to "no author shown"
 * instead of failing the query that loads the memory itself.
 */
export async function attachAuthors<T extends Memory>(supabase: SupabaseClient, memories: T[]): Promise<T[]> {
  const ownerIds = [...new Set(memories.map((memory) => memory.owner_id).filter(Boolean))];
  if (ownerIds.length === 0) return memories;

  const { data, error } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ownerIds);
  if (error || !data) return memories;

  const byId = new Map<string, MemoryAuthor>(
    data.map((profile) => [profile.id as string, { display_name: profile.display_name, avatar_url: profile.avatar_url }])
  );
  for (const memory of memories) {
    memory.author = byId.get(memory.owner_id) ?? null;
  }
  return memories;
}
