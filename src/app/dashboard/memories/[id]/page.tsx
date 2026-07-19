import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, Heart, Pencil } from "lucide-react";
import { AuthorTag } from "@/components/memories/author-tag";
import { DeleteMemoryButton } from "@/components/memories/delete-memory-button";
import { createClient } from "@/lib/supabase/server";
import { attachAuthors } from "@/lib/authors";
import { formatMemoryDate, type Memory } from "@/lib/memories";

export const dynamic = "force-dynamic";

export default async function MemoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { count: collectionCount }] = await Promise.all([
    supabase.from("memories").select("*, memory_media(*)").eq("id", id).single(),
    supabase.from("collection_memories").select("collection_id", { count: "exact", head: true }).eq("memory_id", id)
  ]);
  if (!data) notFound();

  const memory = data as Memory;
  const showAuthor = (collectionCount ?? 0) > 0;
  if (showAuthor) await attachAuthors(supabase, [memory]);
  await Promise.all(memory.memory_media.map(async (media) => {
    const { data: signed } = await supabase.storage.from("memories").createSignedUrl(media.storage_path, 3600);
    media.signed_url = signed?.signedUrl ?? null;
  }));

  const images = memory.memory_media.filter((media) => media.mime_type.startsWith("image/") && media.signed_url);
  const audio = memory.memory_media.filter((media) => media.mime_type.startsWith("audio/") && media.signed_url);
  const videos = memory.memory_media.filter((media) => media.mime_type.startsWith("video/") && media.signed_url);

  return (
    <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
      <Link className="mb-6 inline-flex items-center gap-2 font-bold text-[var(--fern-dark)]" href="/dashboard/memories"><ArrowLeft size={18} /> Back to scrapbook</Link>

      <article className="memory-detail-spread paper relative overflow-visible rounded-[34px] p-5 md:p-10">
        <span className="detail-washi washi-pink" aria-hidden="true" />
        <span className="detail-sticker" aria-hidden="true">{memory.sticker || (memory.is_favorite ? "♡" : "✿")}</span>

        <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <div className="memory-gallery">
            {images.length > 0 && (
              <div className={`memory-photo-grid ${images.length === 1 ? "single" : ""}`}>
                {images.map((media, index) => (
                  <figure className={`polaroid memory-gallery-photo gallery-photo-${index % 5}`} key={media.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`${memory.title} photo ${index + 1}`} src={media.signed_url!} />
                    {index === 0 && <figcaption className="handwritten">{formatMemoryDate(memory.occurred_at)}</figcaption>}
                  </figure>
                ))}
              </div>
            )}

            {audio.map((media) => <div className="cassette-player paper-soft mt-5 p-7" key={media.id}><span aria-hidden="true">◉ ━━━━━ ◉</span><p className="mt-3 text-sm font-bold tracking-normal">{media.file_name}</p><audio className="mt-4 w-full" controls src={media.signed_url!} /></div>)}
            {videos.map((media) => <div className="mt-5" key={media.id}><video className="w-full rounded-2xl bg-black shadow-xl" controls src={media.signed_url!} /><p className="mt-2 text-sm text-[var(--muted)]">{media.file_name}</p></div>)}
            {memory.memory_media.length === 0 && <div className="torn-note min-h-72 p-8"><p className="handwritten text-2xl">A memory kept in words.</p></div>}
          </div>

          <div className={`relative p-5 md:p-7 ${memory.memory_type === "diary" || memory.memory_type === "letter" ? "lined-card" : ""}`}>
            <p className="handwritten text-xl text-[var(--fern-dark)]">{formatMemoryDate(memory.occurred_at)}</p>
            <div className="mt-3 flex items-start justify-between gap-4"><h1 className="serif text-4xl md:text-5xl">{memory.title}</h1>{memory.is_favorite && <Heart className="shrink-0 text-[var(--peony)]" fill="currentColor" size={25} />}</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">{memory.memory_type} · {memory.memory_media.length} attachment{memory.memory_media.length === 1 ? "" : "s"}</p>
            {showAuthor && memory.author && <AuthorTag author={memory.author} />}
            {memory.memory_type === "letter" && memory.letter_recipient && <p className="serif mt-7 text-xl italic">Dear {memory.letter_recipient},</p>}
            {memory.body && <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-[var(--ink)]">{memory.body}</p>}
            {memory.memory_type === "letter" && memory.letter_signoff && <p className="serif mt-7 text-right text-xl italic">{memory.letter_signoff}</p>}
            {memory.reminder_at && <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--fennel)] px-4 py-2 text-sm font-bold text-[var(--fern-dark)]"><Bell size={16} /> Returns {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(memory.reminder_at))}</div>}
          </div>
        </div>

        <div className="mt-9 flex flex-wrap gap-3 border-t border-dashed border-[var(--line)] pt-6"><Link className="primary-button" href={`/dashboard/memories/${memory.id}/edit`}><Pencil size={17} /> Edit memory and attachments</Link><DeleteMemoryButton id={memory.id} paths={memory.memory_media.map((item) => item.storage_path)} redirectTo="/dashboard/memories" /></div>
      </article>
    </main>
  );
}
