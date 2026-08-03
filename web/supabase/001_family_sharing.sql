-- Little Rambles — family sharing schema (ADR-0015)
-- Run once in the Supabase SQL editor. Safe to re-run: everything is IF NOT EXISTS
-- or CREATE OR REPLACE.
--
-- The security model lives HERE, not in the client. engine/roles.js mirrors these
-- rules so the UI never offers a button the server will refuse, but a client that
-- lies about its role must still be refused — which is what these policies do.

-- ---------------------------------------------------------------- tables ----

-- A baby is the account. People attach to it; nobody "owns" it in a way that
-- makes a grandparent a second-class participant.
create table if not exists babies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  birthdate    date,
  notes        text,                       -- the free-text line the ranker reads
  home_label   text,
  home_lat     double precision,
  home_lng     double precision,
  created_by   uuid not null references auth.users(id) on delete restrict,
  created_at   timestamptz not null default now()
);

create table if not exists baby_members (
  baby_id      uuid not null references babies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('viewer','caregiver','admin')),
  display_name text,                       -- "Grandma", "Dad" — what shows on a comment
  joined_at    timestamptz not null default now(),
  primary key (baby_id, user_id)
);
create index if not exists baby_members_user on baby_members(user_id);

create table if not exists memories (
  id           uuid primary key default gen_random_uuid(),
  baby_id      uuid not null references babies(id) on delete cascade,
  author_id    uuid references auth.users(id) on delete set null,
  kind         text not null default 'visit' check (kind in ('visit','journal','custom')),
  idea_id      text,
  name         text,
  place        text,
  cat          text,
  emoji        text,
  rating       text,
  note         text,
  with_who     text,
  pin_lat      double precision,
  pin_lng      double precision,
  happened_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists memories_baby on memories(baby_id, happened_at desc);

-- Photos live in Storage; this is the index of them.
create table if not exists memory_media (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references memories(id) on delete cascade,
  baby_id      uuid not null references babies(id) on delete cascade,
  storage_path text not null,
  media_type   text not null default 'image' check (media_type in ('image','video')),
  created_at   timestamptz not null default now()
);
create index if not exists memory_media_memory on memory_media(memory_id);

-- One like per person per memory. No totals are ever surfaced as a score
-- (ADR-0005): this table answers "who smiled at this", not "how popular is it".
create table if not exists memory_likes (
  memory_id    uuid not null references memories(id) on delete cascade,
  baby_id      uuid not null references babies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (memory_id, user_id)
);

create table if not exists memory_comments (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references memories(id) on delete cascade,
  baby_id      uuid not null references babies(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  body         text not null check (length(trim(body)) between 1 and 2000),
  created_at   timestamptz not null default now()
);
create index if not exists memory_comments_memory on memory_comments(memory_id, created_at);

-- Our List, shared: a plan added by dad appears for mum.
create table if not exists plans (
  id           uuid primary key default gen_random_uuid(),
  baby_id      uuid not null references babies(id) on delete cascade,
  added_by     uuid references auth.users(id) on delete set null,
  idea_id      text,
  name         text not null,
  place        text,
  area         text,
  cat          text,
  emoji        text,
  status       text not null default 'planned' check (status in ('planned','out')),
  pin_lat      double precision,
  pin_lng      double precision,
  created_at   timestamptz not null default now()
);
create index if not exists plans_baby on plans(baby_id, created_at desc);

-- Single-use, expiring, bound to one baby and one role.
create table if not exists invites (
  code         text primary key,
  baby_id      uuid not null references babies(id) on delete cascade,
  role         text not null check (role in ('viewer','caregiver','admin')),
  invited_by   uuid not null references auth.users(id) on delete cascade,
  label        text,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  used_by      uuid references auth.users(id) on delete set null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------- helpers ----
-- SECURITY DEFINER and a non-RLS lookup on purpose: a policy on baby_members
-- that queries baby_members recurses forever. This is the standard escape, and
-- it is safe because the function only ever reports the CALLER's own row.

create or replace function public.my_role(b uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from baby_members where baby_id = b and user_id = auth.uid()
$$;

create or replace function public.is_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from baby_members where baby_id = b and user_id = auth.uid())
$$;

create or replace function public.at_least(b uuid, min_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    array_position(array['viewer','caregiver','admin'], public.my_role(b))
      >= array_position(array['viewer','caregiver','admin'], min_role), false)
$$;

-- ------------------------------------------------------------------ RLS ----

alter table babies          enable row level security;
alter table baby_members    enable row level security;
alter table memories        enable row level security;
alter table memory_media    enable row level security;
alter table memory_likes    enable row level security;
alter table memory_comments enable row level security;
alter table plans           enable row level security;
alter table invites         enable row level security;

-- babies: members read; admins edit; anyone signed in may create their own.
drop policy if exists babies_read on babies;
create policy babies_read on babies for select using (public.is_member(id));
drop policy if exists babies_insert on babies;
create policy babies_insert on babies for insert with check (created_by = auth.uid());
drop policy if exists babies_update on babies;
create policy babies_update on babies for update using (public.at_least(id, 'admin'));
drop policy if exists babies_delete on babies;
create policy babies_delete on babies for delete using (public.at_least(id, 'admin'));

-- members: you can see who else is in the family; only admins change it.
-- The self-insert case is how joining by invite works (see redeem_invite).
drop policy if exists members_read on baby_members;
create policy members_read on baby_members for select using (public.is_member(baby_id));
drop policy if exists members_write on baby_members;
create policy members_write on baby_members for all
  using (public.at_least(baby_id, 'admin')) with check (public.at_least(baby_id, 'admin'));

-- memories: every member reads. Caregivers write, and may only edit their own.
-- Admins may edit or remove anything, because somebody has to be able to.
drop policy if exists memories_read on memories;
create policy memories_read on memories for select using (public.is_member(baby_id));
drop policy if exists memories_insert on memories;
create policy memories_insert on memories for insert
  with check (public.at_least(baby_id, 'caregiver') and author_id = auth.uid());
drop policy if exists memories_update on memories;
create policy memories_update on memories for update
  using (public.at_least(baby_id, 'admin') or (public.at_least(baby_id, 'caregiver') and author_id = auth.uid()));
drop policy if exists memories_delete on memories;
create policy memories_delete on memories for delete
  using (public.at_least(baby_id, 'admin') or (public.at_least(baby_id, 'caregiver') and author_id = auth.uid()));

drop policy if exists media_read on memory_media;
create policy media_read on memory_media for select using (public.is_member(baby_id));
drop policy if exists media_write on memory_media;
create policy media_write on memory_media for all
  using (public.at_least(baby_id, 'caregiver')) with check (public.at_least(baby_id, 'caregiver'));

-- likes: any member, but only ever your own row.
drop policy if exists likes_read on memory_likes;
create policy likes_read on memory_likes for select using (public.is_member(baby_id));
drop policy if exists likes_write on memory_likes;
create policy likes_write on memory_likes for all
  using (user_id = auth.uid() and public.is_member(baby_id))
  with check (user_id = auth.uid() and public.is_member(baby_id));

-- comments: any member may write one. You may always withdraw your own words;
-- an admin may remove any. Nobody may edit someone else's.
drop policy if exists comments_read on memory_comments;
create policy comments_read on memory_comments for select using (public.is_member(baby_id));
drop policy if exists comments_insert on memory_comments;
create policy comments_insert on memory_comments for insert
  with check (public.is_member(baby_id) and author_id = auth.uid());
drop policy if exists comments_update on memory_comments;
create policy comments_update on memory_comments for update using (author_id = auth.uid());
drop policy if exists comments_delete on memory_comments;
create policy comments_delete on memory_comments for delete
  using (author_id = auth.uid() or public.at_least(baby_id, 'admin'));

drop policy if exists plans_read on plans;
create policy plans_read on plans for select using (public.is_member(baby_id));
drop policy if exists plans_write on plans;
create policy plans_write on plans for all
  using (public.at_least(baby_id, 'caregiver')) with check (public.at_least(baby_id, 'caregiver'));

-- invites: only admins may see or create them. Redemption goes through the
-- function below, NOT through a select — otherwise a code would have to be
-- readable to be used, which would let anyone enumerate them.
drop policy if exists invites_admin on invites;
create policy invites_admin on invites for all
  using (public.at_least(baby_id, 'admin')) with check (public.at_least(baby_id, 'admin'));

-- --------------------------------------------------------- redeem invite ----
-- SECURITY DEFINER so an outsider can redeem a code without being able to read
-- the invites table. Single-use and expiry are enforced here, in one place.

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
  values (inv.baby_id, auth.uid(), inv.role, p_display_name)
  on conflict (baby_id, user_id) do nothing;

  update invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.baby_id;
end $$;

-- The creator of a baby becomes its admin. Without this the first user would be
-- locked out of the thing they just made.
create or replace function public.after_baby_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into baby_members (baby_id, user_id, role, display_name)
  values (new.id, new.created_by, 'admin', null)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists babies_add_creator on babies;
create trigger babies_add_creator after insert on babies
  for each row execute function public.after_baby_insert();

-- -------------------------------------------------------------- storage ----
-- Photos are private. Every object is filed under its baby id, and the policies
-- below mean a removed member loses access to the pictures immediately — not
-- just to the rows that point at them.

insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

drop policy if exists memories_obj_read on storage.objects;
create policy memories_obj_read on storage.objects for select
  using (bucket_id = 'memories' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists memories_obj_write on storage.objects;
create policy memories_obj_write on storage.objects for insert
  with check (bucket_id = 'memories' and public.at_least(((storage.foldername(name))[1])::uuid, 'caregiver'));

drop policy if exists memories_obj_delete on storage.objects;
create policy memories_obj_delete on storage.objects for delete
  using (bucket_id = 'memories' and public.at_least(((storage.foldername(name))[1])::uuid, 'caregiver'));
