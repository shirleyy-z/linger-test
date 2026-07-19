"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Clock3, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DueReminder = {
  id: string;
  title: string;
  body: string;
  occurred_at: string;
  reminder_at: string;
};

export function ReminderPopup() {
  const supabase = useMemo(() => createClient(), []);
  const [reminders, setReminders] = useState<DueReminder[]>([]);
  // Guards against overlapping fetches; a ref (not state) keeps checkReminders'
  // identity stable so the effect below sets up its interval/listener exactly once.
  const loadingRef = useRef(false);
  const current = reminders[0];

  const checkReminders = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadingRef.current = false;
      return;
    }

    const { data } = await supabase
      .from("memories")
      .select("id,title,body,occurred_at,reminder_at")
      .lte("reminder_at", new Date().toISOString())
      .is("reminder_notified_at", null)
      .order("reminder_at", { ascending: true })
      .limit(5);

    setReminders((data ?? []).filter((item): item is DueReminder => Boolean(item.reminder_at)));
    loadingRef.current = false;
  }, [supabase]);

  useEffect(() => {
    void checkReminders();
    const timer = window.setInterval(() => void checkReminders(), 30_000);
    const onFocus = () => void checkReminders();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkReminders]);

  async function dismiss() {
    if (!current) return;
    await supabase
      .from("memories")
      .update({ reminder_notified_at: new Date().toISOString() })
      .eq("id", current.id);
    setReminders((items) => items.slice(1));
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(63,70,61,0.34)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Memory reminder">
      <section className="paper reminder-card relative w-full max-w-lg overflow-visible rounded-[30px] p-7 md:p-9">
        <span className="washi-strip washi-pink" aria-hidden="true" />
        <button className="absolute right-4 top-4 rounded-full p-2 hover:bg-black/5" onClick={dismiss} aria-label="Dismiss reminder" type="button">
          <X size={20} />
        </button>
        <div className="sticker-badge mb-5"><Bell size={20} /> A memory came back</div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">
          You asked Linger to remind you
        </p>
        <h2 className="serif mt-3 text-4xl">{current.title}</h2>
        {current.body && <p className="mt-4 line-clamp-4 whitespace-pre-wrap leading-7 text-[var(--muted)]">{current.body}</p>}
        <p className="mt-5 flex items-center gap-2 text-sm font-bold text-[var(--fern-dark)]">
          <Clock3 size={16} /> From {new Intl.DateTimeFormat("en-CA", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${current.occurred_at}T00:00:00Z`))}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="primary-button" href={`/dashboard/memories/${current.id}`} onClick={dismiss}>Open memory</Link>
          <button className="secondary-button" onClick={dismiss} type="button">Keep lingering</button>
        </div>
      </section>
    </div>
  );
}
