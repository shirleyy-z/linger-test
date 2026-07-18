import Link from "next/link";
import { CalendarDays, Heart, Images, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, monthKey, type Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

export default async function WrappedPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: requested } = await searchParams;
  const year = Number(requested) || new Date().getFullYear();
  const supabase = await createClient();
  const [{ data }, { count: collectionCount }] = await Promise.all([
    supabase.from("memories").select("*, memory_media(*)").gte("occurred_at", `${year}-01-01`).lte("occurred_at", `${year}-12-31`).order("occurred_at"),
    supabase.from("collections").select("id", { count: "exact", head: true })
  ]);
  const memories = (data ?? []) as Memory[];
  const photoCount = memories.filter((memory) => memory.memory_media.some((media) => media.mime_type.startsWith("image/"))).length;
  const favoriteCount = memories.filter((memory) => memory.is_favorite).length;
  const months = memories.reduce<Record<string, number>>((all, memory) => { const key=monthKey(memory.occurred_at); all[key]=(all[key]??0)+1; return all; },{});
  const topMonth = Object.entries(months).sort((a,b)=>b[1]-a[1])[0];
  const typeCounts = memories.reduce<Record<string,number>>((all,m)=>{all[m.memory_type]=(all[m.memory_type]??0)+1;return all;},{});
  const topType = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0];
  const first = memories[0];
  const last = memories[memories.length-1];
  const years = [year-1, year, year+1].filter((value)=>value<=new Date().getFullYear());

  return <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
    <section className="wrapped-hero overflow-hidden rounded-[36px] p-8 md:p-12"><p className="text-sm font-bold uppercase tracking-[.25em]">Linger Wrapped</p><div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><h1 className="serif text-6xl md:text-8xl">{year}</h1><p className="mt-4 max-w-xl text-lg leading-8">A first look back at the moments, people, and little details you chose not to lose.</p></div><nav className="flex gap-2">{years.map((value)=><Link className={`rounded-full px-4 py-2 font-bold ${value===year?"bg-white text-[var(--ink)]":"bg-white/25"}`} href={`/dashboard/wrapped?year=${value}`} key={value}>{value}</Link>)}</nav></div></section>
    {memories.length === 0 ? <section className="paper tape mt-8 rounded-[30px] p-10 text-center"><h2 className="serif text-4xl">No pages from {year} yet.</h2><p className="mt-4 text-[var(--muted)]">Memories dated in this year will shape your Wrapped story.</p></section> : <>
      <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Images} number={memories.length} label="memories kept"/><Stat icon={Heart} number={favoriteCount} label="favourites"/><Stat icon={CalendarDays} number={photoCount} label="photo moments"/><Stat icon={Users} number={collectionCount ?? 0} label="shared collections"/></section>
      <section className="mt-7 grid gap-6 lg:grid-cols-2"><article className="paper rounded-[30px] p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Your fullest chapter</p><h2 className="serif mt-3 text-4xl">{topMonth ? formatMonth(topMonth[0]) : "This year"}</h2><p className="mt-4 text-[var(--muted)]">You saved {topMonth?.[1] ?? 0} moments here—more than any other month.</p></article><article className="paper rounded-[30px] p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">How you remembered</p><h2 className="serif mt-3 text-4xl">Mostly through {topType?.[0] ?? "memories"}</h2><p className="mt-4 text-[var(--muted)]">Your most-used format appeared {topType?.[1] ?? 0} times.</p></article></section>
      <section className="paper mt-7 rounded-[30px] p-7 md:p-10"><div className="flex items-center gap-2"><Sparkles size={20}/><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">The shape of your year</p></div><div className="mt-8 grid gap-8 md:grid-cols-[1fr_auto_1fr]"><div><p className="text-sm font-bold text-[var(--muted)]">It began with</p><h3 className="serif mt-2 text-3xl">{first?.title}</h3><p className="mt-3 line-clamp-4 leading-7 text-[var(--muted)]">{first?.body || "A moment you kept."}</p></div><div className="hidden w-px bg-[var(--line)] md:block"/><div><p className="text-sm font-bold text-[var(--muted)]">And lingered on</p><h3 className="serif mt-2 text-3xl">{last?.title}</h3><p className="mt-3 line-clamp-4 leading-7 text-[var(--muted)]">{last?.body || "A moment you kept."}</p></div></div></section>
    </>}
  </main>;
}

function Stat({icon:Icon,number,label}:{icon:typeof Images;number:number;label:string}){return <article className="paper-soft rounded-3xl p-6"><Icon size={22}/><p className="serif mt-4 text-5xl">{number}</p><p className="mt-2 text-sm font-bold text-[var(--muted)]">{label}</p></article>}
