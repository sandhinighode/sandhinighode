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

Then open the **Inspiration Library** app on your phone (your own development build from setup step 6,
not Expo Go). It connects to the laptop by itself; if it asks, tap the server shown or scan the QR code. Keep the
Command Prompt window open while you use the app. `git pull` downloads the latest changes from GitHub.

Before setup step 6 is done, you can still scan the QR code with **Expo Go** (everything except the Share menu works).

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

### 3. Upload the link reader (Command Prompt on your laptop)

The **link reader** is a small program that runs on Supabase's servers. When you save a link, it works out
where the link is from and fetches its title, description and author. Upload it once from the
**project folder** (not `mobile`). Replace the project ID with yours:

```
cd sandhinighode
npx supabase login
npx supabase functions deploy ingest-url --project-ref YOUR-PROJECT-ID --use-api --no-verify-jwt
```

`npx supabase login` opens your browser once: click **Authorize**. Check that it worked in Supabase:
left sidebar → **Edge Functions**, where **ingest-url** should be listed. Re-run the `deploy` line whenever the
link reader changes; I'll tell you when.

### 4. Connect the app (your laptop)

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

### 5. Sign in and save a link (your phone)

1. The app shows **Sign in**. Type your email and tap **Send code**.
2. Open the email (check spam the first time) and type the code into the app. Tap **Sign in**.
3. You'll see your library, with a **Paste a link** box at the top. **Sign out** is at the top right.
4. Paste a link (e.g. a YouTube video) and tap **Save**. It appears in the list with its title.
   Saving the same link again says "Already in your library".
5. Close and reopen the app: you should still be signed in.

### 6. Your own app with the Share menu (development build)

Expo Go can't appear in your phone's Share menu, so you build **your own version** of the app in Expo's cloud
(free) and install it. It works like Expo Go: it loads the app's code from your laptop.

1. **Expo account:** at **expo.dev**, click **Sign up** (free).
2. **Expo project:** at **expo.dev**, go to **Projects** → **Create a project**, named exactly `inspiration-library`.
   Its Project ID and owner go in `app.json` (already done for this project: owner `sandhinis-team`).
3. **Build it** (Command Prompt, in the `mobile` folder):
   ```
   npx eas-cli@latest login
   npx eas-cli@latest build --profile development --platform android
   ```
   Log in with your Expo username and password. If asked **"Generate a new Android Keystore?"**, answer **Yes**:
   it's the app's digital signature, and Expo stores it for you. The build runs in the cloud for about
   15–25 minutes; you can close nothing, just wait. At the end it shows a **link and QR code**.
4. **Install it** (phone): open that link (or scan the QR with the camera) → **Download** → open the file →
   **Install**. Android will ask to allow installing apps from your browser: allow it. If Play Protect warns about an
   unknown developer, choose **Install anyway**. That's you!
5. **Use it:** run `npx expo start --clear` on the laptop and open **Inspiration Library** on the phone.

You only rebuild when the app gets a new **native** building block; Claude will tell you when. Normal code
changes just need `git pull`.

**Share something:** in Instagram, YouTube, Pinterest or Chrome, tap **Share** → **Inspiration Library**
(you may need to tap **More** the first time). The app opens, shows **Saved ✓**, and the item is at the top. Press
**Back** to return to where you were.

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
| Saving a link says "Function not found" or "Requested function was not found" | The link reader isn't uploaded yet (setup step 3). |
| A saved link shows "…didn't share details…" or "couldn't reach…" | The site blocked the link reader or needs a login (common for Instagram). The link is still saved. |
| Inspiration Library isn't in the Share menu | You're using Expo Go instead of your own app (setup step 6), or the Share list needs **More**. Reinstall the build if needed. |
| The app opens from Share but says it can't connect / "Unable to load script" | The laptop server isn't running, or it's on a different Wi-Fi. Run `npx expo start --clear`, then share again. |
| Shared from an app but it says "didn't include a link" | That app shared plain text without a link. Use its **Copy link** option and the **Paste a link** box instead. |
| Expo Go can't connect or keeps loading | Phone and laptop on different networks, or a firewall. Try `npx expo start --tunnel`. |

## Developer checks

```
npm test            # screen, sign-in, paste-a-link and database tests (fake database)
npm run typecheck   # TypeScript
npx expo lint       # code style
```
