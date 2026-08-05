/* sync — keeping one family's journal the same on every phone.

   THE SHAPE. Local-first, cloud-mirrored. The device stays the working copy, so
   the app is fully usable with no network and no account; the cloud is where a
   family meets. That ordering is deliberate — a caregiver logging an outing in
   a car park with one bar must never be blocked on a request.

   IDENTITY. Every local memory keeps its own `id` (a timestamp, assigned on the
   device) and gains `rid` once the server has seen it. `rid` is the shared
   identity: it is what a comment attaches to and what tells a second phone
   "this is the same outing", rather than a duplicate of it.

   CONFLICTS. Deliberately not solved in general, because the general problem is
   hard and this one is not: two caregivers rarely edit the same memory in the
   same minute. Pull is additive — anything the server has that this device does
   not gets added. Local edits win locally until pushed. If that ever proves
   wrong in practice it will be because families collide more than expected, and
   that is worth knowing before building a merge engine nobody needed. */

import { supa, enabled, humanError } from "./supa.js";
import { currentUser } from "./family.js";

const fail = (e) => ({ ok: false, error: humanError(e) });
const off = () => ({ ok: false, error: "Not signed in." });

/* Server row -> the shape the app already uses everywhere. Keeping the app's
   own vocabulary means sync did not get to redesign the rest of the codebase. */
const toLocal = (r) => ({
  id: r.local_id ? Number(r.local_id) : new Date(r.happened_at).getTime(),
  rid: r.id,
  kind: r.kind,
  ideaId: r.idea_id || null,
  name: r.name || "",
  place: r.place || null,
  cat: r.cat || null,
  emoji: r.emoji || "📍",
  rating: r.rating || null,
  note: r.note || "",
  by: r.with_who || null,
  author: r.author_name || null,
  /* Who wrote it, not just what they are called. FB31-04 needs to tell your own
     entries from someone else's, and two people may both be "Mum" on different
     pages — a name cannot answer that, an id can. */
  authorId: r.author_id || null,
  pin: r.pin_lat != null ? { lat: r.pin_lat, lng: r.pin_lng } : null,
  ts: new Date(r.happened_at).getTime(),
  mediaCount: 0,
  remote: true,
});

const toRow = (v, babyId, userId, authorName) => ({
  baby_id: babyId,
  author_id: userId,
  author_name: authorName || null,
  kind: v.kind === "journal" ? "journal" : v.kind === "custom" ? "custom" : "visit",
  idea_id: v.ideaId || null,
  name: v.name || null,
  place: v.place || null,
  cat: v.cat || null,
  emoji: v.emoji || null,
  rating: v.rating || null,
  note: v.note || null,
  with_who: v.by || null,
  pin_lat: v.pin ? v.pin.lat : null,
  pin_lng: v.pin ? v.pin.lng : null,
  happened_at: new Date(v.ts || Date.now()).toISOString(),
});

/* ------------------------------------------------------------- memories -- */

export async function pullMemories(babyId) {
  if (!enabled || !babyId) return { ok: true, memories: [] };
  const { data, error } = await supa().from("memories")
    .select("*").eq("baby_id", babyId).order("happened_at", { ascending: false }).limit(500);
  if (error) return fail(error);
  return { ok: true, memories: (data || []).map(toLocal) };
}

export async function pushMemory(babyId, visit, authorName) {
  if (!enabled || !babyId) return off();
  const u = await currentUser(); if (!u) return off();
  const { data, error } = await supa().from("memories")
    .insert(toRow(visit, babyId, u.id, authorName)).select().single();
  if (error) return fail(error);
  return { ok: true, rid: data.id };
}

export async function updateMemory(rid, patch) {
  if (!enabled || !rid) return off();
  const { error } = await supa().from("memories").update({
    rating: patch.rating, note: patch.note, place: patch.place, with_who: patch.by,
  }).eq("id", rid);
  return error ? fail(error) : { ok: true };
}

export async function deleteMemory(rid) {
  if (!enabled || !rid) return off();
  const { error } = await supa().from("memories").delete().eq("id", rid);
  return error ? fail(error) : { ok: true };
}

/* Additive merge. Anything the server holds that this device does not gets
   added; anything the device already has is left exactly as it is, because the
   local copy may have photos attached that the server has never seen. */
export function mergeMemories(local, remote) {
  const haveRid = new Set(local.map((v) => v.rid).filter(Boolean));
  const added = remote.filter((r) => !haveRid.has(r.rid));
  return [...local, ...added].sort((a, b) => b.ts - a.ts);
}

/* ----------------------------------------------------------------- plans -- */

