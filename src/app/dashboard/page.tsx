import Link from "next/link";
import { CalendarClock, Images, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMemoryDate, type Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "there";

  const [{ count }, { data: reminders }, { data: resurfaced }] = await Promise.all([
    supabase.from("memories").select("id", { count: "exact", head: true }),
    supabase.from("memories").select("id, reminder_at").not("reminder_at", "is", null).gte("reminder_at", new Date().toISOString()).order("reminder_at").limit(1),
    supabase.from("memories").select("*, memory_media(*)").lt("occurred_at", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order("occurred_at", { ascending: true }).limit(1)
  ]);

  const found = resurfaced?.[0] as Memory | undefined;
  let imageUrl: string | null = null;
  const media = found?.memory_media?.find((item) => item.mime_type.startsWith("image/"));
  if (media) {
    const { data } = await supabase.storage.from("memories").createSignedUrl(media.storage_path, 3600);
    imageUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
      <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">Your scrapbook</p>
          <h1 className="serif mt-2 text-4xl md:text-5xl">Good to see you, {displayName}.</h1>
          <p className="mt-3 text-[var(--muted)]">What would you like your future self to find?</p>
        </div>
        <Link className="primary-button" href="/dashboard/memories/new"><Plus size={18} /> Add a memory</Link>
      </section>

      <section className="paper tape relative overflow-hidden rounded-[30px] p-7 md:p-10" style={{ minHeight: 290 }}>
        <div className="absolute right-[-25px] top-[-20px] h-40 w-40 rounded-full" style={{ background: "var(--bluebell)", opacity: 0.58 }} />
        <div className="relative grid gap-7 md:grid-cols-[1fr_260px] md:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.23em] text-[var(--fern-dark)]">A memory found you</p>
            {found ? (
              <>
                <h2 className="serif mt-4 text-4xl">{found.title}</h2>
                <p className="mt-3 text-sm font-bold text-[var(--fern-dark)]">{formatMemoryDate(found.occurred_at)}</p>
                <p className="mt-4 line-clamp-4 whitespace-pre-wrap leading-7 text-[var(--muted)]">{found.body || "A moment you chose to keep."}</p>
              </>
            ) : (
              <>
                <h2 className="serif mt-4 text-4xl">Nothing old enough to resurface—yet.</h2>
                <p className="mt-4 leading-7 text-[var(--muted)]">Once a memory is at least thirty days old, Linger can bring it back here.</p>
              </>
            )}
          </div>
          {imageUrl && <div className="polaroid rotate-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img alt={found?.title ?? "Memory"} className="h-44 w-full object-cover" src={imageUrl} /></div>}
        </div>
      </section>

      <section className="mt-7 grid gap-5 md:grid-cols-3">
        <DashboardCard icon={Images} title={`${count ?? 0} ${(count ?? 0) === 1 ? "memory" : "memories"}`} body="Photos, diaries, thoughts, letters, voice memos, and videos." color="var(--cherry)" />
        <DashboardCard icon={CalendarClock} title={reminders?.length ? "A reminder is waiting" : "No reminders yet"} body={reminders?.length ? "Your next scheduled rediscovery is ready in the timeline." : "Choose a future date when creating a memory."} color="var(--honey)" />
        <DashboardCard icon={Sparkles} title="Wrapped is waiting" body="See the first story of your year—favourite moments, fullest month, and how you remembered it." color="var(--pistachio)" />
      </section>
    </main>
  );
}

function DashboardCard({ icon: Icon, title, body, color }: { icon: typeof Images; title: string; body: string; color: string }) {
  return <article className="paper-soft rounded-3xl p-6"><div className="grid h-11 w-11 place-items-center rounded-full" style={{ background: color }}><Icon size={20} /></div><h2 className="serif mt-5 text-2xl">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p></article>;
}
