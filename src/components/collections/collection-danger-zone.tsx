"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CollectionDangerZone({
  collectionId,
  collectionName,
  isOwner,
  memberCount,
  userId
}: {
  collectionId: string;
  collectionName: string;
  isOwner: boolean;
  memberCount: number;
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteCollection() {
    const sharedWithOthers = memberCount > 1;
    const warning = sharedWithOthers
      ? `Delete "${collectionName}" for everyone? This removes it immediately for all ${memberCount} members, not just you — every shared memory link, chapter, and the collection itself will be gone for good.`
      : `Delete "${collectionName}"? This permanently deletes the collection and everything in it. This cannot be undone.`;
    if (!window.confirm(warning)) return;
    if (sharedWithOthers && !window.confirm("Are you absolutely sure? The other members will lose access with no warning and there is no way to undo this.")) return;

    setBusy(true);
    setError("");
    const { error: deleteError } = await supabase.from("collections").delete().eq("id", collectionId);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/dashboard/collections");
    router.refresh();
  }

  async function leaveCollection() {
    if (!window.confirm(`Leave "${collectionName}"? You'll lose access, but the collection and its memories stay for the other members.`)) return;

    setBusy(true);
    setError("");
    const { error: leaveError } = await supabase.from("collection_members").delete().eq("collection_id", collectionId).eq("user_id", userId);
    setBusy(false);
    if (leaveError) {
      setError(leaveError.message);
      return;
    }
    router.push("/dashboard/collections");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isOwner ? (
        <button className="danger-button" disabled={busy} onClick={deleteCollection} type="button">
          {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />} Delete collection
        </button>
      ) : (
        <button className="secondary-button" disabled={busy} onClick={leaveCollection} type="button">
          {busy ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />} Leave collection
        </button>
      )}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}
