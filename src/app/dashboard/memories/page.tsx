import Link from "next/link";
import { CalendarRange, Plus, Search } from "lucide-react";
import { ScrapbookMonth } from "@/components/memories/scrapbook-month";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, monthKey, type Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; type?: string; month?: string; from?: string; to?: string };

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: dateRows } = await supabase.from("memories").select("occurred_at").order("occurred_at", { ascending: false });
  const availableMonths = [...new Set((dateRows ?? []).map((row) => monthKey(row.occurred_at)))];

  let query = supabase.from("memories").select("*, memory_media(*)").order("occurred_at", { ascending: false }).order("created_at", { ascending: false });
  if (params.type && params.type !== "all") query = query.eq("memory_type", params.type);
  if (params.q?.trim()) query = query.or(`title.ilike.%${params.q.trim()}%,body.ilike.%${params.q.trim()}%`);

  if (params.month) {
    const [year, month] = params.month.split("-").map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    query = query.gte("occurred_at", `${params.month}-01`).lt("occurred_at", nextMonth);
  } else {
    if (params.from) query = query.gte("occurred_at", params.from);
    if (params.to) query = query.lte("occurred_at", params.to);
  }

  const { data, error } = await query;
  const memories = (data ?? []) as Memory[];
  await Promise.all(memories.flatMap((memory) => memory.memory_media.map(async (media) => {
    const { data: signed } = await supabase.storage.from("memories").createSignedUrl(media.storage_path, 3600);
    media.signed_url = signed?.signedUrl ?? null;
  })));

  const groups = memories.reduce<Record<string, Memory[]>>((all, memory) => {
    const key = monthKey(memory.occurred_at);
    (all[key] ||= []).push(memory);
    return all;
  }, {});
  const groupEntries = Object.entries(groups);
  const hasFilters = Boolean(params.q || (params.type && params.type !== "all") || params.month || params.from || params.to);

  return (
    <main className="mx-auto w-full max-w-[1320px] p-5 md:p-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">Your scrapbook</p><h1 className="serif mt-2 text-5xl">Memories</h1><p className="mt-3 text-[var(--muted)]">A little messy, deeply yours. Open a scrap to revisit its full story.</p></div>
        <Link className="primary-button" href="/dashboard/memories/new"><Plus size={18} /> Add a memory</Link>
      </header>

      <form className="paper-soft mt-7 rounded-3xl p-4" method="get">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_210px_auto]">
          <label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="input !pl-11" defaultValue={params.q} name="q" placeholder="Search your scrapbook" /></label>
          <select className="input" defaultValue={params.type ?? "all"} name="type"><option value="all">All kinds</option><option value="thought">Thoughts</option><option value="diary">Diary entries</option><option value="photo">Photos</option><option value="letter">Letters</option><option value="voice">Voice memos</option><option value="video">Videos</option></select>
          <select className="input" defaultValue={params.month ?? ""} name="month"><option value="">Every month</option>{availableMonths.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}</select>
          <button className="secondary-button" type="submit">Filter</button>
        </div>
        <div className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label><span className="label"><CalendarRange className="mr-1 inline" size={15} /> From date</span><input className="input" defaultValue={params.from} disabled={Boolean(params.month)} name="from" type="date" /></label>
          <label><span className="label">To date</span><input className="input" defaultValue={params.to} disabled={Boolean(params.month)} name="to" type="date" /></label>
          {hasFilters ? <Link className="secondary-button justify-center" href="/dashboard/memories">Clear filters</Link> : <span />}
        </div>
        {params.month && <p className="mt-2 text-xs text-[var(--muted)]">Clear the month selection to use a custom date range.</p>}
      </form>

      {groupEntries.length > 1 && (
        <nav className="month-jump-bar mt-5" aria-label="Jump to month">
          <span className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Jump to</span>
          {groupEntries.map(([month]) => <a href={`#month-${month}`} key={month}>{formatMonth(month)}</a>)}
        </nav>
      )}

      {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error.message}</p>}
      {!error && memories.length === 0 ? (
        <section className="paper tape mt-9 rounded-[30px] p-10 text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">A blank page</p><h2 className="serif mt-3 text-4xl">{hasFilters ? "No memories match this moment." : "Your first memory belongs here."}</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--muted)]">{hasFilters ? "Try another month, date range, type, or search phrase." : "Add a thought, photo, diary entry, letter, voice memo, or video."}</p>{hasFilters ? <Link className="primary-button mt-7" href="/dashboard/memories">Show every memory</Link> : <Link className="primary-button mt-7" href="/dashboard/memories/new"><Plus size={18} /> Create the first memory</Link>}</section>
      ) : groupEntries.map(([month, monthMemories]) => <ScrapbookMonth key={month} memories={monthMemories} month={month} />)}
    </main>
  );
}
