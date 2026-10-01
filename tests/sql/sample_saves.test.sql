-- Checks the Milestone 1 rule: without login (anon) the app can read sample saves only, and write nothing.
\set ON_ERROR_STOP on
-- Hosted Supabase grants the API roles full table access by default; only row-level security
-- restricts them. Mimic that so these checks prove the row rules alone keep data safe.
grant all on public.saves to anon;
insert into auth.users values ('33333333-3333-3333-3333-333333333333') on conflict do nothing;
insert into public.saves (user_id, url, canonical_url, source, title)
values ('33333333-3333-3333-3333-333333333333', 'https://private.example', 'https://private.example', 'web', 'Private');

\i supabase/seed.sql
\i supabase/seed.sql
select 'seed is idempotent' as check, count(*) = 1 as pass from public.saves where user_id is null;

set role anon;
select 'anon reads the sample save' as check,
       count(*) = 1 and bool_and(title = 'My first saved inspiration') as pass
from public.saves;
select 'anon cannot see users'' saves' as check, count(*) = 0 as pass from public.saves where title = 'Private';

do $$ begin
  insert into public.saves (url, canonical_url, source) values ('https://x', 'https://x', 'web');
  raise exception 'anon insert allowed';
exception when insufficient_privilege then raise notice 'PASS: anon cannot insert';
end $$;
-- No update/delete policy exists for anon, so these silently match zero rows.
update public.saves set title = 'changed';
delete from public.saves;
reset role;
select 'sample save still intact' as check, count(*) = 1 and bool_and(title = 'My first saved inspiration') as pass
from public.saves where user_id is null;
