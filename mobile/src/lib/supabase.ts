import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Values come from mobile/.env (see .env.example). Expo inlines EXPO_PUBLIC_* variables at build time.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** True when both connection values are set; the app shows setup instructions otherwise. */
export const isSupabaseConfigured = Boolean(url && key && !url.includes("your-project-ref"));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
    // No login yet (Milestone 1), so there is no session to store.
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;
