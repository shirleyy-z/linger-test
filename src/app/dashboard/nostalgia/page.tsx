import Link from "next/link";
import { History, Shuffle, Sparkles } from "lucide-react";
import { MemoryCard } from "@/components/memories/memory-card";
import { createClient } from "@/lib/supabase/server";
import type { Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

export default async function NostalgiaPage() {
  const supabase = await createClient();
  const now = new Date();
  const monthDay = now.toISOString().slice(5,10);
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0,10);
  const { data } = await supabase.from("memories").select("*, memory_media(*)").lte("occurred_at", cutoff).order("occurred_at", { ascending: false }).limit(80);
  const all = (data ?? []) as Memory[];
  const onThisDay = all.filter((memory) => memory.occurred_at.slice(5) === monthDay);
  const favorites = all.filter((memory) => memory.is_favorite);
  const shuffled = [...all].sort(() => Math.random() - .5);
  const chosen = (onThisDay.length ? onThisDay : favorites.length ? favorites : shuffled).slice(0,6);
  await Promise.all(chosen.flatMap((memory) => memory.memory_media.map(async (media) => { const { data: signed } = await supabase.storage.from("memories").createSignedUrl(media.storage_path,3600); media.signed_url=signed?.signedUrl ?? null; })));
  const reason = onThisDay.length ? "On this day" : favorites.length ? "A favourite found you" : "From another season";

  return <main className="mx-auto w-full max-w-[1320px] p-5 md:p-8"><header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Nostalgia resurfacing</p><h1 className="serif mt-2 text-5xl">Remember when?</h1><p className="mt-3 max-w-2xl text-[var(--muted)]">Linger looks for anniversaries, old favourites, and memories that have been quiet for a while.</p></div><Link className="secondary-button" href="/dashboard/nostalgia"><Shuffle size={18}/> Reshuffle</Link></header>
  {chosen.length === 0 ? <section className="paper tape mt-9 rounded-[30px] p-10 text-center"><History className="mx-auto" size={30}/><h2 className="serif mt-4 text-4xl">Your memories need a little more time.</h2><p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">Once memories are at least thirty days old, this page will begin bringing them back.</p></section> : <><section className="nostalgia-banner paper mt-8 rounded-[30px] p-7"><div className="flex items-center gap-2"><Sparkles size={18}/><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">{reason}</p></div><h2 className="serif mt-3 text-3xl">Some moments deserve another afternoon.</h2></section><section className="mt-7 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{chosen.map((memory,index)=><MemoryCard index={index} key={memory.id} memory={memory}/>)}</section></>}
  </main>;
}
