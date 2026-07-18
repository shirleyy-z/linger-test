"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Sparkles, TicketCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CollectionActions() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createCollection(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    const { data, error } = await supabase.rpc("create_collection", {
      collection_name: String(form.get("name") || "").trim(),
      collection_description: String(
        form.get("description") || ""
      ).trim(),
      collection_cover_emoji:
        String(form.get("emoji") || "📖").trim() || "📖",
    });

    setBusy(false);

    if (error || !data) {
      setMessage(error?.message ?? "Collection could not be created.");
      return;
    }

    router.push(`/dashboard/collections/${data}`);
    router.refresh();
  }

  async function joinCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const { data, error } = await supabase.rpc("join_collection_by_code", { code: String(form.get("code") || "").trim() });
    setBusy(false);
    if (error || !data) return setMessage(error?.message ?? "That invite code did not work.");
    router.push(`/dashboard/collections/${data}`); router.refresh();
  }

  return <section className="mt-7">
    <div className="flex flex-wrap gap-3"><button className="primary-button" onClick={() => setMode(mode === "create" ? "none" : "create")}><Plus size={18}/> New collection</button><button className="secondary-button" onClick={() => setMode(mode === "join" ? "none" : "join")}><TicketCheck size={18}/> Join with code</button></div>
    {mode === "create" && <form className="paper-soft mt-5 grid gap-4 rounded-3xl p-5 md:grid-cols-[90px_1fr]" onSubmit={createCollection}><label><span className="label">Cover</span><input className="input text-center text-2xl" defaultValue="📖" maxLength={16} name="emoji"/></label><div><label><span className="label">Collection name</span><input className="input" maxLength={80} name="name" placeholder="Graduation memories" required/></label><label className="mt-4 block"><span className="label">Description</span><textarea className="input min-h-24" maxLength={500} name="description" placeholder="A shared scrapbook for everyone who was there."/></label><button className="primary-button mt-4" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={18}/> : <Sparkles size={18}/>} Create scrapbook</button></div></form>}
    {mode === "join" && <form className="paper-soft mt-5 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-end" onSubmit={joinCollection}><label className="flex-1"><span className="label">Invite code</span><input className="input uppercase tracking-[.25em]" maxLength={12} name="code" placeholder="A1B2C3D4" required/></label><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={18}/> : <TicketCheck size={18}/>} Join</button></form>}
    {message && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
  </section>;
}

export function GenerateEventsButton({ collectionId }: { collectionId: string }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function run(){ setBusy(true); setMessage(""); const response=await fetch(`/api/collections/${collectionId}/group-events`,{method:"POST"}); const body=await response.json().catch(()=>({})); setBusy(false); if(!response.ok) return setMessage(body.error ?? "AI grouping failed."); setMessage(`Created ${body.count} event group${body.count === 1 ? "" : "s"}.`); router.refresh(); }
  return <div><button className="secondary-button" disabled={busy} onClick={run}>{busy?<LoaderCircle className="animate-spin" size={18}/>:<Sparkles size={18}/>} {busy?"Finding chapters…":"Group memories with Gemini"}</button>{message&&<p className="mt-2 text-sm text-[var(--muted)]">{message}</p>}</div>;
}
