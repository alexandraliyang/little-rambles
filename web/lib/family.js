/* family — accounts, membership, invites, likes and comments.
   Every function returns { ok, ... } or { ok:false, error } with a message
   already fit to show a caregiver. Nothing here throws at the caller.

   This layer never decides permissions. The database does (RLS), and
   engine/roles.js mirrors those rules so the UI does not offer refused actions.
   If the two ever disagree, the database wins and the UI has a bug. */
import { supa, enabled, humanError } from "./supa.js";
import { makeInviteCode } from "../engine/roles.js";

const fail = (e) => ({ ok: false, error: humanError(e) });
const off = () => ({ ok: false, error: "Family sharing isn't set up in this build." });

/* ------------------------------------------------------------ account ---- */

export async function signUp(email, password) {
  if (!enabled) return off();
  const { data, error } = await supa().auth.signUp({ email: String(email).trim(), password });
  if (error) return fail(error);
  /* With email confirmation on, a session is NOT returned here. Saying "check
     your email" is the difference between a working flow and a dead end. */
  return { ok: true, needsConfirm: !data.session, user: data.user };
}

export async function signIn(email, password) {
  if (!enabled) return off();
  const { data, error } = await supa().auth.signInWithPassword({ email: String(email).trim(), password });
  if (error) return fail(error);
  return { ok: true, user: data.user };
}

/* OAuth. PKCE, and the redirect returns to the app's own origin so an installed
   PWA lands back inside itself rather than stranding the user in Safari.
   Providers must be enabled in Supabase first; until then this returns a
   readable error rather than a blank page. */
export async function signInWith(provider) {
  if (!enabled) return off();
  const { error } = await supa().auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: "select_account" } },
  });
  if (error) return fail(error);
  return { ok: true, redirecting: true };
}

/* Passwordless. One email, one tap, nothing to remember — the right shape for a
   grandparent, and it depends on mail actually being delivered (debt T11). */
