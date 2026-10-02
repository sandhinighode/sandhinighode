# Inspiration Library: mobile app

Milestone 1: the app connects to the Supabase database and shows the saved items it finds there.
These steps are written for **Windows + an Android phone**. They take about 20 minutes the first time.

## 1. Create the database (Supabase website)

1. Sign up at **supabase.com** → **New project**. Choose a name, a nearby region and a database
   password (save it somewhere safe). Wait about a minute for it to start.
2. Open **SQL Editor** (left sidebar) → **New query**. Run these three files **in this order**.
   For each one, open it from this repo on GitHub, copy all of it, paste it into the editor, and click **Run**:
   1. `supabase/migrations/20261001000000_create_saves.sql` creates the `saves` table
   2. `supabase/migrations/20261001010000_sample_saves_readable_without_login.sql` lets the app read sample rows
   3. `supabase/seed.sql` adds the test record

   Each one should say "Success. No rows returned".
3. Check: **Table Editor** → `saves` shows one row, "My first saved inspiration".
4. Get the two connection values. Click **Connect** at the top of the dashboard, or go to
   **Project Settings → API Keys / Data API**. Copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **publishable key** (`sb_publishable_…`) or, on older projects, the **anon public** key.
     **Never** use the `secret` or `service_role` key in the app.

## 2. Run the app on your laptop (Windows)

Install once: **Node.js LTS** (nodejs.org) and **Git** (git-scm.com). Use the default options.

Open **Command Prompt**. PowerShell can block npm with "running scripts is disabled", so Command Prompt is the safer choice. Then run:

```
git clone https://github.com/sandhinighode/sandhinighode.git
cd sandhinighode
git checkout claude/inspiration-library-architecture-q89elq
cd mobile
npm install
copy .env.example .env
notepad .env
```

In Notepad, replace the two example values with your Project URL and key, then save and close. Then start the app server:

```
npx expo start
```

A QR code appears. If Windows asks whether Node.js may use the network, allow it on **private networks**.

## 3. Open it on your Android phone

1. Install **Expo Go** from the Google Play Store. If it later says the project needs a newer SDK, update Expo Go.
2. Make sure the phone and laptop are on the **same Wi-Fi**.
3. Open Expo Go → **Scan QR code** → scan the code in Command Prompt.

**You should see** a screen titled **Inspiration Library** with one card: **My first saved inspiration**.

**To prove the data is live:** in Supabase **Table Editor**, change that row's `title`, then pull down
on the list in the app to refresh. The new title appears.

## Troubleshooting

| What you see | Fix |
|---|---|
| "Database not connected yet" | `.env` is missing or still has the example values. Fix it, then stop the server (Ctrl+C) and run `npx expo start --clear`. |
| "No saves yet" | The seed file (step 1.2.3) wasn't run, or step 1.2.2 was skipped. Run them in the SQL editor. |
| "Couldn't load your library" + "Invalid API key" | The key in `.env` is wrong. Copy it again (step 1.4). |
| "Couldn't load…" + "relation … saves does not exist" | Step 1.2.1 wasn't run. |
| Expo Go can't connect or keeps loading | Phone and laptop on different networks, or a firewall. Try `npx expo start --tunnel`. |

## Developer checks

```
npm test            # screen + database-query tests (fake database)
npm run typecheck   # TypeScript
npx expo lint       # code style
```
