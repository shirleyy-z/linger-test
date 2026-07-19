"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Grip, Heart, RotateCcw, RotateCw } from "lucide-react";
import type { Memory } from "@/lib/memories";

export type LayoutState = { x: number; y: number; width: number; rotation: number; z: number };

export function ScrapbookMemory({ memory, layout, editing, onPointerDown, onResizeStart, onRotate }: {
  memory: Memory;
  layout: LayoutState;
  editing: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onRotate: (delta: number) => void;
}) {
  const media = memory.memory_media?.[0];
  const stickers: Record<string, string> = { photo: "☀", diary: "✎", letter: "♡", voice: "♫", video: "★", thought: "✿" };
  const sticker = memory.sticker || stickers[memory.memory_type] || "✿";
  const paper = memory.paper_style || (memory.memory_type === "diary" ? "paper-lined" : memory.memory_type === "letter" ? "paper-letter" : "paper-cream");

  return (
    <article
      className={`scrap-item ${paper} ${editing ? "is-editing" : ""}`}
      style={{ left: layout.x, top: layout.y, width: layout.width, zIndex: layout.z, transform: `rotate(${layout.rotation}deg)` }}
      onPointerDown={editing ? onPointerDown : undefined}
    >
      <span className="scrap-washi" aria-hidden="true" />
      <span className="scrap-sticker" aria-hidden="true">{sticker}</span>
      {editing && <div className="scrap-drag-label"><Grip size={15} /> drag</div>}

      <Link className="block" href={editing ? "#" : `/dashboard/memories/${memory.id}`} onClick={(event) => editing && event.preventDefault()}>
        {media?.signed_url && media.mime_type.startsWith("image/") && (
          <div className={`stacked-photo aspect-[4/3] ${memory.memory_media.length > 1 ? "has-many" : ""}`}>
            <Image alt={memory.title} className="pointer-events-none object-cover" draggable={false} fill sizes="(max-width: 900px) 100vw, 620px" src={media.signed_url} />
            {memory.memory_media.length > 1 && <span className="attachment-count">+{memory.memory_media.length - 1}</span>}
          </div>
        )}
        {media?.signed_url && media.mime_type.startsWith("audio/") && <div className="mini-cassette">◉━━━━◉<audio className="mt-3 w-full" controls onPointerDown={(e) => e.stopPropagation()} src={media.signed_url} /></div>}
        {media?.signed_url && media.mime_type.startsWith("video/") && <video className="w-full rounded-lg bg-black" controls onPointerDown={(e) => e.stopPropagation()} src={media.signed_url} />}

        <div className="p-5">
          <p className="handwritten text-lg text-[var(--fern-dark)]">{new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${memory.occurred_at}T00:00:00Z`))}</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="serif text-2xl leading-tight">{memory.title}</h2>
            {memory.is_favorite && <Heart className="shrink-0 text-[var(--peony)]" fill="currentColor" size={18} />}
          </div>
          {memory.body && <p className="mt-3 line-clamp-4 whitespace-pre-wrap leading-6 text-[var(--muted)]">{memory.body}</p>}
          {memory.reminder_at && <p className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--fern-dark)]"><Bell size={13} /> set to return</p>}
        </div>
      </Link>

      {editing && (
        <>
          <div className="scrap-controls">
            <button aria-label="Rotate left" onClick={() => onRotate(-2)} onPointerDown={(e) => e.stopPropagation()} type="button"><RotateCcw size={16} /></button>
            <button aria-label="Rotate right" onClick={() => onRotate(2)} onPointerDown={(e) => e.stopPropagation()} type="button"><RotateCw size={16} /></button>
          </div>
          <button className="resize-handle" aria-label="Resize memory" onPointerDown={onResizeStart} type="button" />
        </>
      )}
    </article>
  );
}
