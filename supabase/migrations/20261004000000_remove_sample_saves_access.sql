-- Milestone 1b: login exists now, so the temporary Milestone 1 access to sample rows is removed.
-- After this, every save belongs to a signed-in user and nobody can read anything without logging in.

-- 1. Remove sample rows (saves with no owner), e.g. "My first saved inspiration".
delete from public.saves where user_id is null;

-- 2. Remove the temporary "readable without login" rule.
drop policy if exists "TEMP M1: sample saves are readable without login" on public.saves;

-- 3. Every save must belong to someone again.
alter table public.saves alter column user_id set not null;

-- 4. The logged-out role gets no access to saves at all.
revoke all on public.saves from anon;
