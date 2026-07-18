import Link from "next/link";
import { Users } from "lucide-react";
import { CollectionActions } from "@/components/collections/collection-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("collections").select("*, collection_members(user_id)").order("created_at", { ascending: false });
  return <main className="mx-auto w-full max-w-6xl p-5 md:p-8">
    <header><p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">Shared scrapbooks</p><h1 className="serif mt-2 text-5xl">Collections</h1><p className="mt-3 max-w-2xl text-[var(--muted)]">Gather memories with friends, family, or someone special. A memory can live in more than one collection.</p></header>
    <CollectionActions/>
    {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">{error.message}</p>}
    {!error && (data?.length ?? 0) === 0 ? <section className="paper tape mt-9 rounded-[30px] p-10 text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">An empty shelf</p><h2 className="serif mt-3 text-4xl">Start a scrapbook together.</h2><p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">Create a collection and share its invite code, or join one someone made for you.</p></section> : <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data?.map((collection) => <Link className="collection-cover paper-soft" href={`/dashboard/collections/${collection.id}`} key={collection.id}><span className="collection-cover-emoji">{collection.cover_emoji}</span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--fern-dark)]">Shared scrapbook</p><h2 className="serif mt-2 text-3xl">{collection.name}</h2><p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{collection.description || "A place for the memories you share."}</p><p className="mt-5 flex items-center gap-2 text-sm font-bold"><Users size={16}/>{collection.collection_members.length} member{collection.collection_members.length === 1 ? "" : "s"}</p></div></Link>)}</section>}
  </main>;
}
