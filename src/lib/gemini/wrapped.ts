import { wrappedInsightsSchema, type WrappedInsights } from "@/lib/schemas/wrapped";
import type { WrappedDigestEntry } from "@/lib/wrapped";

function buildWrappedPrompt(year: number, digest: WrappedDigestEntry[]) {
  return `You are a warm, thoughtful friend writing a short recap of someone's ${year}, based only on their personal memory journal entries below (chronological, each with an "id", "date", "title", and a short "excerpt").

Write two things and return JSON only:

1. "narrative": a 3-5 sentence paragraph recapping the year. Warm, reflective, first-person-adjacent tone, as if a close friend were telling it back to them. Reference specific real details from the entries below (titles, places, feelings, people, events actually mentioned). No generic filler like "you had a wonderful year" — every sentence should be grounded in something from the entries. Do not invent facts that aren't present below.

2. "callback": pick exactly ONE meaningful pairing between an earlier entry and a later entry from this same year that shows change, growth, or a connected thread — for example an early worry that resolved later, a goal mentioned again down the line, or a feeling that recurs with a different tone. Reference the two entries using their exact "id" values from below (the earlier one as before_memory_id, the later one as after_memory_id — they must be two different entries). Write a 1-2 sentence callout that names both moments and their approximate dates (e.g. "Back in March... and by October...").

Return JSON only, no other text, matching this shape:
{"narrative": "...", "callback": {"before_memory_id": "id of the earlier entry", "after_memory_id": "id of the later entry", "text": "..."}}

Entries:
${JSON.stringify(digest)}`;
}

export async function generateWrappedInsights(year: number, digest: WrappedDigestEntry[]): Promise<WrappedInsights> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildWrappedPrompt(year, digest) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    })
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unreadable result.");
  }

  const validated = wrappedInsightsSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Gemini response failed validation.");

  const { before_memory_id, after_memory_id } = validated.data.callback;
  const validIds = new Set(digest.map((entry) => entry.id));
  if (before_memory_id === after_memory_id || !validIds.has(before_memory_id) || !validIds.has(after_memory_id)) {
    throw new Error("Gemini picked a callback pairing outside the provided entries.");
  }

  return validated.data;
}
