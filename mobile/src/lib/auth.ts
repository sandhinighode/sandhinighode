import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "./supabase";

/** Normalise what the user typed so "Me@Example.com " and "me@example.com" are the same account. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(email));

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Add your project values to mobile/.env.");
  return supabase;
}

/** Email a one-time sign-in code. Creates the account on first use. */
export async function sendCode(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email: normaliseEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
}

/** Check the code from the email. On success Supabase stores the session and the app switches to the library. */
export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await client().auth.verifyOtp({
    email: normaliseEmail(email),
    token: code.trim(),
    type: "email",
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await client().auth.signOut();
  if (error) throw new Error(error.message);
}

/** The current login, kept up to date as the user signs in or out. `undefined` while still checking. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
