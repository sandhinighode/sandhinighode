# Inspiration Library: mobile app

The app connects to your Supabase database. You sign in with a code sent by email, and the app shows
your own saved items. These steps are written for **Windows + an Android phone**.

## Everyday routine

Open **Command Prompt** and run:

```
cd sandhinighode\mobile
git pull
npx expo start
```

Then scan the QR code with **Expo Go** on your phone (same Wi-Fi as the laptop). Keep the Command
Prompt window open while you use the app. `git pull` downloads the latest changes from GitHub.

---

## First-time setup

### 1. Database (Supabase website)

1. Sign up at **supabase.com** → **New project**. Save the database password somewhere safe.
2. Open **SQL Editor** → **New query**. Run each file below **in its own new query, once, in this order**
   (open the file on GitHub, copy all of it, paste, click **Run**):
   1. `supabase/migrations/20261001000000_create_saves.sql`
   2. `supabase/migrations/20261001010000_sample_saves_readable_without_login.sql`
   3. `supabase/migrations/20261004000000_remove_sample_saves_access.sql`

   Each should say "Success". If you already ran 1 and 2 (Milestone 1), run **only 3**.
   Running a file a second time gives "already exists" errors, which are harmless.

### 2. Turn on sign-in codes (Supabase website)

By default Supabase emails a link. We want a **code** you can type into the app.

1. In Supabase, go to **Authentication → Emails** (on some projects it's called **Email Templates**).
2. Open the **Magic Link** template. Replace its content with:
   ```html
   <h2>Your sign-in code</h2>
   <p>Enter this code in Inspiration Library: <strong>{{ .Token }}</strong></p>
   ```
   Click **Save**.
3. Do the same for the **Confirm signup** template, which is used the very first time you sign in.

### 3. Connect the app (your laptop)

Install once: **Node.js LTS** (nodejs.org) and **Git** (git-scm.com). Then, in **Command Prompt**:

```
git clone https://github.com/sandhinighode/sandhinighode.git
cd sandhinighode\mobile
npm install
copy .env.example .env
notepad .env
```

In Notepad, replace everything with your two values and save (**Ctrl+S**):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
```

You can build the URL from the project ID in your browser's address bar
(`supabase.com/dashboard/project/YOUR-PROJECT-ID`). The key is under **Project Settings → API Keys**
(**Publishable key**). **Never** use the `secret` / `service_role` key in the app.

Then start the app with `npx expo start`, and scan the QR code with **Expo Go** (Google Play Store).

### 4. Sign in (your phone)

1. The app shows **Sign in**. Type your email and tap **Send code**.
2. Open the email (check spam the first time) and type the code into the app. Tap **Sign in**.
3. You'll see your library. It says **"No saves yet"** until saving links arrives in the next step.
4. Close and reopen the app: you should still be signed in. **Sign out** is at the top right.

## Troubleshooting

| What you see | Fix |
|---|---|
| "Database not connected yet" | `.env` is missing or has the example values. Fix it, stop the server (Ctrl+C) and run `npx expo start --clear`. |
| The email has a link but no code | The email template wasn't changed (setup step 2). |
| No email arrives | Check spam. Supabase's free email sender allows only a few emails per hour, so wait a while and try again. |
| "Email rate limit exceeded" | Same as above: wait, then try again. |
| "Token has expired or is invalid" | The code was mistyped or is old. Tap **Use a different email**, send a new code and use the newest email. |
| "Couldn't load your library" + "permission denied" | Setup step 1.3 wasn't run, or you're signed out. Sign in again. |
| Expo Go can't connect or keeps loading | Phone and laptop on different networks, or a firewall. Try `npx expo start --tunnel`. |

## Developer checks

```
npm test            # screen, sign-in and database-query tests (fake database)
npm run typecheck   # TypeScript
npx expo lint       # code style
```
