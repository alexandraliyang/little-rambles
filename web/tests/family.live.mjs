/* family.live — exercises the REAL database: two accounts, an invite, roles,
   likes and comments. Not part of `npm test` (it needs the network and creates
   rows); run deliberately with `npm run test:family`.

   The point is the negative cases. Anyone can write a happy path that passes
   because RLS was never actually asked a hard question. These check that a
   viewer CANNOT log an outing, that a stranger CANNOT read a baby, and that the
   last admin cannot lock themselves out — the failures that matter. */
import { createClient } from "@supabase/supabase-js";
import { SUPA_URL, SUPA_ANON } from "../lib/supa.js";

const fails = [];
const ok = (n, c, d) => { if (c) console.log("  PASS  " + n + (d ? "  [" + d + "]" : "")); else { console.log("  FAIL  " + n + (d ? " — " + d : "")); fails.push(n); } };
const client = () => createClient(SUPA_URL, SUPA_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const mk = (who) => `lr.test.${who}.${stamp}@gmail.com`;
const PW = "Test-probe-12345!";

console.log("\nfamily sharing — live database\n");

/* Email confirmation is ON, so signUp does not return a session. Creating the
   user then signing in works because confirmation gates the LINK, not the
   password grant, for accounts created this way. */
async function account(who) {
  const c = client();
  const { error: se } = await c.auth.signUp({ email: mk(who), password: PW });
  if (se && !String(se.message).includes("already")) return { c, user: null, blocked: se.message };
  const { data, error } = await c.auth.signInWithPassword({ email: mk(who), password: PW });
  if (error) return { c, user: null, blocked: error.message };
  return { c, user: data.user };
}

const mum = await account("mum");
const gran = await account("gran");

if (!mum.user || !gran.user) {
  const why = String(mum.blocked || gran.blocked || "");
  ok("two accounts can be created and signed in", false,
     "mum: " + (mum.blocked || "ok") + " · gran: " + (gran.blocked || "ok"));
  if (/rate limit/i.test(why)) {
    console.log("\n  Supabase's BUILT-IN email service is rate limited to a handful of messages\n" +
                "  per hour. It is a development convenience, not a mail service.\n\n" +
                "  This matters twice over for a family beta: it blocks this test, and it will\n" +
                "  silently fail to deliver confirmation mail to invited grandparents.\n\n" +
                "  Fix (either is fine for beta):\n" +
                "    Supabase -> Authentication -> Sign In / Providers -> Email\n" +
                "      turn OFF 'Confirm email'   <- no mail is sent at all, and the invite\n" +
                "                                    code is the real gate, not the inbox\n" +
                "    or Project Settings -> Auth -> SMTP: point at your own sender\n");
  } else if (/confirm/i.test(why)) {
    console.log("\n  Email confirmation is on, so password sign-in is refused until the link\n" +
                "  is clicked. Turn OFF 'Confirm email' for beta, or configure SMTP.\n");
  }
  process.exit(1);
}
ok("two accounts exist and can sign in", true, "mum + gran");

/* --- the email+password path, in its own right: not everyone wants Google --- */
{
  const em = `lr.test.pw.${stamp}@gmail.com`;
  const a = client();
  const su = await a.auth.signUp({ email: em, password: "Grandma-2026!" });
  ok("someone can register with email and password", !su.error && !!su.data.session, su.error && su.error.message);
  const b = client();
  const si = await b.auth.signInWithPassword({ email: em, password: "Grandma-2026!" });
  ok("and sign in again later on another device", !si.error, si.error && si.error.message);
  const bad = await b.auth.signInWithPassword({ email: em, password: "not-the-password" });
  ok("a wrong password is refused", !!bad.error, bad.error && bad.error.message);
  const weak = await client().auth.signUp({ email: `lr.test.weak.${stamp}@gmail.com`, password: "123" });
  ok("a too-short password is refused", !!weak.error, weak.error && weak.error.message);
  const dup = await client().auth.signUp({ email: em, password: "Different-1234!" });
  ok("registering an email twice is refused", !!dup.error, dup.error && dup.error.message);
}

/* --- mum creates a baby and is made admin by the trigger --- */
const { data: baby, error: be } = await mum.c.from("babies")
  .insert({ name: "Test Baby " + stamp, created_by: mum.user.id }).select().single();
ok("an account can create a baby", !be && !!baby, be ? be.message : baby.id);
if (!baby) process.exit(1);

const { data: mem } = await mum.c.from("baby_members").select("role").eq("baby_id", baby.id).eq("user_id", mum.user.id).single();
ok("the creator is made admin automatically (trigger, not client)", mem && mem.role === "admin", mem && mem.role);

/* --- a stranger sees nothing: the load-bearing assertion --- */
const { data: strangerRows } = await gran.c.from("babies").select("*").eq("id", baby.id);
ok("a stranger CANNOT read someone else's baby", (strangerRows || []).length === 0,
   "rows visible: " + (strangerRows || []).length);
const { error: strangerWrite } = await gran.c.from("memories")
  .insert({ baby_id: baby.id, author_id: gran.user.id, name: "should not exist" });
ok("a stranger CANNOT write to someone else's baby", !!strangerWrite, strangerWrite ? "refused" : "ALLOWED — RLS HOLE");

/* --- invite as viewer, redeem as gran --- */
const code = "T" + String(stamp).slice(-5);
const { error: ie } = await mum.c.from("invites")
  .insert({ code, baby_id: baby.id, role: "viewer", invited_by: mum.user.id, label: "Grandma" });
ok("an admin can create an invite", !ie, ie && ie.message);

const { data: joinedId, error: re } = await gran.c.rpc("redeem_invite", { p_code: code, p_display_name: "Grandma" });
ok("an invited person can redeem the code", !re && joinedId === baby.id, re ? re.message : "joined");
const { data: reuse } = await gran.c.rpc("redeem_invite", { p_code: code });
ok("an invite code is single-use", !reuse, "second attempt refused");

/* --- now a member: can read, cannot write --- */
const { data: granSees } = await gran.c.from("babies").select("*").eq("id", baby.id);
ok("a member CAN read the baby", (granSees || []).length === 1);
const { error: granWrite } = await gran.c.from("memories")
  .insert({ baby_id: baby.id, author_id: gran.user.id, name: "viewer outing" });
ok("a VIEWER cannot log an outing", !!granWrite, granWrite ? "refused" : "ALLOWED — RLS HOLE");

/* --- mum logs one; gran likes and comments on it --- */
const { data: memory, error: me } = await mum.c.from("memories")
  .insert({ baby_id: baby.id, author_id: mum.user.id, name: "Park", place: "Kits Beach", rating: "loved" }).select().single();
ok("a caregiver/admin can log an outing", !me && !!memory, me && me.message);

const { error: le } = await gran.c.from("memory_likes").insert({ memory_id: memory.id, baby_id: baby.id, user_id: gran.user.id });
ok("a viewer CAN like a memory", !le, le && le.message);
const { error: ce } = await gran.c.from("memory_comments")
  .insert({ memory_id: memory.id, baby_id: baby.id, author_id: gran.user.id, body: "She looks so happy!" });
ok("a viewer CAN comment", !ce, ce && ce.message);

const { data: seenByMum } = await mum.c.from("memory_comments").select("body").eq("memory_id", memory.id);
ok("the comment is visible to the rest of the family", (seenByMum || []).length === 1,
   (seenByMum || [])[0] && seenByMum[0].body);

/* --- a viewer cannot forge someone else's authorship --- */
const { error: forge } = await gran.c.from("memory_comments")
  .insert({ memory_id: memory.id, baby_id: baby.id, author_id: mum.user.id, body: "pretending to be mum" });
ok("nobody can post a comment as someone else", !!forge, forge ? "refused" : "ALLOWED — RLS HOLE");

/* --- promotion works, and the last admin cannot be removed --- */
const { error: pe } = await mum.c.from("baby_members").update({ role: "caregiver" }).eq("baby_id", baby.id).eq("user_id", gran.user.id);
ok("an admin can promote a viewer to caregiver", !pe, pe && pe.message);
const { error: nowWrite } = await gran.c.from("memories")
  .insert({ baby_id: baby.id, author_id: gran.user.id, name: "now allowed" });
ok("the promotion takes effect immediately", !nowWrite, nowWrite && nowWrite.message);

/* --- removal really removes --- */
await mum.c.from("baby_members").delete().eq("baby_id", baby.id).eq("user_id", gran.user.id);
const { data: afterRemoval } = await gran.c.from("babies").select("*").eq("id", baby.id);
ok("a removed member loses access immediately", (afterRemoval || []).length === 0,
   "rows visible after removal: " + (afterRemoval || []).length);

/* --- FB28: SYNC. The point of all of this — mum logs an outing, gran sees it,
       gran comments, mum sees the comment. Asserted through the same client
       code the app uses, not raw SQL, so a broken mapping fails here. --- */
{
  /* gran is a caregiver on mum's baby again for this section */
  await mum.c.from("baby_members").update({ role: "caregiver" }).eq("baby_id", baby.id).eq("user_id", gran.user.id);
  await mum.c.from("baby_members").insert({ baby_id: baby.id, user_id: gran.user.id, role: "caregiver", display_name: "Grandma" })
    .then(() => {}, () => {});

  const { data: outing } = await mum.c.from("memories").insert({
    baby_id: baby.id, author_id: mum.user.id, author_name: "Mum",
    kind: "visit", name: "Duck pond", place: "Trout Lake", rating: "loved",
    note: "twenty minutes of pure joy", happened_at: new Date().toISOString(),
  }).select().single();
  ok("FB28 a caregiver logs an outing", !!outing, outing && outing.id);

  const { data: granSeesIt } = await gran.c.from("memories").select("*").eq("id", outing.id);
  ok("FB28 the other phone can see it", (granSeesIt || []).length === 1,
     (granSeesIt || [])[0] && granSeesIt[0].name);
  ok("FB28 and knows who logged it", (granSeesIt || [])[0] && granSeesIt[0].author_name === "Mum",
     (granSeesIt || [])[0] && granSeesIt[0].author_name);

  const { error: likeErr } = await gran.c.from("memory_likes")
    .insert({ memory_id: outing.id, baby_id: baby.id, user_id: gran.user.id });
  ok("FB28 the other phone can like it", !likeErr, likeErr && likeErr.message);

  const { data: cmt, error: cErr } = await gran.c.from("memory_comments")
    .insert({ memory_id: outing.id, baby_id: baby.id, author_id: gran.user.id,
              author_name: "Grandma", body: "She looks so happy!" }).select().single();
  ok("FB28 and comment on it", !cErr, cErr && cErr.message);

  const { data: mumSees } = await mum.c.from("memory_comments").select("author_name, body").eq("memory_id", outing.id);
  ok("FB28 the comment comes back to the person who logged it", (mumSees || []).length === 1,
     (mumSees || [])[0] && (mumSees[0].author_name + ": " + mumSees[0].body));

  /* The founder's decision: leaving keeps what you wrote, WITH your name. */
  await gran.c.rpc("leave_baby", { p_baby: baby.id });
  const { data: afterLeaving } = await mum.c.from("memory_comments").select("author_name, body").eq("memory_id", outing.id);
  ok("FB28 the comment survives its author leaving, still attributed",
     (afterLeaving || []).length === 1 && afterLeaving[0].author_name === "Grandma",
     (afterLeaving || [])[0] ? afterLeaving[0].author_name : "gone");
  const { data: granAfter } = await gran.c.from("memories").select("id").eq("id", outing.id);
  ok("FB28 but they can no longer see the outing itself", (granAfter || []).length === 0,
     (granAfter || []).length + " rows visible");
}

/* --- FB27: one person, two families. The model always allowed it; the UI
       assumed babies[0]. These assert the data half so the switcher has
       something real to switch between. --- */
{
  const { data: b2 } = await gran.c.from("babies")
    .insert({ name: "Second Baby " + stamp, created_by: gran.user.id }).select().single();
  ok("a second person can create their OWN family", !!b2, b2 && b2.id);

  /* mum joins gran's family as a viewer, while still admin of her own */
  const code2 = "S" + String(stamp).slice(-5);
  await gran.c.from("invites").insert({ code: code2, baby_id: b2.id, role: "viewer", invited_by: gran.user.id, label: "Auntie" });
  const { error: re2 } = await mum.c.rpc("redeem_invite", { p_code: code2 });
  ok("someone can join a SECOND family while running their own", !re2, re2 && re2.message);

  /* Scoped to the two families THIS run created. Earlier runs that failed part
     way through leave babies behind, so asserting on the whole account counts
     other people's litter and fails for the wrong reason. */
  /* .eq("user_id") matters: members_read deliberately lets you see EVERYONE in
     a family you belong to, so an unfiltered select returns other people's rows
     as well as your own. Without it this counted gran's membership too. */
  const { data: allMine } = await mum.c.from("baby_members")
    .select("baby_id, role, display_name").eq("user_id", mum.user.id);
  const mine = (allMine || []).filter((m) => m.baby_id === baby.id || m.baby_id === b2.id);
  ok("both memberships are visible to that person", mine.length === 2,
     mine.map((m) => m.role).join(" + ") + "  (account holds " + (allMine || []).length + " in total)");
  ok("the roles differ per family, not per person",
     new Set(mine.map((m) => m.role)).size === 2, JSON.stringify(mine.map((m) => m.role)));
  ok("the invite's label became the display name (FB24)",
     mine.some((m) => m.display_name === "Auntie"), JSON.stringify(mine.map((m) => m.display_name)));

  /* leaving one must not touch the other */
  const { error: le2 } = await mum.c.rpc("leave_baby", { p_baby: b2.id });
  const missing = le2 && /Could not find the function/i.test(le2.message);
  if (missing) {
    const NL = String.fromCharCode(10);
    console.log(NL + "  ----  leave_baby is not in the database yet.");
    console.log("        Run web/supabase/005_leaving_and_profiles.sql, then re-run.");
    console.log("        Skipping the leaving checks rather than passing them by accident." + NL);
  } else {
    ok("leaving one family is allowed for a non-admin member", !le2, le2 && le2.message);
    const { data: after } = await mum.c.from("baby_members").select("baby_id").eq("user_id", mum.user.id);
    ok("leaving one family leaves the other untouched",
       !(after || []).some((m) => m.baby_id === b2.id), "b2 membership gone");
    /* Must fail for the RIGHT reason: the rule, not a missing function. */
    const { error: le3 } = await mum.c.rpc("leave_baby", { p_baby: baby.id });
    ok("the only admin cannot leave their own page",
       !!le3 && /admin/i.test(le3.message), le3 ? le3.message : "ALLOWED - lockout risk");
  }

  await gran.c.from("babies").delete().eq("id", b2.id);
}

await mum.c.from("babies").delete().eq("id", baby.id);   // cascades
console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all family checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
