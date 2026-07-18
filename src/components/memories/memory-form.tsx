"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Heart, ImagePlus, LoaderCircle, PenLine, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEMORY_TYPES, type Memory, type MemoryMedia, type MemoryType } from "@/lib/memories";
import { VoiceRecorder } from "@/components/memories/voice-recorder";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 12;
const ACCEPTED_TYPES = ["image/", "audio/", "video/"];

type CollectionOption = { id: string; name: string; cover_emoji: string; selected?: boolean };

export function MemoryForm({ memory, collections = [], initialCollectionId }: { memory?: Memory; collections?: CollectionOption[]; initialCollectionId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [favorite, setFavorite] = useState(memory?.is_favorite ?? false);
  const [memoryType, setMemoryType] = useState<MemoryType>(memory?.memory_type ?? "thought");
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [existingMedia, setExistingMedia] = useState<MemoryMedia[]>(memory?.memory_media ?? []);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(collections.filter((item) => item.selected || item.id === initialCollectionId).map((item) => item.id));

  const today = new Date().toISOString().slice(0, 10);
  const nowForInput = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const isWritingMode = memoryType === "diary" || memoryType === "letter";

  async function deleteAttachment(media: MemoryMedia) {
    if (!confirm(`Remove ${media.file_name} from this memory?`)) return;
    setDeletingId(media.id);
    setError("");

    const { error: storageError } = await supabase.storage.from("memories").remove([media.storage_path]);
    if (storageError) {
      setError(storageError.message);
      setDeletingId(null);
      return;
    }

    const { error: rowError } = await supabase.from("memory_media").delete().eq("id", media.id);
    if (rowError) {
      setError(rowError.message);
      setDeletingId(null);
      return;
    }

    setExistingMedia((items) => items.filter((item) => item.id !== media.id));
    setDeletingId(null);
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const selectedFiles = (form.getAll("media") as File[]).filter((file) => file.size > 0);
    const files = recordedFile ? [...selectedFiles, recordedFile] : selectedFiles;

    if (existingMedia.length + files.length > MAX_ATTACHMENTS) {
      setError(`A memory can contain up to ${MAX_ATTACHMENTS} attachments.`);
      setBusy(false);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is larger than 25 MB.`);
        setBusy(false);
        return;
      }
      if (!ACCEPTED_TYPES.some((prefix) => file.type.startsWith(prefix))) {
        setError(`${file.name} is not a supported image, audio, or video file.`);
        setBusy(false);
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const reminderValue = String(form.get("reminder_at") || "");
    const previousReminder = memory?.reminder_at ? new Date(memory.reminder_at).getTime() : null;
    const nextReminder = reminderValue ? new Date(reminderValue).getTime() : null;

    if (nextReminder !== null && nextReminder < Date.now() - 60_000) {
      setError("Choose a reminder time that is now or in the future.");
      setBusy(false);
      return;
    }

    const values = {
      owner_id: user.id,
      title: String(form.get("title") || "").trim(),
      body: String(form.get("body") || "").trim(),
      memory_type: memoryType,
      occurred_at: String(form.get("occurred_at") || today),
      reminder_at: reminderValue ? new Date(reminderValue).toISOString() : null,
      reminder_notified_at: previousReminder === nextReminder ? memory?.reminder_notified_at ?? null : null,
      letter_recipient: memoryType === "letter" ? String(form.get("letter_recipient") || "").trim() || null : null,
      letter_signoff: memoryType === "letter" ? String(form.get("letter_signoff") || "").trim() || null : null,
      is_favorite: favorite
    };

    let memoryId = memory?.id;
    if (memoryId) {
      const { error: updateError } = await supabase.from("memories").update(values).eq("id", memoryId);
      if (updateError) {
        setError(updateError.message);
        setBusy(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from("memories").insert(values).select("id").single();
      if (insertError || !data) {
        setError(insertError?.message ?? "The memory could not be created.");
        setBusy(false);
        return;
      }
      memoryId = data.id;
    }

    const { error: unlinkError } = await supabase.from("collection_memories").delete().eq("memory_id", memoryId);
    if (unlinkError) {
      setError(`The memory was saved, but its collections could not be updated: ${unlinkError.message}`);
      setBusy(false);
      return;
    }

    if (selectedCollections.length > 0) {
      const { error: linkError } = await supabase.from("collection_memories").insert(selectedCollections.map((collectionId) => ({ collection_id: collectionId, memory_id: memoryId, added_by: user.id })));
      if (linkError) {
        setError(`The memory was saved, but it could not be published to every collection: ${linkError.message}`);
        setBusy(false);
        return;
      }
    }

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${user.id}/${memoryId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("memories").upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(`The memory was saved, but ${file.name} failed to upload: ${uploadError.message}`);
        setBusy(false);
        return;
      }

      const { error: mediaError } = await supabase.from("memory_media").insert({
        memory_id: memoryId,
        owner_id: user.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      });

      if (mediaError) {
        await supabase.storage.from("memories").remove([storagePath]);
        setError(`The memory was saved, but ${file.name} could not be attached: ${mediaError.message}`);
        setBusy(false);
        return;
      }
    }

    router.push(`/dashboard/memories/${memoryId}`);
    router.refresh();
  }

  return (
    <form className="paper scrapbook-form relative rounded-[30px] p-6 md:p-9" onSubmit={handleSubmit}>
      <span className="washi-strip washi-green" aria-hidden="true" />
      <span className="corner-sticker" aria-hidden="true">✿</span>

      <div className="grid gap-6 md:grid-cols-2">
        <label><span className="label">Title</span><input className="input" defaultValue={memory?.title} maxLength={120} name="title" placeholder="A day worth keeping" required /></label>
        <label><span className="label">Kind of memory</span><select className="input" value={memoryType} name="memory_type" onChange={(event) => setMemoryType(event.target.value as MemoryType)}>{MEMORY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      </div>

      {memoryType === "letter" && <div className="mt-6 grid gap-6 md:grid-cols-2"><label><span className="label">Who is this letter for?</span><input className="input" defaultValue={memory?.letter_recipient ?? ""} maxLength={120} name="letter_recipient" placeholder="My future self, Mum, Alex…" /></label><label><span className="label">Sign-off</span><input className="input" defaultValue={memory?.letter_signoff ?? ""} maxLength={120} name="letter_signoff" placeholder="With love, Shirley" /></label></div>}

      <label className="mt-6 block">
        <span className="label"><PenLine className="mr-1 inline" size={16} /> {memoryType === "letter" ? "Write your letter" : memoryType === "diary" ? "Write your diary entry" : "What do you want to remember?"}</span>
        <textarea className={`input min-h-56 resize-y ${isWritingMode ? "lined-writing-paper" : ""}`} defaultValue={memory?.body} maxLength={10000} name="body" placeholder={memoryType === "letter" ? "Dear…\n\nWrite what you want them—or your future self—to remember." : memoryType === "diary" ? "Dear diary…\n\nWhat happened today? How did it feel?" : "Write the small details you might otherwise forget..."} />
      </label>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label><span className="label"><CalendarDays className="mr-1 inline" size={16} /> When did it happen?</span><input className="input" defaultValue={memory?.occurred_at ?? today} max={today} name="occurred_at" required type="date" /></label>
        <label><span className="label">Remind me again (optional)</span><input className="input" defaultValue={memory?.reminder_at?.slice(0, 16)} min={nowForInput} name="reminder_at" type="datetime-local" /><span className="mt-2 block text-xs text-[var(--muted)]">While Linger is open, a reminder appears on any dashboard page once this time arrives.</span></label>
      </div>

      {memoryType === "voice" && <div className="mt-6"><VoiceRecorder onRecording={setRecordedFile} /></div>}
      {collections.length > 0 && (
        <section className="mt-6 rounded-3xl border border-dashed border-[var(--fern)]/50 bg-white/35 p-5">
          <p className="label mb-1">Publish to collections</p>
          <p className="mb-4 text-sm text-[var(--muted)]">This memory can appear in as many shared scrapbooks as you choose.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {collections.map((collection) => {
              const checked = selectedCollections.includes(collection.id);
              return <label className={`collection-check ${checked ? "collection-check-selected" : ""}`} key={collection.id}><input checked={checked} onChange={() => setSelectedCollections((current) => checked ? current.filter((id) => id !== collection.id) : [...current, collection.id])} type="checkbox" /><span className="text-xl">{collection.cover_emoji}</span><span className="font-bold">{collection.name}</span></label>;
            })}
          </div>
        </section>
      )}


      {existingMedia.length > 0 && (
        <section className="mt-7">
          <p className="label">Current attachments ({existingMedia.length})</p>
          <div className="attachment-manager-grid">
            {existingMedia.map((media) => (
              <article className="attachment-manager-item" key={media.id}>
                {media.signed_url && media.mime_type.startsWith("image/") && <img alt={media.file_name} src={media.signed_url} />}
                {media.signed_url && media.mime_type.startsWith("audio/") && <audio controls src={media.signed_url} />}
                {media.signed_url && media.mime_type.startsWith("video/") && <video controls src={media.signed_url} />}
                <p title={media.file_name}>{media.file_name}</p>
                <button className="attachment-delete" disabled={deletingId === media.id || busy} onClick={() => deleteAttachment(media)} type="button"><Trash2 size={15} /> {deletingId === media.id ? "Removing…" : "Remove"}</button>
              </article>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Removing an attachment takes effect immediately, even before saving other edits.</p>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <label>
          <span className="label"><ImagePlus className="mr-1 inline" size={16} /> {memoryType === "voice" ? "Add audio, photos, or videos" : "Add photos, audio, or videos"}</span>
          <input accept="image/*,audio/*,video/*" className="input file:mr-4 file:rounded-full file:border-0 file:bg-[var(--fennel)] file:px-4 file:py-2 file:font-bold" multiple name="media" type="file" />
          <span className="mt-2 block text-xs text-[var(--muted)]">Choose several files at once. Up to {MAX_ATTACHMENTS} attachments per memory, 25 MB per file.</span>
        </label>
        <button className={`secondary-button ${favorite ? "bg-[var(--cherry)]" : ""}`} onClick={() => setFavorite((value) => !value)} type="button"><Heart fill={favorite ? "currentColor" : "none"} size={18} /> {favorite ? "Favourite" : "Mark favourite"}</button>
      </div>

      {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mt-8 flex flex-wrap gap-3"><button className="primary-button" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />} {busy ? "Saving..." : memory ? "Save changes" : "Keep this memory"}</button><button className="secondary-button" disabled={busy} onClick={() => router.back()} type="button">Cancel</button></div>
    </form>
  );
}
