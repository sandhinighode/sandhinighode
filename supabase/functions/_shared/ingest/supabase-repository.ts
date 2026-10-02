import type { SupabaseClient } from "@supabase/supabase-js";
import { DuplicateSaveError, type NewSave, type SavePatch, type SaveRepository } from "./repository.ts";
import type { Save } from "./types.ts";

/**
 * Stores saves in the `saves` table. The client must carry the signed-in user's token,
 * so row-level security limits every query to that user's own saves.
 */
export class SupabaseSaveRepository implements SaveRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByCanonicalUrl(canonicalUrl: string): Promise<Save | null> {
    const { data, error } = await this.db.from("saves").select("*").eq("canonical_url", canonicalUrl).maybeSingle();
    if (error) throw new Error(`Failed to look up save: ${error.message}`);
    return data as Save | null;
  }

  async insertPending(save: NewSave): Promise<Save> {
    const { data, error } = await this.db.from("saves").insert({ ...save, status: "pending" }).select("*").single();
    if (error?.code === "23505") throw new DuplicateSaveError(); // unique (user_id, canonical_url)
    if (error) throw new Error(`Failed to create save: ${error.message}`);
    return data as Save;
  }

  async update(id: string, patch: SavePatch): Promise<Save> {
    const { data, error } = await this.db.from("saves").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(`Failed to update save: ${error.message}`);
    return data as Save;
  }
}
