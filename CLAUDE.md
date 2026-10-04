# CLAUDE.md: how to work on this project

Personal Inspiration Library: an Expo (React Native) app with a Supabase backend.
The owner is a product/UX designer, not an engineer. Explain things in plain English.

## Before writing any code (every session, every task)

1. **Read `DEVELOPMENT_PLAN.md`** (architecture, milestones, decision log) and the **`README.md`**
   for the area you'll touch (e.g. `mobile/README.md`). Use them as the reference for scope and
   decisions.
2. **Check the current milestone** in `DEVELOPMENT_PLAN.md` §8 and stay inside its scope. Don't build
   features from later milestones, even small ones.
3. **Tell the user before changing anything:**
   - exactly which files will change and what each change does
   - anything they need to install or create an account for
4. **Wait for the user's approval** before editing files.

## After implementing

1. Run the relevant tests and checks (below) and report real results, including failures.
2. Explain how the user can verify it themselves, step by step.
3. Update `DEVELOPMENT_PLAN.md`: milestone status and a decision-log entry for any decision made.
   Mark a milestone ✅ only once the user has confirmed its "Done when" on their own phone.

## Project layout

- `mobile/`: the Expo app (TypeScript, Expo Router, Expo SDK 57). See `mobile/AGENTS.md` for Expo rules.
- `supabase/migrations/`: database changes, one SQL file per change (never edit an applied one).
- `supabase/functions/`: server functions (Deno). `ingest-url` is built but not yet connected (M2).
- `tests/`: Deno tests for the server functions; `tests/sql/` has checks for database rules.

## Checks

```
cd mobile && npm test && npm run typecheck && npx expo lint   # app
deno task test && deno task check                             # server functions (repo root)
tests/sql/run.sh                                              # database rules (needs a local Postgres)
```

## Rules

- Keep secrets out of the code. Only the Supabase **publishable/anon** key may be in the app, via `mobile/.env`.
- Every database change is a new migration file, and row-level security stays on.
- The user develops on **Windows** with an **Android phone** (Expo Go). Write instructions for that setup.
