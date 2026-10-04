-- Checks the Milestone 1b rules: nothing is readable or writable without login,
-- signed-in users only see their own saves, and every save must have an owner.
\set ON_ERROR_STOP on
-- Hosted Supabase grants the API roles table access by default; mimic that so these checks
-- prove the migrations and row-level security keep data safe.
grant select, insert, update, delete on public.saves to authenticated;
insert into auth.users values ('44444444-4444-4444-4444-444444444444') on conflict do nothing;
insert into public.saves (user_id, url, canonical_url, source, title)
values ('44444444-4444-4444-4444-444444444444', 'https://mine.example', 'https://mine.example', 'web', 'Mine');

select 'no sample rows remain' as check, count(*) = 0 as pass from public.saves where user_id is null;

do $$ begin
  insert into public.saves (user_id, url, canonical_url, source) values (null, 'https://x', 'https://x', 'web');
  raise exception 'save without owner allowed';
exception when not_null_violation then raise notice 'PASS: every save needs an owner';
end $$;

-- Logged out: no access at all.
set role anon;
do $$ begin
  perform count(*) from public.saves;
  raise exception 'anon could read saves';
exception when insufficient_privilege then raise notice 'PASS: logged-out users cannot read saves';
end $$;
do $$ begin
  insert into public.saves (url, canonical_url, source) values ('https://x', 'https://x', 'web');
  raise exception 'anon could insert';
exception when insufficient_privilege then raise notice 'PASS: logged-out users cannot save';
end $$;
reset role;

-- Signed in as another user: sees nothing of this user's.
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'other users cannot see my saves' as check, count(*) = 0 as pass from public.saves where title = 'Mine';
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select 'I can see my saves' as check, count(*) = 1 as pass from public.saves where title = 'Mine';
reset role;
