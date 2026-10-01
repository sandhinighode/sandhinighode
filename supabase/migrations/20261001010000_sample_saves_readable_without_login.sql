-- Milestone 1: the app has no login yet, but must be able to read a test record.
--
-- TEMPORARY. Saves with no owner (user_id is null) are "sample" rows that anyone with the app's
-- public key may READ. Nothing can be written without login, and real users' saves stay private.
-- When login is added: delete sample rows, drop this policy and set user_id back to NOT NULL.

alter table public.saves alter column user_id drop not null;

create policy "TEMP M1: sample saves are readable without login"
  on public.saves for select to anon
  using (user_id is null);

-- Explicit table access for the API roles (row-level security still decides which rows).
grant select on public.saves to anon;
grant select, insert, update, delete on public.saves to authenticated;
