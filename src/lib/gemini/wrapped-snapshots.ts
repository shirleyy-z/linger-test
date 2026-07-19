import { busiestMonthCaptionSchema, wrappedVibeSchema, type WrappedVibe } from "@/lib/schemas/wrapped-snapshots";
import type { WrappedDigestEntry } from "@/lib/wrapped";

function buildBusiestMonthPrompt(monthLabel: string, count: number, digest: WrappedDigestEntry[]) {
  return `You are a warm, observant friend. ${monthLabel} was this person's busiest month of the year — ${count} memories saved, more than any other month. Below are their entries from just that month (each with a "title" and a short "excerpt").

Write ONE short, punchy caption (max ~20 words) explaining what made this month so full, grounded in specific, real details from the entries below — not generic filler. Return JSON only: {"caption": "..."}

Entries from ${monthLabel}:
${JSON.stringify(digest)}`;
}

export async function generateBusiestMonthCaption(monthLabel: string, count: number, digest: WrappedDigestEntry[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildBusiestMonthPrompt(monthLabel, count, digest) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.6 }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unreadable result.");
  }

  const validated = busiestMonthCaptionSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Gemini response failed validation.");
  return validated.data.caption;
}

function buildVibePrompt(year: number, digest: WrappedDigestEntry[]) {
  return `You are a perceptive friend summarizing someone's ${year} in a few playful, specific snapshots, based only on their personal memory journal entries below (chronological, each with "id", "date", "title", "excerpt").

Write three things and return JSON only:

1. "drink": pick ONE specific drink (e.g. "iced oat milk latte", "a glass of red wine", "spicy margarita") that captures this person's vibe/personality this year, plus a one-line "reason" (max ~20 words) grounded in specific details from the entries below.

2. "season": pick whichever of "spring", "summer", "autumn", "winter" best matches the overall mood/energy of this person's year (not the literal calendar season of most entries — the emotional tone: growth/renewal = spring, high energy = summer, change/reflection = autumn, rest/introspection = winter), plus a short "reason" (max ~25 words) grounded in the entries.

3. "word": ONE single word (not a phrase) that best captures the theme of this person's year.

Ground every choice in specific real details from the entries — do not invent facts that aren't present below, and avoid generic filler.

Return JSON only, no other text, matching this shape:
{"drink": {"name": "...", "reason": "..."}, "season": {"value": "spring|summer|autumn|winter", "reason": "..."}, "word": "..."}

Entries:
${JSON.stringify(digest)}`;
}

export async function generateWrappedVibe(year: number, digest: WrappedDigestEntry[]): Promise<WrappedVibe> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildVibePrompt(year, digest) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.75 }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unreadable result.");
  }

  const validated = wrappedVibeSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Gemini response failed validation.");
  return validated.data;
}
