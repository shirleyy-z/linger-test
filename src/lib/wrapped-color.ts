import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Memory } from "@/lib/memories";

const MAX_PHOTOS = 15;
const CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 8000;

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

async function averagePixel(storagePath: string, supabase: SupabaseClient): Promise<[number, number, number] | null> {
  try {
    const { data: signed } = await supabase.storage.from("memories").createSignedUrl(storagePath, 60);
    if (!signed?.signedUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(signed.signedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    // Resizing to a single pixel is the cheapest possible way to get an average colour —
    // sharp does the downsampling, we just read the one resulting pixel back out.
    const { data } = await sharp(buffer).resize(1, 1, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return [data[0], data[1], data[2]];
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

// A year's dominant colour, computed as a simple average across a sample of that year's
// photos — no colour quantization/histogram complexity, just resize-to-1px per photo and
// average the results. Returns null (rather than throwing) if no photos are usable, so this
// never blocks the rest of Wrapped from rendering.
export async function computeDominantColor(memories: Memory[], supabase: SupabaseClient): Promise<string | null> {
  const photoPaths = memories
    .flatMap((memory) => memory.memory_media)
    .filter((media) => media.mime_type.startsWith("image/"))
    .slice(0, MAX_PHOTOS)
    .map((media) => media.storage_path);

  if (photoPaths.length === 0) return null;

  const pixels = await mapWithConcurrency(photoPaths, CONCURRENCY, (path) => averagePixel(path, supabase));
  const usable = pixels.filter((pixel): pixel is [number, number, number] => pixel !== null);
  if (usable.length === 0) return null;

  const totals = usable.reduce((sum, [r, g, b]) => [sum[0] + r, sum[1] + g, sum[2] + b], [0, 0, 0]);
  return toHex(totals[0] / usable.length, totals[1] / usable.length, totals[2] / usable.length);
}
