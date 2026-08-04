-- Relationship, separate from permission.
--
-- "Admin" describes what someone may DO. "Mum" describes who they ARE. The
-- founder is both, and conflating them makes a family page read like an access
-- control list: comments signed "admin" rather than "Grandma".
--
-- baby_members.display_name already exists and is the right home for this, so
-- no schema change is needed. What was missing: an invite could carry a label
-- ("Grandma") but redeem_invite ignored it unless the joiner typed their own
-- name again. The person sending the invite knows the answer; the person
-- receiving it should not be asked.

create or replace function public.redeem_invite(p_code text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;

  select * into inv from invites
   where code = upper(trim(p_code)) and used_by is null and expires_at > now()
   for update;

  if not found then raise exception 'that invite code is not valid any more'; end if;

  insert into baby_members (baby_id, user_id, role, display_name)
  values (inv.baby_id, auth.uid(), inv.role,
          -- what the joiner typed wins; otherwise the label the inviter chose
          coalesce(nullif(trim(coalesce(p_display_name, '')), ''), inv.label))
  on conflict (baby_id, user_id) do update
    set display_name = coalesce(baby_members.display_name, excluded.display_name);

  update invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.baby_id;
end $$;

-- Let a member set their own name without needing an admin. Someone should be
-- able to correct "Grandma" to "Nana" themselves.
drop policy if exists members_self_name on baby_members;
create policy members_self_name on baby_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