export async function pullPlans(babyId) {
  if (!enabled || !babyId) return { ok: true, plans: [] };
  const { data, error } = await supa().from("plans")
    .select("*").eq("baby_id", babyId).order("created_at", { ascending: false }).limit(200);
  if (error) return fail(error);
  return { ok: true, plans: (data || []).map((p) => ({
    id: new Date(p.created_at).getTime(), rid: p.id, ideaId: p.idea_id, name: p.name,
    place: p.place, area: p.area, cat: p.cat, emoji: p.emoji, status: p.status,
    ts: new Date(p.created_at).getTime(), times: 1,
    pin: p.pin_lat != null ? { lat: p.pin_lat, lng: p.pin_lng } : null, remote: true,
  })) };
}

export async function pushPlan(babyId, plan) {
  if (!enabled || !babyId) return off();
  const u = await currentUser(); if (!u) return off();
  const { data, error } = await supa().from("plans").insert({
    baby_id: babyId, added_by: u.id, idea_id: plan.ideaId || null, name: plan.name,
    place: plan.place || null, area: plan.area || null, cat: plan.cat || null,
    emoji: plan.emoji || null, status: plan.status === "out" ? "out" : "planned",
  }).select().single();
  if (error) return fail(error);
  return { ok: true, rid: data.id };
}

export async function deletePlan(rid) {
  if (!enabled || !rid) return off();
  const { error } = await supa().from("plans").delete().eq("id", rid);
  return error ? fail(error) : { ok: true };
}

/* ------------------------------------------------------------ what's new -- */
/* FB31-04. Pure, and separate from the pull that feeds it, because this is the
   part with the interesting mistakes in it: announcing your own writing back to
   you, announcing an entire journal the first time it loads, or announcing
   nothing at all — which is what shipped, and what the founder hit.

   The rule is a snapshot comparison, not a comparison against local state:
   local state also holds this phone's own entries, and cannot tell "I have not
   seen this" from "I wrote this". */

export function snapshot(memories, comments) {
  const s = {};
  (memories || []).forEach((m) => { if (m.rid) s[m.rid] = ((comments || {})[m.rid] || []).map((c) => c.id); });
  return s;
}

export function freshSince(prev, memories, comments, meId) {
  /* No previous snapshot means this is the first look at this family. Everything
     is unseen and none of it is news — you are not "notified" of a journal you
     have just opened for the first time. */
  if (!prev) return [];
  const out = [];
  (memories || []).forEach((m) => {
    if (!m.rid) return;
    const known = Object.prototype.hasOwnProperty.call(prev, m.rid);
    const label = m.place || m.name || "";
    if (!known) {
      if (m.authorId && m.authorId !== meId) out.push({ kind: "outing", who: m.author || "Someone", what: label });
      /* Comments on an outing you are being told about for the first time are
         part of that news, not five more items on top of it. */
      return;
    }
    const seen = new Set(prev[m.rid] || []);
    ((comments || {})[m.rid] || []).forEach((c) => {
      if (!seen.has(c.id) && c.authorId !== meId) out.push({ kind: "comment", who: c.author || "Someone", what: label });
    });
  });
  return out;
}

/* One line of English. Five identical rows tell you less than "Dad commented on
   Stanley Park" does, and a number alone tells you nothing worth opening. */
export function newsLine(news) {
  if (!news || !news.length) return "";
  if (news.length === 1) {
    const n = news[0];
    return n.kind === "comment"
      ? n.who + " commented" + (n.what ? " on " + n.what : "") + "."
      : n.who + " added " + (n.what || "an outing") + ".";
  }
  const c = news.filter((n) => n.kind === "comment").length;
  const o = news.length - c;
  const bits = [];
  if (c) bits.push(c + (c === 1 ? " new comment" : " new comments"));
  if (o) bits.push(o + (o === 1 ? " new outing" : " new outings"));
  const who = [...new Set(news.map((n) => n.who))];
  return bits.join(" and ") + (who.length === 1 ? " from " + who[0] : "") + ".";
}

/* ----------------------------------------------------- likes and comments -- */
/* Only synced memories can carry these: a comment needs something both phones
   agree exists. The UI hides them on local-only entries rather than offering an
   action that would silently go nowhere. */

export async function pullSocial(babyId, rids) {
  if (!enabled || !babyId || !rids.length) return { ok: true, likes: {}, comments: {} };
  const [l, c] = await Promise.all([
    supa().from("memory_likes").select("memory_id, user_id").eq("baby_id", babyId).in("memory_id", rids),
    supa().from("memory_comments").select("id, memory_id, author_id, author_name, body, created_at")
      .eq("baby_id", babyId).in("memory_id", rids).order("created_at"),
  ]);
  if (l.error) return fail(l.error);
  if (c.error) return fail(c.error);
  const likes = {}, comments = {};
  (l.data || []).forEach((x) => { (likes[x.memory_id] = likes[x.memory_id] || []).push(x.user_id); });
  (c.data || []).forEach((x) => {
    (comments[x.memory_id] = comments[x.memory_id] || []).push({
      id: x.id, authorId: x.author_id, author: x.author_name, body: x.body, at: x.created_at,
    });
  });
  return { ok: true, likes, comments };
}
