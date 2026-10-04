# Development Plan: Personal Inspiration Library

_Last updated: 2026-10-04_

This is the agreed architecture and build plan. It is written for a product/UX designer
building with Claude Code. Each milestone is small enough to build, test on your own
phone and use before the next one starts.

---

## 1. Product summary

One personal library for things you save from Instagram, YouTube, Pinterest, webpages
and bookmarks, so saved content stops getting lost across apps.

Long-term capabilities, built in this order of priority:

1. Capture saved content from multiple sources.
2. Use AI to understand and automatically organize it.
3. Search and chat with your saved content.
4. Proactively resurface relevant content.
5. Siri and Gemini voice interactions.
6. Turn inspiration into habits and actions.
7. Later, and optional: connect people with similar interests, based only on saves they
   explicitly choose to share.

**We are not building all of this now.** The MVP is capture, library, organize, keyword
search and rule-based resurfacing, with **no AI**. Everything else is added in later
milestones on top of the same foundation.

---

## 2. Agreed decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | **One codebase for Android and iOS** (Expo / React Native, TypeScript) | One app to build. You use an Android phone daily; iPhone users and your iPad are covered by the same code. |
| D2 | **Day-to-day testing on your Android phone**; iOS checked on your iPad via TestFlight | You're the main user, and you won't use something that isn't on your own phone. No Mac needed: iOS builds run in Expo's cloud. |
| D3 | **Supabase as the backend** (database, login, file storage, server functions) | Hosted and free to start. No servers to manage, and everything is visible in a web dashboard. |
| D4 | **MVP has no AI** | The core value (one place for everything) works without AI. It's cheaper, has fewer privacy questions, and real saved data will show where AI actually helps. |
| D5 | **Cloud AI later, through one swappable server function** | Cloud AI is much better than on-device AI and works the same on every device. Keeping it in one place means we can change provider, cap costs or switch it off. |
| D6 | **Audience: you plus a few testers** (private beta) | Real accounts and cloud sync, but no billing, scaling or public-launch work yet. |
| D7 | **Free tiers wherever possible** | See section 9. The only unavoidable cost is Apple's $99/year, and only when iOS testing starts. |

---

## 3. Technology stack

