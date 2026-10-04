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

### 2. Sign-in emails (Brevo + Supabase websites)

Supabase's built-in email can only send links, but the app needs a **code**. So Supabase sends its emails
through **Brevo** (free: 300 emails a day), which also unlocks editing the email templates.

1. **Brevo account:** sign up at **brevo.com** (free plan).
2. **Verify yourself as sender:** in Brevo, go to the top-right menu → **Senders, Domains & Dedicated IPs** →
   **Senders** → **Add sender**. From name **Inspiration Library**, plus your email address. Click the link in
   the confirmation email.
3. **SMTP key:** in Brevo, go to the top-right menu → **SMTP & API** → **SMTP** tab. Note the **Login**
   (looks like `…@smtp-brevo.com`). Click **Generate a new SMTP key** (choose **Standard**) and name it
   **Supabase Inspiration Library**. Copy it now, because it's shown only once. Never put it in the app or in a chat.
4. **Connect Supabase:** in Supabase, go to **Authentication → Emails → SMTP Settings** (or **Project Settings →
   Authentication → SMTP Settings**). Turn on **Enable custom SMTP**:
   - Sender email: your verified email · Sender name: `Inspiration Library`
   - Host: `smtp-relay.brevo.com` · Port: `587`
   - Username: the Brevo **Login** (not your own email) · Password: the **SMTP key**

   Click **Save**.
5. **Email templates:** in Supabase, go to **Authentication → Emails → Templates**. Edit both **Confirm signup**
   and **Magic Link**:
   - Subject: `Your Inspiration Library code`
   - Body:
     ```html
     <h2>Your sign-in code</h2>
     <p>Enter this code in Inspiration Library: <strong>{{ .Token }}</strong></p>
     ```
   Click **Save** on each.

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
| The email has a link but no code | The email templates weren't changed or saved (setup step 2.5). Don't tap the link: it opens "localhost" and fails. |
| "Error sending confirmation email" | Supabase couldn't send through Brevo. Check **Supabase → Logs → Auth**. `535 Authentication failed` means the SMTP Username must be the Brevo **Login** and the Password the **SMTP key** (setup step 2.4). |
| No email arrives | Check spam (emails come from your own address via Brevo, so the first ones may land there). Check that the sender is verified in Brevo. |
| "Email rate limit exceeded" or "wait before requesting" | You can request a code about once a minute. Wait, then try again. |
| "Token has expired or is invalid" | The code was mistyped or is old. Tap **Use a different email**, send a new code and use the newest email. |
| "Couldn't load your library" + "permission denied" | You're running an old version of the app (no sign-in screen appeared): run `git pull`, then `npx expo start --clear`. Otherwise, setup step 1.3 wasn't run. |
| `git pull` says "local changes … would be overwritten" for `package-lock.json` | Run `git restore package-lock.json`, then `git pull` again. |
| Expo Go can't connect or keeps loading | Phone and laptop on different networks, or a firewall. Try `npx expo start --tunnel`. |

## Developer checks

```
npm test            # screen, sign-in and database-query tests (fake database)
npm run typecheck   # TypeScript
npx expo lint       # code style
```
