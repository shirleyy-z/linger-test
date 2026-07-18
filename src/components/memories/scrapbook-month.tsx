"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Move } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScrapbookMemory, type LayoutState } from "./scrapbook-memory";
import { formatMonth, type Memory } from "@/lib/memories";

const CARD_WIDTHS = [310, 360, 290, 340];
const ROW_HEIGHT = 520;

function defaultLayout(index: number): LayoutState {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const offsets = [35, 365, 710];
  const rotations = [-2.5, 1.8, -1, 2.8, -2, 1];
  return { x: offsets[col], y: 80 + row * ROW_HEIGHT + (col === 1 ? 45 : col === 2 ? 10 : 0), width: CARD_WIDTHS[index % CARD_WIDTHS.length], rotation: rotations[index % rotations.length], z: index + 1 };
}

export function ScrapbookMonth({ month, memories }: { month: string; memories: Memory[] }) {
  const supabase = useMemo(() => createClient(), []);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, LayoutState>>(() => Object.fromEntries(memories.map((memory, index) => {
    const fallback = defaultLayout(index);
    return [memory.id, { x: memory.canvas_x ?? fallback.x, y: memory.canvas_y ?? fallback.y, width: memory.canvas_width ?? fallback.width, rotation: Number(memory.canvas_rotation ?? fallback.rotation), z: memory.canvas_z ?? fallback.z }];
  })));

  const expectedRows = Math.ceil(memories.length / 3);
  const naturalHeight = 170 + expectedRows * ROW_HEIGHT;
  const placedHeight = Math.max(0, ...Object.values(layouts).map((item) => item.y + Math.max(430, item.width * 1.05))) + 100;
  const canvasHeight = Math.max(720, naturalHeight, placedHeight);

  function startDrag(id: string, event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button,audio,video")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = layouts[id];
    const sx = event.clientX;
    const sy = event.clientY;
    const canvasWidth = canvasRef.current?.clientWidth ?? 1100;
    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - sx;
      const dy = move.clientY - sy;
      setLayouts((current) => ({ ...current, [id]: { ...current[id], x: Math.max(0, Math.min(canvasWidth - start.width, start.x + dx)), y: Math.max(20, start.y + dy), z: 100 } }));
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(id: string, event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const startWidth = layouts[id].width;
    const sx = event.clientX;
    const onMove = (move: PointerEvent) => setLayouts((current) => ({ ...current, [id]: { ...current[id], width: Math.max(240, Math.min(560, startWidth + move.clientX - sx)) } }));
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function finishEditing() {
    setSaving(true);
    await Promise.all(Object.entries(layouts).map(([id, layout]) => supabase.from("memories").update({ canvas_x: Math.round(layout.x), canvas_y: Math.round(layout.y), canvas_width: Math.round(layout.width), canvas_rotation: layout.rotation, canvas_z: layout.z }).eq("id", id)));
    setSaving(false);
    setEditing(false);
  }

  return (
    <section className="month-spread mt-12 scroll-mt-24" id={`month-${month}`}>
      <div className="month-ribbon"><span aria-hidden="true">★</span><h2 className="handwritten text-3xl md:text-4xl">{formatMonth(month)}</h2><span aria-hidden="true">★</span></div>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-[var(--muted)]">{memories.length} memor{memories.length === 1 ? "y" : "ies"} on this page</p><button className="secondary-button !py-2" disabled={saving} onClick={editing ? finishEditing : () => setEditing(true)} type="button">{editing ? <Check size={17} /> : <Move size={17} />} {saving ? "Saving…" : editing ? "Save arrangement" : "Arrange this page"}</button></div>
      <div className="scrapbook-canvas" ref={canvasRef} style={{ height: canvasHeight }}>
        <span className="canvas-sun" aria-hidden="true">☀</span><span className="canvas-doodle canvas-doodle-one" aria-hidden="true">〰〰〰</span><span className="canvas-ticket" aria-hidden="true">ADMIT ONE<br />LINGER</span>
        {memories.map((memory) => <ScrapbookMemory editing={editing} key={memory.id} layout={layouts[memory.id]} memory={memory} onPointerDown={(event) => startDrag(memory.id, event)} onResizeStart={(event) => startResize(memory.id, event)} onRotate={(delta) => setLayouts((current) => ({ ...current, [memory.id]: { ...current[memory.id], rotation: Math.max(-15, Math.min(15, current[memory.id].rotation + delta)) } }))} />)}
      </div>
      {editing && <p className="mt-3 text-center text-sm font-bold text-[var(--fern-dark)]">Drag a memory, pull its lower-right corner to resize, or use the rotate buttons. The page grows downward as you add or move memories.</p>}
    </section>
  );
}
