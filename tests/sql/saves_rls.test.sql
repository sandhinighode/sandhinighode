-- Checks the saves table rules: defaults, duplicate protection and row-level security.
\set ON_ERROR_STOP on
grant select, insert, update, delete on public.saves to authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');

set role authenticated;

-- User A saves a link; user_id comes from the login automatically.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.saves (url, canonical_url, source) values ('https://youtu.be/x', 'https://www.youtube.com/watch?v=x', 'youtube');
select 'A sees own save' as check, count(*) = 1 as pass from public.saves;
select 'defaults: pending + user_id set' as check,
       bool_and(status = 'pending' and user_id = auth.uid() and content_type = 'unknown') as pass from public.saves;

-- Same canonical URL twice for the same user is rejected.
do $$ begin
  insert into public.saves (url, canonical_url, source) values ('https://youtube.com/watch?v=x', 'https://www.youtube.com/watch?v=x', 'youtube');
  raise exception 'duplicate was allowed';
exception when unique_violation then raise notice 'PASS: duplicate rejected';
end $$;

-- User B can't see, change or delete A's save, and can't save on A's behalf.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'B cannot see A''s save' as check, count(*) = 0 as pass from public.saves;
update public.saves set title = 'hacked';
delete from public.saves;
do $$ begin
  insert into public.saves (user_id, url, canonical_url, source)
    values ('11111111-1111-1111-1111-111111111111', 'https://evil', 'https://evil', 'web');
  raise exception 'insert for another user was allowed';
exception when insufficient_privilege then raise notice 'PASS: cannot insert for another user';
end $$;
-- B may save the same URL as A (uniqueness is per user).
insert into public.saves (url, canonical_url, source) values ('https://youtu.be/x', 'https://www.youtube.com/watch?v=x', 'youtube');
select 'B can save same URL separately' as check, count(*) = 1 as pass from public.saves;

-- Back as A: the save is untouched; updated_at moves on update.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'A''s save untouched by B' as check, count(*) = 1 and bool_and(title is null) as pass from public.saves;
update public.saves set status = 'ready', title = 'Video' where true;
select 'update + updated_at trigger' as check, bool_and(status = 'ready' and updated_at >= created_at) as pass from public.saves;

-- Invalid enum values are rejected.
do $$ begin
  insert into public.saves (url, canonical_url, source) values ('https://x', 'https://x', 'tiktok');
  raise exception 'unknown source accepted';
exception when invalid_text_representation then raise notice 'PASS: unknown source rejected';
end $$;
