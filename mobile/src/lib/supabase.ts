import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

// Values come from mobile/.env (see .env.example). Expo inlines EXPO_PUBLIC_* variables at build time.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** True when both connection values are set; the app shows setup instructions otherwise. */
export const isSupabaseConfigured = Boolean(url && key && !url.includes("your-project-ref"));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
    auth: {
      // Keep the user signed in between app launches.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  : null;

// Only refresh the login in the background while the app is open (recommended by Supabase for React Native).
if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
