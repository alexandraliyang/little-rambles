-- Fix: the creator of a baby cannot read it back at the moment of creation.
--
-- Symptom: insert into babies with Prefer: return=representation fails with
--   "new row violates row-level security policy for table babies"
-- ...even though the INSERT itself is permitted. The message names the insert,
-- but the refusal is on the SELECT that returns the row.
--
-- Why: babies_read requires membership, and membership is granted by an
-- AFTER INSERT trigger. AFTER ROW triggers fire at the END of the statement, so
-- while PostgREST is evaluating the returned row the creator is not yet a
-- member of the thing they just created.
--
-- A BEFORE trigger cannot fix this: baby_members has a foreign key to babies,
-- so the membership row cannot exist until the baby row does.
--
-- So the read policy states the other half of the truth explicitly: you may
-- read a baby if you are a member of it, OR if you created it. That is not a
-- widening of access — the trigger makes the creator an admin a moment later
-- either way — and it also means a baby stays reachable by its creator if the
-- trigger is ever removed or fails.

drop policy if exists babies_read on babies;
create policy babies_read on babies for select
  using (public.is_member(id) or created_by = auth.uid());

notify pgrst, 'reload schema';

select policyname, cmd, qual from pg_policies
 where schemaname = 'public' and tablename = 'babies' and policyname = 'babies_read';
