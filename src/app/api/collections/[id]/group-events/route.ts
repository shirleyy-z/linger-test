import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: memories, error } = await supabase.from("collection_memories").select("memories(id,title,body,memory_type,occurred_at)").eq("collection_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const items = (memories ?? []).map((row) => row.memories).filter(Boolean);
  if (items.length < 2) return NextResponse.json({ error: "Add at least two memories before grouping them." }, { status: 400 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Add GEMINI_API_KEY to .env.local to use AI grouping." }, { status: 503 });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const prompt = `You organize memories into meaningful real-world events. Group only memories that clearly belong together. Return JSON only as {"events":[{"title":"poetic concise title","summary":"warm 1-2 sentence summary","theme":"short theme","suggested_stickers":["emoji","emoji"],"memory_ids":["uuid"],"start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD"}]}. Every event needs at least 2 memories. Do not invent facts. Memories:\n${JSON.stringify(items)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.5 } }) });
  if (!response.ok) return NextResponse.json({ error: `Gemini request failed (${response.status}).` }, { status: 502 });
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed: { events?: Array<{title:string;summary:string;theme:string;suggested_stickers:string[];memory_ids:string[];start_date:string;end_date:string}> };
  try { parsed = JSON.parse(text); } catch { return NextResponse.json({ error: "Gemini returned an unreadable result." }, { status: 502 }); }
  const validIds = new Set(items.map((item: any) => item.id));
  const groups = (parsed.events ?? []).filter((event) => event.memory_ids.filter((memoryId) => validIds.has(memoryId)).length >= 2).slice(0, 8);
  await supabase.from("collection_events").delete().eq("collection_id", id);
  let count = 0;
  for (const event of groups) {
    const { data: created } = await supabase.from("collection_events").insert({ collection_id: id, created_by: user.id, title: event.title.slice(0,120), summary: event.summary.slice(0,1200), theme: event.theme.slice(0,120), suggested_stickers: (event.suggested_stickers ?? []).slice(0,5), start_date: event.start_date || null, end_date: event.end_date || null }).select("id").single();
    if (!created) continue;
    await supabase.from("event_memories").insert(event.memory_ids.filter((memoryId) => validIds.has(memoryId)).map((memoryId) => ({ event_id: created.id, memory_id: memoryId })));
    count++;
  }
  return NextResponse.json({ count });
}
