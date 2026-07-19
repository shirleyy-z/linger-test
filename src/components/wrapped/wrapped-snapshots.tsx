import { CalendarDays, CloudSun, GlassWater, Layers, Palette, Snowflake, Sprout, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMonth, type Memory } from "@/lib/memories";
import { computeBusiestMonth, buildYearDigest, type WrappedSnapshots } from "@/lib/wrapped";
import { generateBusiestMonthCaption, generateWrappedVibe } from "@/lib/gemini/wrapped-snapshots";
import { computeDominantColor } from "@/lib/wrapped-color";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const SEASON_ICON = { spring: Sprout, summer: Sun, autumn: CloudSun, winter: Snowflake } as const;

export function WrappedSnapshotsSkeleton() {
  return (
    <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => <div className="paper-soft h-40 animate-pulse rounded-3xl" key={index} />)}
    </section>
  );
}

export async function WrappedSnapshots({ year, memories }: { year: number; memories: Memory[] }) {
  if (memories.length === 0) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cards: React.ReactNode[] = [];
  const snapshot = await loadOrCreateSnapshot(supabase, user.id, year, memories);

  if (snapshot) {
    if (snapshot.busiest_month && snapshot.busiest_month_count !== null) {
      cards.push(
        <article className="paper-soft rounded-3xl p-6" key="busiest-month">
          <CalendarDays className="text-[var(--fern-dark)]" size={22} />
          <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">Busiest month</p>
          <h3 className="serif mt-2 text-3xl">{formatMonth(snapshot.busiest_month)}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--fern-dark)]">{snapshot.busiest_month_count} memories</p>
          {snapshot.busiest_month_caption && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{snapshot.busiest_month_caption}</p>}
        </article>
      );
    }

    if (snapshot.dominant_color) {
      cards.push(
        <article className="paper-soft overflow-hidden rounded-3xl" key="dominant-color">
          <div className="h-24 w-full" style={{ background: snapshot.dominant_color }} />
          <div className="p-6">
            <Palette className="text-[var(--fern-dark)]" size={22} />
            <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">Your year in a colour</p>
            <p className="handwritten mt-2 text-2xl uppercase tracking-wide">{snapshot.dominant_color}</p>
          </div>
        </article>
      );
    }

    if (snapshot.drink) {
      cards.push(
        <article className="paper-soft rounded-3xl p-6" key="drink">
          <GlassWater className="text-[var(--fern-dark)]" size={22} />
          <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">Your personality as a drink</p>
          <h3 className="serif mt-2 text-3xl">{snapshot.drink}</h3>
          {snapshot.drink_reason && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{snapshot.drink_reason}</p>}
        </article>
      );
    }

    if (snapshot.season) {
      const SeasonIcon = SEASON_ICON[snapshot.season];
      cards.push(
        <article className="paper-soft rounded-3xl p-6" key="season">
          <SeasonIcon className="text-[var(--fern-dark)]" size={22} />
          <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">Your year in a season</p>
          <h3 className="serif mt-2 text-3xl capitalize">{snapshot.season}</h3>
          {snapshot.season_reason && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{snapshot.season_reason}</p>}
        </article>
      );
    }

    if (snapshot.memory_word) {
      cards.push(
        <article className="paper-soft flex flex-col items-center justify-center rounded-3xl p-6 text-center" key="word">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">Your memories in a word</p>
          <p className="handwritten mt-4 text-5xl">{snapshot.memory_word}</p>
        </article>
      );
    }
  }

  // Pure computation from memories already in hand — no Gemini, no caching needed, so it renders
  // as the 6th card even if the DB/Gemini-backed cards above failed entirely.
  const typeCounts = memories.reduce<Record<string, number>>((all, memory) => {
    all[memory.memory_type] = (all[memory.memory_type] ?? 0) + 1;
    return all;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topType) {
    cards.push(
      <article className="paper-soft rounded-3xl p-6" key="top-type">
        <Layers className="text-[var(--fern-dark)]" size={22} />
        <p className="mt-2 text-xs font-bold uppercase tracking-[.2em] text-[var(--muted)]">How you remembered</p>
        <h3 className="serif mt-2 text-3xl">Mostly through {topType[0]}</h3>
        <p className="mt-4 text-[var(--muted)]">Your most-used format appeared {topType[1]} times.</p>
      </article>
    );
  }

  if (cards.length === 0) return null;

  return <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cards}</section>;
}

async function loadOrCreateSnapshot(supabase: SupabaseClient, ownerId: string, year: number, memories: Memory[]): Promise<WrappedSnapshots | null> {
  const { data: existing } = await supabase.from("wrapped_snapshots").select("*").eq("owner_id", ownerId).eq("year", year).maybeSingle();
  const row = existing as WrappedSnapshots | null;

  // Each card backfills independently based on whether its own field is still null — a row
  // created by an earlier batch (e.g. busiest-month + colour only) still needs the newer cards
  // filled in here rather than being treated as "already generated" and skipped.
  const needsBusiestMonth = !row || row.busiest_month_caption === null;
  const needsColor = !row || row.dominant_color === null;
  const needsVibe = !row || row.drink === null;
  if (!needsBusiestMonth && !needsColor && !needsVibe) return row;

  const busiest = computeBusiestMonth(memories);
  const digest = buildYearDigest(memories);

  const [busiestResult, colorResult, vibeResult] = await Promise.allSettled([
    needsBusiestMonth && busiest
      ? generateBusiestMonthCaption(formatMonth(busiest.month), busiest.count, buildYearDigest(busiest.memories))
      : Promise.resolve(row?.busiest_month_caption ?? null),
    needsColor ? computeDominantColor(memories, supabase) : Promise.resolve(row?.dominant_color ?? null),
    needsVibe ? generateWrappedVibe(year, digest) : Promise.resolve(null)
  ]);

  if (busiestResult.status === "rejected") console.error("[wrapped-snapshots] busiest-month caption failed:", busiestResult.reason);
  if (colorResult.status === "rejected") console.error("[wrapped-snapshots] colour extraction failed:", colorResult.reason);
  if (vibeResult.status === "rejected") console.error("[wrapped-snapshots] vibe generation failed:", vibeResult.reason);

  const busiestMonthCaption = busiestResult.status === "fulfilled" ? busiestResult.value : row?.busiest_month_caption ?? null;
  const dominantColor = colorResult.status === "fulfilled" ? colorResult.value : row?.dominant_color ?? null;
  const vibe = vibeResult.status === "fulfilled" ? vibeResult.value : null;

  const { data: saved } = await supabase
    .from("wrapped_snapshots")
    .upsert(
      {
        owner_id: ownerId,
        year,
        busiest_month: busiest?.month ?? row?.busiest_month ?? null,
        busiest_month_count: busiest?.count ?? row?.busiest_month_count ?? null,
        busiest_month_caption: busiestMonthCaption,
        dominant_color: dominantColor,
        color_status: dominantColor ? "done" : "failed",
        drink: vibe?.drink.name ?? row?.drink ?? null,
        drink_reason: vibe?.drink.reason ?? row?.drink_reason ?? null,
        season: vibe?.season.value ?? row?.season ?? null,
        season_reason: vibe?.season.reason ?? row?.season_reason ?? null,
        memory_word: vibe?.word ?? row?.memory_word ?? null,
        gemini_status: busiestMonthCaption && (vibe || row?.drink) ? "done" : "failed",
        generated_at: new Date().toISOString()
      },
      { onConflict: "owner_id,year" }
    )
    .select("*")
    .single();

  return (saved as WrappedSnapshots) ?? row;
}
