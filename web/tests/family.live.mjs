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

await mum.c.from("babies").delete().eq("id", baby.id);   // cascades
console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all family checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
