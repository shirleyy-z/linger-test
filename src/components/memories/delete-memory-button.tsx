"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteMemoryButton({ id, paths, redirectTo }: { id: string; paths: string[]; redirectTo?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this memory? This cannot be undone.")) return;
    setBusy(true);
    // Delete the row (cascades to memory_media) before the storage files: if this fails,
    // the files are untouched and nothing is left pointing at a deleted object.
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (error) {
      window.alert(error.message);
      setBusy(false);
      return;
    }
    if (paths.length) await supabase.storage.from("memories").remove(paths);
    // Deleting from a list (e.g. a collection grid) just refreshes in place. Deleting from the
    // memory's own detail page has to navigate away, since that route no longer has a row to show.
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button className="secondary-button !px-3" disabled={busy} onClick={remove} title="Delete memory" type="button">
      {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
    </button>
  );
}
