# Linger

An AI powered memory capsule. Preserve a moment, and years later see not just what happened, but who you were when it happened.

## Inspiration

Linger started from a familiar feeling: the sudden realization that a moment is already becoming a memory. It's the same feeling behind writing a letter to your future self, say before starting university, describing what you're nervous about and who matters to you right now. Opening that letter years later means something not because you remember writing it, but because you can see how much you've changed.

Linger brings that same experience to photos, letters, and voice memos. It's a private or shared scrapbook that preserves not just what happened, but who you were when it happened, and with Google Gemini, it helps surface the connections and change across all of it over time.

## Features

* **Memories timeline.** Thoughts, diary entries, photos, letters, voice memos, and videos, each backdated to when they actually happened rather than when they were uploaded. Includes a drag and drop scrapbook canvas layout, search and filter, reminders, and favourites.
* **Collections.** Shared scrapbooks joined by invite code, so friends, partners, or family can contribute their own photos and perspectives to the same collection. Sharing a memory into a collection never removes it from your own personal timeline, and other members only ever see what's explicitly shared, never your private entries.
* **Group memories with Gemini.** Inside a collection, Gemini reads each memory's title, description, type, and date, groups related ones into a larger event, and generates an event title, summary, theme, and scrapbook sticker suggestions.
* **Resurfacing.** Memories at least 30 days old can resurface on your dashboard, along with optional reminders you set yourself.
* **Wrapped.** A year end recap for any fully completed calendar year, generated once and cached rather than recomputed on every visit. It includes real stats (memory count, favourites, photo count, shared collections) plus six Gemini powered snapshot cards: busiest month with an AI caption, personality as a drink, year in a season, memories in a word, how you remembered (most used format), and a dominant colour swatch sampled from that year's actual photos.

## Tech stack

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
* **Backend:** Next.js Route Handlers and Server Components, with no separate server
* **Data:** Supabase, using Postgres with Row Level Security, Auth (email and password plus Google sign in), and Storage (private buckets, signed URLs)
* **AI:** Google Gemini API, called directly via REST with no SDK
* **Image processing:** `sharp` for server side work on Wrapped's colour card, and the browser Canvas API for client side upload compression

## Setup

1. Clone the repo and install dependencies:
   ```powershell
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the following:

   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project, under Settings then API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project, under Settings then API (publishable or anon key) |
   | `GEMINI_API_KEY` | Google AI Studio, under API keys |
   | `GEMINI_MODEL` | Defaults to `gemini-flash-latest`. Leave as is (see Known limitations) |

3. Run the database setup steps below against your Supabase project.
4. Start the dev server:
   ```powershell
   npm run dev
   ```
5. Visit `http://localhost:3000`.

## Database setup

Run these in order, once each, in the Supabase SQL Editor:

1. `supabase/schema.sql`: profiles and the auth trigger
2. `supabase/increment_2.sql`: memories, media attachments, and the private storage bucket with policies
3. `supabase/increment_3.sql`: reminders and letter fields
4. `supabase/increment_4.sql`: scrapbook canvas layout columns
5. `supabase/increment_5.sql`: multi attachment support
6. `supabase/increment_6.sql`: collections, membership, shared memories, AI event groups, and resurfacing history
7. `supabase/increment_7.sql`: lets collection co-members see each other's profile name and avatar
8. `supabase/increment_8.sql`: superseded, see increment_11
9. `supabase/increment_10.sql`: the `wrapped_snapshots` table backing the Wrapped snapshot cards

`supabase/test_collection_memory_isolation.sql` is a standalone privacy regression test, not a migration. It creates throwaway users inside a transaction, verifies collection and memory visibility rules, and rolls back automatically. It's safe to run anytime.

## Known limitations and what's next

These are carried over from our Devpost "what's next" section, checked against what's actually shipped since. None of them are built yet; all are still genuinely open.

* [ ] Customizable profiles, including an avatar, a personalized gradient image, and prompts encouraging people to share memories. Currently, avatars only come passively from Google OAuth profile data, and there's no in-app profile editing at all.
* [ ] Three original avatar options to choose between.
* [ ] Deploying Linger publicly for real shared use. Deployment status is still to be determined; confirm before publishing this line.
* [ ] Embedding songs or albums as a memory type. No music or Spotify integration exists yet; the memory type list is currently limited to thought, diary, photo, letter, voice, and video.