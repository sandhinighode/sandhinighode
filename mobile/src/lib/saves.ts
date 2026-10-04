import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "./supabase";

/** The fields of a Save the app currently shows. Mirrors columns of the `saves` table (supabase/migrations). */
export interface Save {
  id: string;
  url: string;
  source: "instagram" | "youtube" | "pinterest" | "web";
  title: string | null;
  description: string | null;
  status: "pending" | "ready" | "failed";
  processing_error: string | null;
  created_at: string;
}

export interface SaveLinkResult {
  save: Save;
  /** false when the link was already in the library. */
  created: boolean;
}

const COLUMNS = "id, url, source, title, description, status, processing_error, created_at";

function client() {
  if (!supabase) throw new Error("Supabase is not configured. Add your project values to mobile/.env.");
  return supabase;
}

/** Newest saves first. Throws with a readable message if the database can't be reached. */
export async function fetchSaves(): Promise<Save[]> {
  const { data, error } = await client()
    .from("saves")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Save[];
}

/**
 * Save a link through the `ingest-url` server function, which works out the source and fetches the
 * title, description and author. A link whose details couldn't be fetched is still saved (status "failed").
 */
export async function saveLink(url: string): Promise<SaveLinkResult> {
  const { data, error } = await client().functions.invoke<SaveLinkResult>("ingest-url", { body: { url } });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.save) throw new Error("The link reader returned an unexpected response.");
  return data;
}

/** The server function replies with { error: "…" }; show that instead of a generic HTTP message. */
async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).json();
      if (typeof body?.error === "string") return body.error;
      if (typeof body?.message === "string") return body.message; // e.g. login rejected by Supabase
    } catch {
      // Not JSON; fall through to the generic message.
    }
  }
  return error instanceof Error ? error.message : "Couldn't save this link. Please try again.";
}
