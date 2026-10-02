import { supabase } from "./supabase";

/** The fields of a Save the app currently shows. Mirrors columns of the `saves` table (supabase/migrations). */
export interface Save {
  id: string;
  url: string;
  source: "instagram" | "youtube" | "pinterest" | "web";
  title: string | null;
  description: string | null;
  status: "pending" | "ready" | "failed";
  created_at: string;
}

const COLUMNS = "id, url, source, title, description, status, created_at";

/** Newest saves first. Throws with a readable message if the database can't be reached. */
export async function fetchSaves(): Promise<Save[]> {
  if (!supabase) throw new Error("Supabase is not configured. Add your project values to mobile/.env.");
  const { data, error } = await supabase
    .from("saves")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Save[];
}
