-- Milestone 2: URL ingestion.
-- One `saves` table holds every saved thing, whatever platform it came from.
-- Platform-specific extras live in `source_metadata` so new sources never need a new table.

create type public.save_source as enum ('instagram', 'youtube', 'pinterest', 'web');
create type public.save_status as enum ('pending', 'ready', 'failed');

create table public.saves (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- What was shared
  url              text not null,              -- exactly as submitted
  canonical_url    text not null,              -- cleaned up, used for duplicate detection
  shared_text      text,                       -- any text the source app passed along

  -- What we found out about it
  source           public.save_source not null,
  content_type     text not null default 'unknown', -- video | image | article | post | unknown
  title            text,
  description      text,
  thumbnail_url    text,
  author_name      text,
  author_url       text,
  site_name        text,
  source_metadata  jsonb not null default '{}'::jsonb,

  -- Processing
  status           public.save_status not null default 'pending',
  processing_error text,
  processed_at     timestamptz,

  created_at       timestamptz not null default now(),  -- date saved
  updated_at       timestamptz not null default now(),

  constraint saves_user_canonical_url_key unique (user_id, canonical_url)
);

create index saves_user_created_at_idx on public.saves (user_id, created_at desc);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger saves_set_updated_at
  before update on public.saves
  for each row execute function public.set_updated_at();

-- Row-level security: a user can only ever see and change their own saves.
alter table public.saves enable row level security;

create policy "Users read own saves"   on public.saves for select using (auth.uid() = user_id);
create policy "Users insert own saves" on public.saves for insert with check (auth.uid() = user_id);
create policy "Users update own saves" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own saves" on public.saves for delete using (auth.uid() = user_id);
