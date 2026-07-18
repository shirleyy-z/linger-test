import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Plus, Sparkles, Users } from "lucide-react";
import { GenerateEventsButton } from "@/components/collections/collection-actions";
import { MemoryCard } from "@/components/memories/memory-card";
import { createClient } from "@/lib/supabase/server";
import { formatMemoryDate, type Memory } from "@/lib/memories";
import type { CollectionEvent } from "@/lib/collections";

export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: collection }, { data: links }, { data: events }, { count: memberCount }] = await Promise.all([
    supabase.from("collections").select("*").eq("id", id).single(),
    supabase.from("collection_memories").select("added_at, memories(*, memory_media(*))").eq("collection_id", id).order("added_at", { ascending: false }),
    supabase.from("collection_events").select("*, event_memories(memory_id)").eq("collection_id", id).order("start_date", { ascending: false }),
    supabase.from("collection_members").select("user_id", { count: "exact", head: true }).eq("collection_id", id)
  ]);
  if (!collection) notFound();
  const memories = (links ?? []).map((row) => row.memories).filter(Boolean) as unknown as Memory[];
  await Promise.all(memories.flatMap((memory) => memory.memory_media.map(async (media) => { const { data } = await supabase.storage.from("memories").createSignedUrl(media.storage_path, 3600); media.signed_url = data?.signedUrl ?? null; })));
  const memoryMap = new Map(memories.map((memory) => [memory.id, memory]));

  return <main className="mx-auto w-full max-w-[1320px] p-5 md:p-8">
    <section className="collection-hero paper relative overflow-hidden rounded-[34px] p-7 md:p-10"><span className="absolute right-8 top-5 text-7xl opacity-80">{collection.cover_emoji}</span><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Collaborative collection</p><h1 className="serif mt-3 max-w-3xl text-5xl md:text-6xl">{collection.name}</h1><p className="mt-4 max-w-2xl leading-7 text-[var(--muted)]">{collection.description || "A shared scrapbook for moments worth keeping together."}</p><div className="mt-6 flex flex-wrap items-center gap-3"><span className="sticker-badge"><Users size={16}/>{memberCount ?? 0} members</span><span className="invite-code"><Copy size={15}/> Invite code: <strong>{collection.invite_code}</strong></span></div></section>

    <section className="mt-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--fern-dark)]">Scrapbook timeline</p><h2 className="serif mt-1 text-3xl">Our memories</h2></div><div className="flex flex-wrap gap-3"><GenerateEventsButton collectionId={id}/><Link className="primary-button" href={`/dashboard/memories/new?collection=${id}`}><Plus size={18}/> Add memory here</Link></div></section>

    {(events?.length ?? 0) > 0 && <section className="mt-7"><div className="mb-4 flex items-center gap-2"><Sparkles size={18}/><h2 className="serif text-2xl">Chapters Gemini found</h2></div><div className="grid gap-5 lg:grid-cols-2">{(events as CollectionEvent[]).map((event) => <article className="event-card paper-soft" key={event.id}><div className="flex flex-wrap gap-2">{event.suggested_stickers.map((sticker) => <span className="text-2xl" key={sticker}>{sticker}</span>)}</div><p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-[var(--fern-dark)]">{event.theme || "A chapter together"}</p><h3 className="serif mt-2 text-3xl">{event.title}</h3><p className="mt-3 leading-7 text-[var(--muted)]">{event.summary}</p><p className="mt-4 text-sm font-bold">{event.start_date ? formatMemoryDate(event.start_date) : ""}{event.end_date && event.end_date !== event.start_date ? ` – ${formatMemoryDate(event.end_date)}` : ""}</p><div className="mt-5 flex -space-x-2">{event.event_memories.slice(0,5).map(({memory_id}) => { const m=memoryMap.get(memory_id); return <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[var(--fennel)] text-sm" key={memory_id} title={m?.title}>{m?.memory_type === "photo" ? "📷" : "✦"}</span>; })}</div></article>)}</div></section>}

    {memories.length === 0 ? <section className="paper tape mt-9 rounded-[30px] p-10 text-center"><h2 className="serif text-4xl">This scrapbook is waiting for its first piece.</h2><p className="mt-4 text-[var(--muted)]">Create a memory from here, or edit an existing memory and publish it to this collection.</p><Link className="primary-button mt-6" href={`/dashboard/memories/new?collection=${id}`}><Plus size={18}/> Add the first memory</Link></section> : <section className="collection-timeline mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{memories.map((memory, index) => <div className={index % 3 === 1 ? "md:translate-y-8" : ""} key={memory.id}><MemoryCard index={index} memory={memory}/></div>)}</section>}
  </main>;
}
