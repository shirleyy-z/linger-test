"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteMemoryButton({ id, paths }: { id: string; paths: string[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this memory? This cannot be undone.")) return;
    setBusy(true);
    if (paths.length) await supabase.storage.from("memories").remove(paths);
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (error) {
      window.alert(error.message);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <button className="secondary-button !px-3" disabled={busy} onClick={remove} title="Delete memory" type="button">
      {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
    </button>
  );
}