| Layer | Choice | Plain English |
|-------|--------|---------------|
| Mobile app | **Expo (React Native) + TypeScript** | Expo is a toolkit that turns one set of code into an Android app and an iPhone app. TypeScript is JavaScript with spell-check: it catches many mistakes before the app runs, which matters a lot when an AI writes the code. |
| Navigation | **Expo Router** | Screens are files in folders, so the app structure mirrors the folder structure. |
| Receiving shares | **`expo-share-intent`** (or the current equivalent) | Makes the app appear in the Share menu of Instagram, YouTube, Pinterest, Chrome and Safari. |
| Local data and caching | **TanStack Query** | Keeps the library fast and handles loading, refreshing and offline-ish behavior. |
| Backend | **Supabase** | A hosted Postgres database plus login, file storage, server functions and scheduled jobs. |
| Login | **Supabase Auth** (6-digit email code, then Google and Apple sign-in later) | Users type a code we email them, so you don't build password handling. |
| Server logic | **Supabase Edge Functions** (TypeScript) | Small pieces of code that run on Supabase's servers, e.g. "fetch the preview for this link". |
| Scheduled jobs | **Supabase Cron** | "Every morning at 8, pick something to resurface." |
| Push notifications | **Expo Push Notifications** | Free and works for both platforms through one service. |
| App builds and distribution | **EAS Build** (Expo's cloud builder) + TestFlight (iOS) + direct APK install (Android testers) | Builds the app in the cloud, so no Mac is needed. |
| Code hosting | **GitHub** (this repository) | Stores every version of the code. Claude Code works here. |
| AI (later) | **Anthropic Claude API**, called only from an Edge Function | Tagging, summaries and chat. The API key never lives inside the app. |
| Meaning-search vectors (later) | **Supabase built-in embedding model** (runs inside Edge Functions) + **pgvector** | Turns each item into numbers that represent its meaning, for "find things like this". Free, and runs in our existing Supabase project. |

### Options we ruled out
- **Separate native apps (Swift + Kotlin):** two codebases. Too much for a solo builder.
- **Flutter:** capable, but it uses a less common language, and Claude Code has less example
  code to draw on for share-sheet integrations.
- **Web app / PWA:** iPhone web apps cannot appear in the Share menu, and that is the core action.
- **Firebase:** a reasonable alternative, but its NoSQL database makes search, filtering and AI
  features harder. Supabase uses standard SQL, which Claude Code handles very well.
- **On-device AI:** works only on recent flagship devices, uses different systems on Apple and
  Android, needs native code, gives weaker results, and doesn't sync between your phone and iPad.

---

## 4. System architecture

```
 ┌───────────────────────── Phone / iPad ─────────────────────────┐
 │                                                                │
 │  Instagram / YouTube / Pinterest / Browser                     │
 │        │  "Share →"                                            │
 │        ▼                                                       │
 │  ┌──────────────────────── Our app (Expo) ──────────────────┐  │
 │  │  Share receiver ─► Quick-save screen (add note/collection)│ │
 │  │  Library · Item detail · Collections · Search · Settings  │ │
 │  └───────────────────────────┬──────────────────────────────┘  │
 └──────────────────────────────┼─────────────────────────────────┘
                                │ HTTPS (logged-in user only)
 ┌──────────────────────────────▼───────────── Supabase ──────────┐
 │  Auth ─ who you are                                            │
 │  Postgres database ─ items, collections, tags (row-level       │
 │                       security: users only ever see own rows)  │
 │  Storage ─ thumbnail images                                    │
 │  Edge Functions:                                               │
 │     • enrich-item   → fetches title/image/description for URL  │
 │     • resurface     → picks items for the daily nudge          │
 │     • ai-*  (LATER) → the ONLY place that talks to Claude API  │
 │  Cron ─ runs `resurface` on a schedule                         │
 └───────────────┬─────────────────────────────┬──────────────────┘
                 │                             │
       Expo Push service               Claude API (LATER)
     (notifications to phone)
```

### How a save works (MVP)
1. You tap **Share → Inspiration Library** in Instagram, for example.
2. The app opens a small quick-save screen. The item is saved straight away with just the
   URL and whatever text the source app passed along.
3. The database marks the item `pending` and calls the `enrich-item` function.
4. `enrich-item` fetches the page's preview data (title, description, image, author),
   stores a copy of the thumbnail, detects the source (Instagram, YouTube and so on), turns
   hashtags into tags and marks the item `ready`.
5. The library updates and shows the card.

Saving never waits on step 4. If enrichment fails, for example because a site blocks it,
the item still exists with its URL and can be retried.

### Principles that keep later features cheap to add
- **The app never talks to outside services directly.** Everything goes through our Edge
  Functions, so outside services can be swapped or capped in one place.
- **Every item has a processing `status`.** Later steps such as AI tagging and embeddings
  become extra steps in the same pipeline.
- **Every tag records where it came from** (`user`, `hashtag`, `rule`, and later `ai`). AI
  suggestions slot in alongside your own tags without overwriting them.
- **Privacy by default.** Row-level security in the database means a bug in the app still
  can't show one user another user's data. Sharing (milestone 12) will be an explicit,
  per-item opt-in.

---

## 5. Core data model

These are the MVP tables. Tables for later milestones are listed separately so the
design leaves room for them; they are **not** created until their milestone.

### MVP tables

**`profiles`**: one row per user (login itself is handled by Supabase Auth)
| Field | Meaning |
|---|---|
| `id` | Same ID as the login account |
| `display_name` | Optional |
| `timezone` | So the daily resurfacing arrives at a sensible local time |
| `push_token` | Where to send notifications |
| `created_at` | |

**`saves`** (called `items` in earlier drafts): one saved thing. Created in `supabase/migrations/`.
Columns built so far: id, user_id, url, canonical_url, shared_text, source, content_type, title,
description, thumbnail_url, author_name, author_url, site_name, source_metadata, status,
processing_error, processed_at, created_at, updated_at. The other columns below arrive with their milestones.
| Field | Meaning |
|---|---|
| `id` | Unique ID |
| `user_id` | Owner. Required (it was briefly optional in M1 for a sample row; M1b made it required again). |
| `url` | Exactly what was shared |
| `canonical_url` | Cleaned-up URL (tracking junk removed), used to catch duplicates |
| `source` | `instagram`, `youtube`, `pinterest`, `web` or `other` |
| `content_type` | `video`, `image`, `article`, `post` or `unknown` |
| `title`, `description`, `author_name` | From the link preview |
| `thumbnail_url` | Preview image link. (Copying images into our own storage is a later step, because Instagram image links expire.) |
| `shared_text` | Any text the source app included when sharing |
| `note` | Your own note |
| `status` | `pending`, `ready` or `failed` (enrichment progress) |
| `is_archived` | Hidden from the main library without deleting |
| `last_opened_at`, `open_count` | Used by resurfacing rules |
| `created_at`, `updated_at` | |
| _search index_ | Generated full-text search column over title, description, note and shared text |

The same URL can't be saved twice by the same user (`user_id` + `canonical_url` is unique).

**`collections`**: your folders or boards
| `id` · `user_id` · `name` · `emoji_or_color` · `sort_order` · `created_at` |
|---|

**`item_collections`**: which items are in which collections (an item can be in several)
| `item_id` · `collection_id` · `added_at` |
|---|

**`tags`**
| `id` · `user_id` · `name` |
|---|

**`item_tags`**
| `item_id` · `tag_id` · `origin` (`user`, `hashtag`, `rule`; later `ai`) · `confidence` (later, for AI) |
|---|

**`resurface_events`**: what was shown to you and how you reacted
| `id` · `user_id` · `item_id` · `reason` (e.g. `on_this_day`, `not_opened_30d`) · `shown_at` · `action` (`opened`, `dismissed`, `snoozed` or none) |
|---|

### Tables added in later milestones (not built now)
| Milestone | Table or change | Purpose |
|---|---|---|
| M7 AI organize | `item_ai` (summary, extracted topics, model used, processed_at) | AI understanding of each item |
| M8 Search and chat | `item_embeddings` (vector) | Search by meaning |
| M8 Search and chat | `chat_threads`, `chat_messages` (with cited `item_id`s) | Chat history with links back to sources |
| M11 Habits | `actions` (item_id, title, schedule, status), `action_checkins` | Turning an item into a habit or reminder |
| M12 Social | `shared_items` (explicit opt-in per item or collection), `connections` | Opt-in sharing and matching |

---

## 6. External APIs and services

| Service | Needed for | When | Cost to start |
|---|---|---|---|
| Supabase | Database, login, storage, functions, cron | M0 | Free tier |
| Expo / EAS | Builds, over-the-air updates, push notifications | M0 | Free tier |
| GitHub | Code hosting | M0 | Free |
| Open Graph / page metadata (fetched by our own function) | Link previews for websites | M2 | Free |
| YouTube oEmbed | Reliable YouTube titles and thumbnails, no key needed | M2 | Free |
| Pinterest oEmbed or page metadata | Pin previews | M2 | Free |
| Instagram oEmbed (Meta Graph API) | Better Instagram previews (needs a Meta developer app with review) | Optional, after M2 | Free, but needs approval |
| Apple Developer Program | iOS builds on your iPad, TestFlight testers, Siri | M5 | **$99/year** |
| Google Play Console | Play Store testing track | Optional; testers can install an APK directly | $25 once |
| Anthropic Claude API | Tagging, summaries, chat | M7+ | Pay per use (see section 9) |
| Supabase built-in embeddings + pgvector | Search by meaning | M8 | Free (part of Supabase) |
| Apple App Intents (Siri) | Voice on iOS | M10 | Free (native code) |
| Android App Actions / Gemini integration | Voice on Android | M10 | Free; Google's support for this is limited and changing |
| Pinterest API v5, YouTube Data API | Optional bulk imports | Optional milestone | Free, but needs approval or quotas |

---

## 7. Features that are hard because of platform or API restrictions

| Area | The restriction | What we do about it |
|---|---|---|
| **Instagram import** | Instagram has **no API for reading a person's saved posts**. The old personal-account API was shut down, and scraping is against its terms and gets blocked. | Capture **one item at a time through the Share menu**. Optional later: import the "Saved" list from Instagram's *Download your information* export file. |
| **Instagram previews** | Instagram pages often show a login wall to servers, so titles and images may come back empty. Image links from Instagram's servers also expire. | Save the shared text plus the URL, and show a branded placeholder card. Copy thumbnails into our storage when we can get them. Optional Meta oEmbed after app review. |
| **YouTube "Watch Later"** | Not available through YouTube's API. "Liked videos" and your own playlists are. | Use the Share menu. Optional later: import playlists through the YouTube Data API. |
| **YouTube transcripts** (for AI later) | No official API for captions on videos you don't own. | AI works from the title, description and your note. Revisit at M7. |
| **Pinterest import** | The API requires an approved developer app, with trial access first. | Use the Share menu. Optional import milestone later. |
| **Browser bookmarks** | Mobile browsers don't let other apps read bookmarks. | Use the Share menu for new saves. Optional later: import a bookmarks HTML file exported from desktop Chrome or Safari. |
| **Websites blocking previews** | Paywalls, bot protection and pages built with JavaScript can return nothing useful. | Keep the URL, mark the item `failed`, offer a retry and let you edit the title. |
| **iOS share extension** | Runs in a separate, memory-limited mini-app and can't be tested in Expo Go (it needs a custom build). | Keep the share screen minimal, saving the URL plus note only. Heavy work happens on the server. |
| **Background work on phones** | iOS and Android limit what apps can do in the background. | Everything scheduled (resurfacing, processing) runs on the server and reaches the phone as push notifications. |
| **Siri** | Requires Apple's App Intents, written in native Swift code. | M10, via an Expo native module. Start with fixed commands such as "Save to Inspiration" and "Show my Recipes collection". |
| **Gemini on Android** | Google's ways for third-party apps to plug into Gemini are limited and keep changing. | Treat as best effort at M10: Android App Actions / app shortcuts first, and re-check what Google offers at the time. |
| **App Store rules** | Apple requires in-app account deletion, a privacy policy, and disclosure of (and consent for) sending personal data to third-party AI. Social features need report and block tools. | Account deletion and privacy policy in M5. AI consent screen in M7. Moderation tools in M12. |

---

## 8. Build order (milestones)

Each milestone ends with something you use on your own phone. Only start the next one
when the current one works.

### MVP (no AI)

**M1 · Foundation: app ↔ database** ✅ _done 2026-10-03: confirmed on the user's Android phone (absorbs the old M0)_
- Expo app in `mobile/` (TypeScript, Expo Router, SDK 57). Runs in **Expo Go** on your Android phone
  from a Windows laptop. One screen, "Inspiration Library", lists saves from the database.
- Supabase connection through `mobile/.env` (project URL + publishable key; see `mobile/.env.example`).
- `saves` table (migration), one test record (`supabase/seed.sql`), and a **temporary** rule that lets
  the app read sample rows (no owner) without login. Read-only; real users' rows stay private.
- Tests: app screen and query tests (`cd mobile && npm test`), type-check, lint, Android bundle build,
  and SQL checks of the database rules (`tests/sql/run.sh`).
- _Done when:_ the test record "My first saved inspiration" appears in the app on your phone.
  → **Setup and verification steps: `mobile/README.md`.**
- `CLAUDE.md` added with the working rules for every session (read the plan and READMEs first,
  get approval before coding, test and update this plan afterwards).
- Not yet done from the old M0: an Expo account / development build (needed only for the Share menu, in M1b).

**M1b · Accounts and capture (Android)**: built in three steps, each checked on your phone
- **Step 1 · Login** 🟡 _built 2026-10-04; waiting for your on-phone check_. Sign in with a 6-digit email code,
  stay signed in, sign out. Migration `20261004000000_remove_sample_saves_access.sql` removes the temporary
  M1 sample-row rule and the test record, and makes `user_id` required again. Logged-out users get no access.
- **Step 2 · Link reader on** _(not started)_: deploy the `ingest-url` function, plus a "Paste a link" box in
  the library.
- **Step 3 · Share menu** _(not started)_: a development build (instead of Expo Go) so the app appears in
  Android's Share menu. Shared links go through `ingest-url`.
- _Done when:_ you share from Instagram, YouTube, Pinterest and Chrome, and each item appears in the list.

**M2 · Rich previews** _(backend built early on 2026-10-01: `ingest-url` function + source adapters; not deployed or connected to the app yet)_
- `enrich-item` function: page metadata, YouTube and Pinterest oEmbed, source and content-type
  detection, stored thumbnails, duplicate detection.
- Card grid UI, item detail screen and "Open original".
- _Done when:_ most saves show a proper title and image. Failures show a placeholder card and can be retried.

**M3 · Organize**
- Collections (create, rename, reorder, add or remove items), tags, notes, archive, delete.
- Automatic tags from hashtags. Automatic grouping and filtering by source.
- Quick-save screen: choose a collection or add a note while sharing.
- _Done when:_ you can keep your real saves tidy without friction.

**M4 · Search**
- Keyword search over titles, descriptions, notes, shared text and tags.
- Filters: source, content type, collection, tag, date.
- _Done when:_ you can find things you remember a word from.

**M5 · iOS and beta readiness**
- Apple Developer account ($99). iOS share extension. TestFlight build installed on your iPad.
- In-app account deletion, privacy policy page (free hosting) and basic onboarding.
- Invite testers: iOS through TestFlight, Android through a direct APK link.
- _Done when:_ a tester on iPhone and a tester on Android can each save and browse.

**M6 · Rule-based resurfacing**
- Daily push notification ("From your library") chosen by rules: on this day, not opened in 30+
  days, random pick from a favorite collection.
- A "Rediscover" section in the app. Open, dismiss and snooze are recorded in `resurface_events`.
- _Done when:_ you rediscover forgotten saves at least a few times a week.

**🎯 MVP complete.** Use it for a few weeks and review which organizing and finding problems remain
before adding AI.

### After the MVP (AI and beyond)

**M7 · AI organization (cloud AI)**: consent screen, `ai-enrich` function, summaries,
suggested tags and collections (shown as suggestions you can accept), cost caps.

**M8 · Search by meaning, and chat**: embeddings, "find similar", natural-language search,
then chat over your library with every answer linking to the items it used.

**M9 · Smart resurfacing**: relevance based on recent saves and your reactions in
`resurface_events`.

**M10 · Voice**: Siri App Intents first (save, open a collection, search), then Android and
Gemini, as far as Google's tools allow.

**M11 · Habits and actions**: turn an item into a reminder or recurring action, with check-ins.
AI-suggested steps are optional.

**M12 · Opt-in social (optional)**: share chosen items or collections, find people with
overlapping shared interests, report and block tools. Nothing is shared unless you choose it.

**Optional: bulk imports** (can slot in after M6): Instagram data-export file, browser
bookmarks HTML, Pinterest boards, YouTube playlists.

---

## 9. Costs

Prices are approximate as of October 2026. Free-tier limits change, so check each provider's
pricing page before relying on a number.

### MVP (M0–M6): about $0 until iOS, then $99/year

| Item | Cost | Notes |
|---|---|---|
| Expo + EAS | **$0** | The free plan includes a limited number of cloud builds per month (around 30, fewer for iOS) and free push notifications. We only build when a milestone needs a new native build; most changes reload instantly in development. |
| Supabase | **$0** | Free tier: roughly 500 MB database, 1 GB file storage, 50k monthly users and generous function calls. Thousands of saved items with thumbnails fit comfortably. **Catch:** free projects pause after about a week with no activity (one click to resume), and there are no automatic backups. |
| GitHub | **$0** | Private repositories are free. |
| Privacy policy hosting | **$0** | GitHub Pages or a public Notion page. |
| Android testers | **$0** | Install via a direct APK link. Google Play ($25 once) is optional. |
| Apple Developer Program | **$99/year** | Required to install on your iPad or any iPhone via TestFlight. Unavoidable for iOS; only needed from M5. |
| Claude Code | Your existing Claude plan | Usually the biggest real cost of building. It isn't part of the app's running cost. |

### Later: AI costs (M7+), pay per use with no monthly minimum

Estimates use current Claude API pricing (Claude Haiku 4.5: $1 per million input tokens,
$5 per million output; Claude Sonnet 5.5: $2 in, $10 out). A "token" is about ¾ of a word.

| Task | Rough cost |
|---|---|
| AI-tag and summarize one saved item | ~$0.002–0.003 (≈ **$2–3 per 1,000 items**; about half that if processed overnight in batches) |
| Embeddings for search by meaning | **$0**, using Supabase's built-in model |
| One chat question over your library | ~$0.01–0.03 |
| You plus 5 testers, normal use | Likely **under $5/month** |

Safeguards: a hard monthly spending limit in the Anthropic console, per-user daily limits in
our function, and the cheapest model that gives good results for each task.

### When we would start paying for hosting
- **Supabase Pro (~$25/month):** only if we need no-pause projects, daily backups or more
  storage. Probably not before a public launch.
- **EAS paid plan:** only if we regularly run out of free builds.

### Free alternatives considered
- **Free AI tiers (e.g. Google Gemini's free API tier):** possible, but free tiers typically allow
  the provider to use your data to improve its models. That conflicts with a private library, so
  not recommended for real user content.
- **Self-hosting everything (own server or database):** "free" software, but you'd pay in setup,
  security and maintenance time, which is a poor trade for a solo non-engineer.

---

## 10. Working with Claude Code on this project

- **One milestone or sub-task per session.** Claude Code reads `CLAUDE.md` automatically. It says to
  read this plan and the relevant README before any coding, and to wait for your approval.
- **Test on your phone after every change.** If something is off, describe what you see
  (screenshots help) rather than guessing at code.
- **Keep secrets out of the code.** API keys go in Supabase or EAS secret settings, never in the app.
- **Database changes are migrations.** Every change to tables is a versioned file in the repo,
  so the database can always be rebuilt and changes can be reviewed.
- **Commit small and often.** Every working step is saved in git, so it's easy to go back.
- **Update this plan** when a decision changes. Add it to the decision log below.

---

## 11. Decision log

| Date | Decision |
|---|---|
| 2026-10-01 | D1–D7 agreed: Expo + Supabase; both platforms, Android-first daily testing; MVP without AI; cloud AI later through one swappable function; private beta audience; free tiers wherever possible. |
| 2026-10-01 | M1 redefined as the minimal foundation (app ↔ database, one test record), replacing M0. Login and capture move to M1b. No login in M1, so sample rows (`user_id` null) are readable without login through a clearly marked temporary policy, to be removed in M1b. Development machine: Windows laptop + Android phone with Expo Go. |
| 2026-10-01 | Hosted Supabase project (free tier) instead of running Supabase locally, so no Docker install is needed. Database changes are applied by pasting migration files into the Supabase SQL editor until we adopt the Supabase CLI. |
| 2026-10-03 | M1 confirmed on device: hosted Supabase project set up via the SQL editor, app run from Windows in Expo Go, and a title edited in Supabase showed up in the app. |
| 2026-10-04 | M1b login uses a **6-digit email code** instead of a magic link: it works in Expo Go and avoids fragile email→app deep links. Supabase's email templates must include `{{ .Token }}`. The built-in Supabase email sender is rate-limited, which is fine for one user; a proper email service is needed before testers (M5). |
| 2026-10-04 | M1b adds a **"Paste a link" box** to the library: it lets the link reader be tested before the Share menu exists and stays useful as a fallback (e.g. on iPad). `supabase/seed.sql` was removed, since sample rows no longer exist. |
| 2026-10-02 | Working rule added in `CLAUDE.md`: always read DEVELOPMENT_PLAN.md and the relevant README before coding, propose changes and wait for approval, then test and update this plan. A milestone gets ✅ only after the on-phone check. |
| 2026-10-01 | M2 URL ingestion built ahead of M0/M1 as a backend-only Edge Function (`ingest-url`). The table is named `saves`. One adapter per source (`youtube`, `instagram`, `pinterest`, `web`) sits on top of one shared Save model; platform-specific extras go in `source_metadata`. Thumbnails are stored as remote URLs for now. |

## 12. Open questions (decide at the relevant milestone)

- **M1b:** Product name and app icon (needed for the Share-menu label). The placeholder name is "Inspiration Library".
- **M5:** Which testers, and on which devices?
- **M7:** Final AI provider and model choice, tested on your real saved items.
- **M10:** Re-check Google's current options for third-party apps in Gemini.
- **M12:** Whether social features happen at all, and their privacy rules.