export async function sendMagicLink(email) {
  if (!enabled) return off();
  const { error } = await supa().auth.signInWithOtp({
    email: String(email).trim(),
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) return fail(error);
  return { ok: true, sent: true };
}

/* Password reset. The one part of the email path that CANNOT be routed around:
   Google users never need it, and signup works without mail because confirmation
   is off, but a forgotten password can only be recovered through an inbox. On
   Supabase's built-in sender that mail will often not arrive, and it fails
   silently (debt T11) — so the UI must say "if it doesn't arrive" rather than
   promising delivery. */
export async function resetPassword(email) {
  if (!enabled) return off();
  const { error } = await supa().auth.resetPasswordForEmail(String(email).trim(), {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) return fail(error);
  return { ok: true, sent: true };
}

/* Used after arriving back from a reset link, and from "change my password". */
export async function updatePassword(password) {
  if (!enabled) return off();
  const { error } = await supa().auth.updateUser({ password });
  return error ? fail(error) : { ok: true };
}

export async function signOut() {
  if (!enabled) return off();
  await supa().auth.signOut();
  return { ok: true };
}

export async function currentUser() {
  if (!enabled) return null;
  const { data } = await supa().auth.getUser();
  return data ? data.user : null;
}

export function onAuthChange(fn) {
  if (!enabled) return () => {};
  const { data } = supa().auth.onAuthStateChange((_e, session) => fn(session ? session.user : null));
  return () => data.subscription.unsubscribe();
}

/* -------------------------------------------------------------- family ---- */

/* The creator becomes admin via a database trigger, not a second insert here:
   doing it client-side would leave a baby with no admin if the app died between
   the two calls. */
export async function createBaby(profile, userId) {
  if (!enabled) return off();
  const { data, error } = await supa().from("babies").insert({
    name: profile.name, birthdate: profile.birthdate || null, notes: profile.notes || null,
    home_label: profile.home ? profile.home.label : null,
    home_lat: profile.home ? profile.home.lat : null,
    home_lng: profile.home ? profile.home.lng : null,
    created_by: userId,
  }).select().single();
  if (error) return fail(error);
  return { ok: true, baby: data };
}

export async function myBabies() {
  if (!enabled) return { ok: true, babies: [] };
  const { data, error } = await supa()
    .from("baby_members").select("role, display_name, babies(id, name, birthdate, notes, home_label, home_lat, home_lng)");
  if (error) return fail(error);
  return { ok: true, babies: (data || []).filter((r) => r.babies).map((r) => ({ ...r.babies, role: r.role, displayName: r.display_name })) };
}

export async function members(babyId) {
  if (!enabled) return { ok: true, members: [] };
  const { data, error } = await supa().from("baby_members")
    .select("user_id, role, display_name, joined_at").eq("baby_id", babyId).order("joined_at");
  if (error) return fail(error);
  return { ok: true, members: (data || []).map((m) => ({ userId: m.user_id, role: m.role, name: m.display_name, joinedAt: m.joined_at })) };
}

export async function setRole(babyId, userId, role) {
  if (!enabled) return off();
  const { error } = await supa().from("baby_members").update({ role }).eq("baby_id", babyId).eq("user_id", userId);
  return error ? fail(error) : { ok: true };
}

export async function removeMember(babyId, userId) {
  if (!enabled) return off();
  const { error } = await supa().from("baby_members").delete().eq("baby_id", babyId).eq("user_id", userId);
  return error ? fail(error) : { ok: true };
}

export async function setMyName(babyId, name) {
  if (!enabled) return off();
  const u = await currentUser(); if (!u) return off();
  const { error } = await supa().from("baby_members").update({ display_name: name }).eq("baby_id", babyId).eq("user_id", u.id);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------- invites --- */

/* The code is generated client-side but is not a secret: it is single-use,
   expiring, and bound to one baby AND one role server-side. A collision simply
   fails the insert on the primary key, so we retry a couple of times. */
export async function createInvite(babyId, role, label) {
  if (!enabled) return off();
  const u = await currentUser(); if (!u) return off();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeInviteCode(6);
    const { data, error } = await supa().from("invites")
      .insert({ code, baby_id: babyId, role, invited_by: u.id, label: label || null })
      .select().single();
    if (!error) return { ok: true, invite: data };
    if (!String(error.message || "").includes("duplicate")) return fail(error);
  }
  return { ok: false, error: "Couldn't make a code just now — try again." };
}

export async function listInvites(babyId) {
  if (!enabled) return { ok: true, invites: [] };
  const { data, error } = await supa().from("invites")
    .select("code, role, label, expires_at, used_by, used_at").eq("baby_id", babyId).order("created_at", { ascending: false });
  if (error) return fail(error);
  return { ok: true, invites: data || [] };
}

export async function revokeInvite(code) {
  if (!enabled) return off();
  const { error } = await supa().from("invites").delete().eq("code", code);
  return error ? fail(error) : { ok: true };
}

/* Goes through the SECURITY DEFINER function on purpose: redeeming must not
   require the ability to READ the invites table, or codes could be enumerated. */
export async function redeemInvite(code, displayName) {
  if (!enabled) return off();
  const { data, error } = await supa().rpc("redeem_invite", {
    p_code: String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    p_display_name: displayName || null,
  });
  if (error) return fail(error);
  return { ok: true, babyId: data };
}

/* ------------------------------------------------------- first upload ----- */

/* The one-time "bring my journal with me" step. Explicit, never silent: this is
   the moment a device's private photographs become a family's shared record,
   and a caregiver should have pressed something to make it happen.
   Photos are NOT uploaded here — that is a separate, larger step, and pretending
   otherwise would leave someone thinking their pictures were backed up. */
export async function uploadLocal(babyId, userId, visits, plans) {
  if (!enabled) return off();
  const memRows = (visits || []).map((v) => ({
    baby_id: babyId, author_id: userId,
    kind: v.kind === "journal" ? "journal" : v.kind === "custom" ? "custom" : "visit",
    idea_id: v.ideaId || null, name: v.name || null, place: v.place || null,
    cat: v.cat || null, emoji: v.emoji || null, rating: v.rating || null,
    note: v.note || null, with_who: v.by || null,
    pin_lat: v.pin ? v.pin.lat : null, pin_lng: v.pin ? v.pin.lng : null,
    happened_at: new Date(v.ts || Date.now()).toISOString(),
  }));
  const planRows = (plans || []).map((p) => ({
    baby_id: babyId, added_by: userId, idea_id: p.ideaId || null, name: p.name,
    place: p.place || null, area: p.area || null, cat: p.cat || null, emoji: p.emoji || null,
    status: p.status === "out" ? "out" : "planned",
    pin_lat: p.pin ? p.pin.lat : null, pin_lng: p.pin ? p.pin.lng : null,
  }));

  /* Chunked: a long journal in one request is the kind of thing that works on
     wifi and fails on a train. */
  const chunk = async (table, rows) => {
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supa().from(table).insert(rows.slice(i, i + 50));
      if (error) throw error;
    }
  };
  try {
    if (memRows.length) await chunk("memories", memRows);
    if (planRows.length) await chunk("plans", planRows);
  } catch (e) { return fail(e); }
  return { ok: true, memories: memRows.length, plans: planRows.length };
}

/* -------------------------------------------------- likes and comments ---- */

export async function likesFor(babyId, memoryIds) {
  if (!enabled || !memoryIds.length) return { ok: true, likes: {} };
  const { data, error } = await supa().from("memory_likes")
    .select("memory_id, user_id").eq("baby_id", babyId).in("memory_id", memoryIds);
  if (error) return fail(error);
  const out = {};
  (data || []).forEach((l) => { (out[l.memory_id] = out[l.memory_id] || []).push(l.user_id); });
  return { ok: true, likes: out };
}

export async function toggleLike(babyId, memoryId, liked) {
  if (!enabled) return off();
  const u = await currentUser(); if (!u) return off();
  const q = supa().from("memory_likes");
  const { error } = liked
    ? await q.delete().eq("memory_id", memoryId).eq("user_id", u.id)
    : await q.insert({ memory_id: memoryId, baby_id: babyId, user_id: u.id });
  return error ? fail(error) : { ok: true };
}

export async function commentsFor(babyId, memoryId) {
  if (!enabled) return { ok: true, comments: [] };
  const { data, error } = await supa().from("memory_comments")
    .select("id, author_id, body, created_at").eq("baby_id", babyId).eq("memory_id", memoryId).order("created_at");
  if (error) return fail(error);
  return { ok: true, comments: (data || []).map((c) => ({ id: c.id, authorId: c.author_id, body: c.body, at: c.created_at })) };
}

export async function addComment(babyId, memoryId, body) {
  if (!enabled) return off();
  const u = await currentUser(); if (!u) return off();
  const text = String(body || "").trim();
  if (!text) return { ok: false, error: "Write something first." };
  const { data, error } = await supa().from("memory_comments")
    .insert({ memory_id: memoryId, baby_id: babyId, author_id: u.id, body: text }).select().single();
  return error ? fail(error) : { ok: true, comment: data };
}

export async function deleteComment(id) {
  if (!enabled) return off();
  const { error } = await supa().from("memory_comments").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}
