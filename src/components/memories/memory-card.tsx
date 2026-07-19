import Image from "next/image";
import Link from "next/link";
import { Bell, Heart, Pencil } from "lucide-react";
import { AuthorTag } from "@/components/memories/author-tag";
import { DeleteMemoryButton } from "@/components/memories/delete-memory-button";
import { formatMemoryDate, type Memory } from "@/lib/memories";

export function MemoryCard({ memory, index, showAuthor = false }: { memory: Memory; index: number; showAuthor?: boolean }) {
  const media = memory.memory_media?.[0];
  const rotation = ["-rotate-1", "rotate-1", "rotate-0"][index % 3];
  const tapeClass = ["washi-pink", "washi-green", "washi-blue"][index % 3];
  const sticker = ["✿", "★", "♡", "☁"][index % 4];

  return (
    <div className="memory-collage relative px-2 pb-3 pt-5">
      <span className={`washi-strip ${tapeClass}`} aria-hidden="true" />
      <span className="memory-sticker" aria-hidden="true">{sticker}</span>
      <article className={`paper-soft scrapbook-card relative overflow-hidden rounded-[26px] ${rotation} transition hover:rotate-0`}>
        {media?.signed_url && media.mime_type.startsWith("image/") && (
          <div className="relative h-60 w-full">
            <Image alt={memory.title} className="object-cover" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" src={media.signed_url} />
          </div>
        )}
        {media?.signed_url && media.mime_type.startsWith("audio/") && (
          <div className="bg-[var(--bluebell)]/40 p-5"><audio className="w-full" controls src={media.signed_url} /></div>
        )}
        {media?.signed_url && media.mime_type.startsWith("video/") && (
          <video className="max-h-80 w-full bg-black object-contain" controls src={media.signed_url} />
        )}

        <div className={`p-6 ${memory.memory_type === "diary" || memory.memory_type === "letter" ? "lined-card" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--fern-dark)]">
                {memory.memory_type} · {formatMemoryDate(memory.occurred_at)}
              </p>
              <h2 className="serif mt-2 text-3xl">{memory.title}</h2>
              {showAuthor && memory.author && <AuthorTag author={memory.author} />}
            </div>
            {memory.is_favorite && <Heart className="shrink-0 text-[var(--peony)]" fill="currentColor" size={20} />}
          </div>

          {memory.memory_type === "letter" && memory.letter_recipient && (
            <p className="serif mt-4 text-lg italic">Dear {memory.letter_recipient},</p>
          )}
          {memory.body && <p className="mt-4 whitespace-pre-wrap leading-7 text-[var(--muted)]">{memory.body}</p>}
          {memory.memory_type === "letter" && memory.letter_signoff && (
            <p className="serif mt-5 text-right text-lg italic">{memory.letter_signoff}</p>
          )}

          {memory.reminder_at && (
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--fern-dark)]">
              <Bell size={16} /> Returns {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(memory.reminder_at))}
            </p>
          )}

          <div className="mt-6 flex items-center gap-2">
            <Link className="secondary-button !px-3" href={`/dashboard/memories/${memory.id}/edit`} title="Edit memory"><Pencil size={17} /></Link>
            <DeleteMemoryButton id={memory.id} paths={memory.memory_media.map((item) => item.storage_path)} />
          </div>
        </div>
      </article>
    </div>
  );
}
