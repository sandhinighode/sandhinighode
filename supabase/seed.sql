-- One test Save for Milestone 1. Safe to run more than once.
-- It has no owner (user_id is null), so the app can read it before login exists.
insert into public.saves (user_id, url, canonical_url, source, content_type, title, description, status, processed_at)
select null,
       'https://example.com/my-first-inspiration',
       'https://example.com/my-first-inspiration',
       'web',
       'article',
       'My first saved inspiration',
       'Test record created in Milestone 1. If you can read this in the app, the database is connected.',
       'ready',
       now()
where not exists (
  select 1 from public.saves where user_id is null and canonical_url = 'https://example.com/my-first-inspiration'
);
