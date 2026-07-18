import { MemoryForm } from "@/components/memories/memory-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewMemoryPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("collections").select("id, name, cover_emoji").order("created_at");
  return (
    <main className="mx-auto w-full max-w-4xl p-5 md:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--fern-dark)]">Capture a moment</p>
      <h1 className="serif mt-2 mb-7 text-5xl">Add a memory</h1>
      <MemoryForm collections={data ?? []} initialCollectionId={collection} />
    </main>
  );
}
