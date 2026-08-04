-- Leaving a family, and member profiles.
--
-- FOUNDER DECISION: when someone leaves, their comments stay.
--
-- That has a consequence which has to be designed for rather than discovered.
-- A comment's author name comes from baby_members.display_name. Delete the
-- membership row and every comment they ever wrote loses its name — "Grandma
-- said she looked so happy" silently becomes an anonymous line. Keeping the
-- text while losing the person is not keeping the comment.
--
-- So the name is denormalised onto the comment (and onto outings they logged)
-- at the moment of writing. It is a snapshot, deliberately: if Grandma later
-- renames herself Nana, what she said last year was still said by Grandma.

alter table memory_comments add column if not exists author_name text;
alter table memories        add column if not exists author_name text;

-- Member profiles: a self-chosen name and a photo, separate from permission.
alter table baby_members add column if not exists avatar_path text;

-- Leaving. Self-removal only — this is NOT the admin's remove-someone path,
-- which already exists and is governed by members_write.
drop policy if exists members_leave on baby_members;
create policy members_leave on baby_members for delete
  using (user_id = auth.uid());

-- The last admin must not be able to leave: a baby with no admin can never be
-- invited into again, and there is no support desk to recover it. The client
-- checks this too (engine/roles.js) so the button explains itself rather than
-- failing, but the database is what makes it true.
create or replace function public.leave_baby(p_baby uuid)
returns void language plpgsql security definer set search_path = public as $$
declare my_role text; admin_count int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select role into my_role from baby_members where baby_id = p_baby and user_id = auth.uid();
  if my_role is null then raise exception 'you are not part of this family'; end if;

  select count(*) into admin_count from baby_members where baby_id = p_baby and role = 'admin';
  if my_role = 'admin' and admin_count <= 1 then
    raise exception 'make someone else an admin first — a page always needs one';
  end if;

  delete from baby_members where baby_id = p_baby and user_id = auth.uid();
end $$;

-- Backfill names onto everything already written, so history is not left
-- half-attributed by the introduction of this column.
update memory_comments c set author_name = m.display_name
  from baby_members m
 where c.author_name is null and m.baby_id = c.baby_id and m.user_id = c.author_id;

update memories mem set author_name = m.display_name
  from baby_members m
 where mem.author_name is null and m.baby_id = mem.baby_id and m.user_id = mem.author_id;

notify pgrst, 'reload schema';

select 'ok' as status,
       (select count(*) from memory_comments where author_name is not null) as comments_named,
       (select count(*) from memories where author_name is not null) as outings_named;
