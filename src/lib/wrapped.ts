import type { Memory } from "@/lib/memories";

export type WrappedReport = {
  id: string;
  owner_id: string;
  year: number;
  narrative: string | null;
  callback_before_memory_id: string | null;
  callback_after_memory_id: string | null;
  callback_text: string | null;
  status: "pending" | "done" | "failed";
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
