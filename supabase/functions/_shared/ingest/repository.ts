import type { Save, SaveSource } from "./types.ts";

export interface NewSave {
  url: string;
  canonical_url: string;
  source: SaveSource;
  shared_text: string | null;
}

export type SavePatch = Partial<Omit<Save, "id" | "user_id" | "created_at" | "updated_at">>;

/** Where saves are stored. The pipeline only talks to this interface, never to the database directly. */
export interface SaveRepository {
  findByCanonicalUrl(canonicalUrl: string): Promise<Save | null>;
  /** Insert a `pending` save. Throws DuplicateSaveError if this user already saved the URL. */
  insertPending(save: NewSave): Promise<Save>;
  update(id: string, patch: SavePatch): Promise<Save>;
}

export class DuplicateSaveError extends Error {
  constructor() {
    super("This URL is already saved.");
    this.name = "DuplicateSaveError";
  }
}

/** In-memory repository for one user. Used by tests and the try-urls script. */
export class InMemorySaveRepository implements SaveRepository {
  readonly saves = new Map<string, Save>();
  constructor(private readonly userId = "00000000-0000-0000-0000-000000000001") {}

  findByCanonicalUrl(canonicalUrl: string): Promise<Save | null> {
    return Promise.resolve([...this.saves.values()].find((s) => s.canonical_url === canonicalUrl) ?? null);
  }

  async insertPending(save: NewSave): Promise<Save> {
    if (await this.findByCanonicalUrl(save.canonical_url)) throw new DuplicateSaveError();
    const now = new Date().toISOString();
    const row: Save = {
      id: crypto.randomUUID(),
      user_id: this.userId,
      ...save,
      content_type: "unknown",
      title: null,
      description: null,
      thumbnail_url: null,
      author_name: null,
      author_url: null,
      site_name: null,
      source_metadata: {},
      status: "pending",
      processing_error: null,
      processed_at: null,
      created_at: now,
      updated_at: now,
    };
    this.saves.set(row.id, row);
    return structuredClone(row);
  }

  update(id: string, patch: SavePatch): Promise<Save> {
    const existing = this.saves.get(id);
    if (!existing) return Promise.reject(new Error(`Save ${id} not found`));
    const row = { ...existing, ...patch, updated_at: new Date().toISOString() };
    this.saves.set(id, row);
    return Promise.resolve(structuredClone(row));
  }
}
