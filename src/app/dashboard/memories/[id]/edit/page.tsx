import { notFound } from "next/navigation";
import { MemoryForm } from "@/components/memories/memory-form";
import { createClient } from "@/lib/supabase/server";
import type { Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

export default async function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: collections }, { data: links }] = await Promise.all([
    supabase.from("memories").select("*, memory_media(*)").eq("id", id).single(),
    supabase.from("collections").select("id, name, cover_emoji").order("created_at"),
    supabase.from("collection_memories").select("collection_id").eq("memory_id", id)
  ]);
  if (!data) notFound();

  const selected = new Set((links ?? []).map((row) => row.collection_id));
  const memory = data as Memory;
  await Promise.all(memory.memory_media.map(async (media) => {
    const { data: signed } = await supabase.storage.from("memories").createSignedUrl(media.storage_path, 3600);
    media.signed_url = signed?.signedUrl ?? null;
  }));

  return <main className="mx-auto w-full max-w-4xl p-5 md:p-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">Return to the page</p><h1 className="serif mt-2 mb-7 text-5xl">Edit memory</h1><MemoryForm collections={(collections ?? []).map((item) => ({ ...item, selected: selected.has(item.id) }))} memory={memory} /></main>;
}
