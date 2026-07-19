import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMemoryDate, type Memory } from "@/lib/memories";
import { buildYearDigest, getLastCompletedYear, type WrappedReport } from "@/lib/wrapped";
import { generateWrappedInsights } from "@/lib/gemini/wrapped";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function WrappedInsightsSkeleton() {
  return (
    <section className="paper mt-7 animate-pulse rounded-[30px] p-8 md:p-12">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Your year, retold</p>
      <div className="mt-5 space-y-3">
        <div className="h-4 w-full rounded bg-[var(--line)]/50" />
        <div className="h-4 w-5/6 rounded bg-[var(--line)]/50" />
        <div className="h-4 w-4/6 rounded bg-[var(--line)]/50" />
      </div>
    </section>
  );
}

export async function WrappedInsights({ year, memories }: { year: number; memories: Memory[] }) {
  // Defensive re-check: this component writes to the DB and calls a paid API, so it should
  // never trust a caller to have applied the year-completion gate correctly.
  if (year > getLastCompletedYear() || memories.length < 2) return null;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const report = await loadOrCreateReport(supabase, user.id, year, memories);
  if (!report || report.status !== "done") {
    return (
      <section className="paper mt-7 rounded-[30px] p-7 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Your year, retold</p>
        <p className="mt-4 text-[var(--muted)]">We couldn&apos;t put your recap together this time. Refresh to try again.</p>
      </section>
    );
  }

  const before = memories.find((memory) => memory.id === report.callback_before_memory_id);
  const after = memories.find((memory) => memory.id === report.callback_after_memory_id);
  const [beforeThumb, afterThumb] = await Promise.all([signFirstPhoto(supabase, before), signFirstPhoto(supabase, after)]);

  return (
    <>
      <section className="paper tape mt-7 rounded-[30px] p-8 md:p-12">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Your year, retold</p>
        <p className="handwritten mt-5 text-2xl leading-10 md:text-[1.7rem]">{report.narrative}</p>
      </section>

      {before && after && report.callback_text && (
        <section className="paper-soft then-now-card mt-7 rounded-[30px] p-7 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--fern-dark)]">Then vs. now</p>
          <div className="then-now-row mt-6">
            <ThenNowPolaroid label={formatMemoryDate(before.occurred_at)} thumb={beforeThumb} title={before.title} rotate="-3deg" />
            <div className="then-now-connector">
              <ArrowRight size={22} />
            </div>
            <ThenNowPolaroid label={formatMemoryDate(after.occurred_at)} thumb={afterThumb} title={after.title} rotate="3deg" />
          </div>
          <p className="handwritten mt-6 text-center text-xl leading-8">{report.callback_text}</p>
        </section>
      )}
    </>
  );
}

function ThenNowPolaroid({ label, thumb, title, rotate }: { label: string; thumb: string | null; title: string; rotate: string }) {
  return (
    <div className="polaroid then-now-photo" style={{ transform: `rotate(${rotate})` }}>
      {thumb ? (
        <img alt={title} className="then-now-image" src={thumb} />
      ) : (
        <div className="then-now-fallback">
          <p className="serif">{title}</p>
        </div>
      )}
      <p className="mt-2 text-center text-xs font-bold text-[var(--muted)]">{label}</p>
    </div>
  );
}

async function signFirstPhoto(supabase: SupabaseClient, memory?: Memory) {
  const photo = memory?.memory_media.find((media) => media.mime_type.startsWith("image/"));
  if (!photo) return null;
  const { data } = await supabase.storage.from("memories").createSignedUrl(photo.storage_path, 3600);
  return data?.signedUrl ?? null;
}

async function loadOrCreateReport(
  supabase: SupabaseClient,
  ownerId: string,
  year: number,
  memories: Memory[]
): Promise<WrappedReport | null> {
  const { data: existing } = await supabase.from("wrapped_reports").select("*").eq("owner_id", ownerId).eq("year", year).maybeSingle();
  if (existing) return existing as WrappedReport;

  const digest = buildYearDigest(memories);
  try {
    const insights = await generateWrappedInsights(year, digest);
    const { data: inserted } = await supabase
      .from("wrapped_reports")
      .upsert(
        {
          owner_id: ownerId,
          year,
          narrative: insights.narrative,
          callback_before_memory_id: insights.callback.before_memory_id,
          callback_after_memory_id: insights.callback.after_memory_id,
          callback_text: insights.callback.text,
          status: "done",
          generated_at: new Date().toISOString()
        },
        { onConflict: "owner_id,year" }
      )
      .select("*")
      .single();
    return (inserted as WrappedReport) ?? null;
  } catch {
    const { data: failed } = await supabase
      .from("wrapped_reports")
      .upsert({ owner_id: ownerId, year, status: "failed" }, { onConflict: "owner_id,year" })
      .select("*")
      .single();
    return (failed as WrappedReport) ?? null;
  }
}
