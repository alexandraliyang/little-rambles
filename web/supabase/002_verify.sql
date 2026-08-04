-- Diagnostic + repair. Safe to run any number of times.
--
-- Symptom this exists for: an authenticated user, inserting a row whose
-- created_by equals their own auth.uid(), is refused with
--   "new row violates row-level security policy for table babies"
-- With RLS enabled and NO insert policy present, every insert is denied and the
-- message looks identical to a policy that evaluated false. So the first thing
-- to establish is whether the policies exist at all.
--
-- Run the whole file. The last statement prints what actually exists.

-- 1. Are the tables there and is RLS on?
select tablename, rowsecurity as rls_enabled
  from pg_tables
 where schemaname = 'public'
   and tablename in ('babies','baby_members','memories','memory_media','memory_likes','memory_comments','plans','invites')
 order by tablename;

-- 2. Re-apply the policies that matter most. Idempotent: dropped then created.
drop policy if exists babies_read on babies;
create policy babies_read on babies for select using (public.is_member(id));

drop policy if exists babies_insert on babies;
create policy babies_insert on babies for insert with check (created_by = auth.uid());

drop policy if exists babies_update on babies;
create policy babies_update on babies for update using (public.at_least(id, 'admin'));

drop policy if exists babies_delete on babies;
create policy babies_delete on babies for delete using (public.at_least(id, 'admin'));

drop policy if exists members_read on baby_members;
create policy members_read on baby_members for select using (public.is_member(baby_id));

drop policy if exists members_write on baby_members;
create policy members_write on baby_members for all
  using (public.at_least(baby_id, 'admin')) with check (public.at_least(baby_id, 'admin'));

-- 3. PostgREST caches the schema; without this the API can keep serving the old
--    picture for a minute or two after a policy change.
notify pgrst, 'reload schema';

-- 4. What is actually in place now. Expect 4 rows for babies (read/insert/
--    update/delete) and 2 for baby_members.
select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;
