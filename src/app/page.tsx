import Link from "next/link";
import { ArrowRight, CalendarClock, Images, Sparkles, Users } from "lucide-react";
import { ScrapbookPreview } from "@/components/scrapbook-preview";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    icon: Images,
    title: "Keep the full memory",
    text: "Save photos, diary entries, thoughts, letters, voice notes, and short videos."
  },
  {
    icon: Users,
    title: "Remember together",
    text: "Create private collections with friends, family, roommates, or a partner."
  },
  {
    icon: CalendarClock,
    title: "Bring it back later",
    text: "Choose a future date or let Linger resurface an older memory unexpectedly."
  },
  {
    icon: Sparkles,
    title: "Understand the year",
    text: "Gemini connects related memories into events and creates your yearly Wrapped."
  }
];

export default function LandingPage() {
  return (
    <main>
      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-8 md:grid-cols-[0.9fr_1.1fr] md:pt-16">
        <div>
          <div
            className="mb-5 inline-flex rounded-full border px-4 py-2 text-sm font-bold"
            style={{ background: "var(--cherry)", borderColor: "var(--peony)" }}
          >
            Some moments deserve to linger.
          </div>
          <h1 className="serif max-w-xl text-6xl leading-[0.98] tracking-[-0.04em] md:text-7xl">
            Keep the moments you want to meet again.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Linger is a private, collaborative scrapbook that helps you capture memories,
            organize shared moments, and revisit them after time has made them more meaningful.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="primary-button" href="/login">
              Start your scrapbook <ArrowRight size={17} />
            </Link>
            <a className="secondary-button" href="#features">
              Explore features
            </a>
          </div>
        </div>

        <ScrapbookPreview />
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="mb-9 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--fern-dark)]">
            What Linger does
          </p>
          <h2 className="serif mt-3 text-4xl md:text-5xl">
            A memory app designed around rediscovery
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article
              className="paper-soft rounded-3xl p-6"
              key={title}
              style={{
                transform: `rotate(${index % 2 === 0 ? "-0.4" : "0.4"}deg)`
              }}
            >
              <div
                className="grid h-11 w-11 place-items-center rounded-full"
                style={{
                  background: [
                    "var(--pistachio)",
                    "var(--cherry)",
                    "var(--bluebell)",
                    "var(--honey)"
                  ][index]
                }}
              >
                <Icon size={21} />
              </div>
              <h3 className="serif mt-5 text-3xl">{title}</h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
