import type { Memory } from "@/lib/memories";

export type WrappedSnapshots = {
  id: string;
  owner_id: string;
  year: number;
  drink: string | null;
  drink_reason: string | null;
  season: "spring" | "summer" | "autumn" | "winter" | null;
  season_reason: string | null;
  busiest_month: string | null;
  busiest_month_count: number | null;
  busiest_month_caption: string | null;
  recurring_themes: { label: string; count: number }[] | null;
  cast_of_characters: { name: string; count: number }[] | null;
  memory_word: string | null;
  dominant_color: string | null;
  gemini_status: "pending" | "done" | "failed";
  color_status: "pending" | "done" | "failed";
  generated_at: string | null;
  created_at: string;
};

export type WrappedDigestEntry = {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  type: string;
};

// A year only becomes eligible for Wrapped once it has fully elapsed.
export function getLastCompletedYear(now: Date = new Date()) {
  return now.getFullYear() - 1;
}

// Which calendar month had the most entries — a real, exact count, never left to Gemini
// (LLMs aren't reliable counters, and the digest itself may be sampled for big years anyway).
export function computeBusiestMonth(memories: Memory[]): { month: string; count: number; memories: Memory[] } | null {
  if (memories.length === 0) return null;
  const byMonth = new Map<string, Memory[]>();
  for (const memory of memories) {
    const key = memory.occurred_at.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(memory);
    else byMonth.set(key, [memory]);
  }
  const [month, monthMemories] = [...byMonth.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  return { month, count: monthMemories.length, memories: monthMemories };
}

const MAX_DIGEST_ENTRIES = 60;
const EXCERPT_LENGTH = 140;

// Gemini's narrative + callback quality depends on real detail, but a big year can blow past a
// reasonable prompt size. Keep the start and end (best "then vs now" candidates) intact and
// evenly sample the middle rather than sending every entry.
export function buildYearDigest(memories: Memory[]): WrappedDigestEntry[] {
  const sorted = [...memories].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const toEntry = (memory: Memory): WrappedDigestEntry => ({
    id: memory.id,
    date: memory.occurred_at,
    title: memory.title,
    excerpt: memory.body.trim().slice(0, EXCERPT_LENGTH),
    type: memory.memory_type
  });

  if (sorted.length <= MAX_DIGEST_ENTRIES) return sorted.map(toEntry);

  const edgeSize = 10;
  const head = sorted.slice(0, edgeSize);
  const tail = sorted.slice(-edgeSize);
  const middlePool = sorted.slice(edgeSize, -edgeSize);
  const middleTarget = MAX_DIGEST_ENTRIES - head.length - tail.length;
  const step = Math.max(1, Math.floor(middlePool.length / middleTarget));
  const middle = middlePool.filter((_, index) => index % step === 0).slice(0, middleTarget);

  return [...head, ...middle, ...tail].map(toEntry);
}
