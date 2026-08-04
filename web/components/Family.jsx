/* Family — sign in, create or join a baby's page, manage who is in it.
   Self-contained on purpose (ADR-0014): it holds its own state and needs none of
   App's 69 values, so it lives outside app.jsx rather than growing it.

   Two rules run through this file:
   - The app works without an account. Nothing here is required to log an outing.
   - Never promise what the backend cannot deliver. Email may not arrive (T11),
     so anything depending on it says "if it doesn't arrive" rather than "sent!".
*/
import React, { useState, useEffect } from "react";
import {
  signIn, signUp, signInWith, sendMagicLink, resetPassword, signOut,
  currentUser, onAuthChange, createBaby, myBabies, members, setRole,
  removeMember, createInvite, listInvites, revokeInvite, redeemInvite, uploadLocal,
  leaveFamily, updateMyProfile, uploadAvatar, avatarUrl,
} from "../lib/family.js";
import { enabled } from "../lib/supa.js";
import { can, canRemoveMember, canChangeMember, canLeave, ROLES, ROLE_LABEL } from "../engine/roles.js";
import InviteSheet from "./Invite.jsx";
import Sheet from "./Sheet.jsx";

/* The same words as the invite sheet, so one thing is never called two names. */
const roleWord = { admin: "Full access", caregiver: "Can look and add", viewer: "Can look, like and comment" };

export default function Family({ profile, visits, plans, say }) {
  const [user, setUser] = useState(null);
  const [baby, setBaby] = useState(null);
  const [me, setMe] = useState(null);          // my membership row for this baby
  const [people, setPeople] = useState([]);
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("in");      // in | up | link | reset
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [note, setNote] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [reshow, setReshow] = useState(null);
  const [avatars, setAvatars] = useState({});      // signed URLs, per member
  const [newFolk, setNewFolk] = useState([]);      // FB26: joined since you last looked
  const [editingMe, setEditingMe] = useState(false);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    if (!enabled) return;
    currentUser().then(setUser);
    return onAuthChange(setUser);
  }, []);

  /* FB20: an invite LINK lands here as ?join=CODE. Prefill and open the join
     panel — asking someone to retype a code that was inside the link they just
     tapped is the kind of thing that makes people give up. */
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("join");
    if (!c) return;
    setJoinCode(c.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    setShowJoin(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const load = async () => {
    const r = await myBabies();
    if (!r.ok) { setErr(r.error); return; }
    const b = r.babies[0] || null;
    setBaby(b);
    if (!b) return;
    setMe({ userId: user.id, role: b.role });
    const m = await members(b.id);
    if (m.ok) {
      setPeople(m.members);
      const mine = m.members.find((x) => x.userId === user.id);
      if (mine) setMyName(mine.name || "");
      /* FB26: in-app notice, no server needed. Anyone whose membership is newer
         than the last time this screen was opened on this device is "new". Push
         comes later (T7); this is the half that works today. */
      const key = "lr:seen-members:" + b.id;
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
      if (seen.length) {
        const fresh = m.members.filter((x) => !seen.includes(x.userId) && x.userId !== user.id);
        if (fresh.length) setNewFolk(fresh);
      }
      try { localStorage.setItem(key, JSON.stringify(m.members.map((x) => x.userId))); } catch (e) {}
      /* Signed URLs expire, so they are fetched per load rather than stored. */
      const urls = {};
      await Promise.all(m.members.filter((x) => x.avatar).map(async (x) => { urls[x.userId] = await avatarUrl(x.avatar); }));
      setAvatars(urls);
    }
    if (b.role === "admin") { const i = await listInvites(b.id); if (i.ok) setCodes(i.invites.filter((x) => !x.used_by)); }
  };
  useEffect(() => { if (user) load(); else { setBaby(null); setPeople([]); setCodes([]); } }, [user]);

  const run = async (fn, after) => {
    setBusy(true); setErr(""); setNote("");
    const r = await fn();
    setBusy(false);
    if (!r || r.ok === false) { setErr((r && r.error) || "Something went wrong."); return null; }
    if (after) await after(r);
    return r;
  };

  if (!enabled) return <div className="card"><p className="why">Family sharing isn't switched on in this build.</p></div>;

  /* ---------------------------------------------------------- signed out -- */
  if (!user) return (
    <>
      <div className="card hl">
        <p className="why"><b>Everything works without an account.</b> Signing in adds two things: your journal is backed up, and you can invite family to see it.</p>
      </div>

      <button className="primary full" disabled={busy} onClick={() => run(() => signInWith("google"))}>
        Continue with Google
      </button>
      <p className="fine center">Fastest for grandparents — nothing to type or remember.</p>

      <div className="orline"><span>or</span></div>

      <div className="chips">
        {[["in", "I have an account"], ["up", "Create an account"], ["link", "Email me a link"]].map(([k, l]) =>
          <button key={k} className={"chip" + (mode === k ? " on" : "")} onClick={() => { setMode(k); setErr(""); setNote(""); }}>{l}</button>)}
      </div>

      <input className="inp" type="email" autoComplete="email" placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {(mode === "in" || mode === "up") &&
        <input className="inp" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"}
          placeholder={mode === "up" ? "choose a password (6+ characters)" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} />}

      {mode === "in" && <>
        <button className="primary full" disabled={busy || !email || !pw} onClick={() => run(() => signIn(email, pw))}>Sign in</button>
        <button className="ghost full mt" onClick={() => { setMode("reset"); setErr(""); }}>I've forgotten my password</button>
      </>}
      {mode === "up" && <button className="primary full" disabled={busy || !email || !pw}
        onClick={() => run(() => signUp(email, pw), (r) => r.needsConfirm && setNote("Check your email to confirm, then sign in."))}>Create account</button>}
      {mode === "link" && <>
        <button className="primary full" disabled={busy || !email}
          onClick={() => run(() => sendMagicLink(email), () => setNote("Link sent. If it doesn't arrive in a few minutes, use a password instead — our email delivery is still being set up."))}>Send me a link</button>
        <p className="fine">No password to remember. Depends on email arriving, which isn't fully reliable yet.</p>
      </>}
      {mode === "reset" && <>
        <button className="primary full" disabled={busy || !email}
          onClick={() => run(() => resetPassword(email), () => setNote("If that email has an account, a reset link is on its way. If nothing arrives, tell Alex — our email delivery is still being set up."))}>Send a reset link</button>
        <button className="ghost full mt" onClick={() => setMode("in")}>Back</button>
      </>}

      {err && <p className="warnbox">{err}</p>}
      {note && <p className="okbox">{note}</p>}

      {/* FB24-02: there was nowhere to enter a code unless you arrived on a
          link. Someone read a code down the phone had no way in at all. */}
      <div className="lbl">Been given a code?</div>
      <div className="card">
        <p className="why">Sign in above first — the code box appears straight after.</p>
      </div>
    </>
  );

  /* ------------------------------------------------- signed in, no baby --- */
  if (!baby) return (
    <>
      <div className="card hl">
        <p className="why">Signed in as <b>{user.email}</b></p>
      </div>

      {!showJoin ? <>
        <div className="lbl">Start {profile.name}'s page</div>
        <div className="card">
          <p className="why">This makes {profile.name} the account. You'll be the admin, and you can invite family afterwards.</p>
          {(visits.length > 0 || plans.length > 0) &&
            <p className="why"><b>Your {visits.length} {visits.length === 1 ? "memory" : "memories"}{plans.length ? " and " + plans.length + " saved ideas" : ""} will come with you.</b> Photos stay on this phone for now — moving those is a separate step.</p>}
          <button className="primary full" disabled={busy} onClick={() => run(
            async () => {
              const b = await createBaby(profile, user.id);
              if (!b.ok) return b;
              if (visits.length || plans.length) {
                const up = await uploadLocal(b.baby.id, user.id, visits, plans);
                if (!up.ok) return up;
              }
              return b;
            },
            async () => { say("Family page created."); await load(); })}>
            Create {profile.name}'s page
          </button>
        </div>
        <button className="ghost full mt" onClick={() => setShowJoin(true)}>I have an invite code instead</button>
      </> : <>
        <div className="lbl">Join a family</div>
        <div className="card">
          <p className="why">Enter the six-character code you were sent.</p>
          <input className="inp code" placeholder="ABC123" maxLength={7} value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
          <button className="primary full" disabled={busy || joinCode.replace(/[^A-Z0-9]/g, "").length !== 6}
            onClick={() => run(() => redeemInvite(joinCode, null), async () => { say("You're in."); setJoinCode(""); await load(); })}>Join</button>
        </div>
        <button className="ghost full mt" onClick={() => setShowJoin(false)}>Back</button>
      </>}

      {err && <p className="warnbox">{err}</p>}
      <button className="ghost full mt" onClick={() => run(() => signOut())}>Sign out</button>
    </>
  );

  /* ----------------------------------------------------- signed in, baby -- */
  const isAdmin = me && me.role === "admin";
  return (
    <>
      <div className="card hl">
        <h3 className="ctitle">{baby.name}'s page</h3>
        <p className="why">You're signed in as <b>{user.email}</b> · {roleWord[me ? me.role : "viewer"]}</p>
      </div>

      {/* FB26: "Grandma joined" is the notification that works with no server. */}
      {newFolk.length > 0 && <div className="nudge away"><span>👋</span>
        <p><b>{newFolk.map((f) => f.name || "Someone").join(", ")} {newFolk.length === 1 ? "has" : "have"} joined {baby.name}'s page.</b> They can see the outings and photos from now on.</p>
        <button className="mini x" onClick={() => setNewFolk([])}>✕</button></div>}

      <div className="lbl">Who can see {baby.name} ({people.length})</div>
      <div className="card">
        {people.map((p) => {
          const isMe = p.userId === user.id;
          return <div className="uarow" key={p.userId}>
            {/* Relationship first, permission second: "Grandma · can look and
                comment" reads like a family; "viewer" reads like an ACL. */}
            <span className="mwho">
              <span className="mline">
                {avatars[p.userId]
                  ? <img className="mavatar" src={avatars[p.userId]} alt="" />
                  : <span className="mavatar ph">{(p.name || "?").trim().charAt(0).toUpperCase()}</span>}
                <b>{p.name || (isMe ? "You" : "Family member")}</b>{isMe ? " (you)" : ""}
              </span>
              <small className="msub">{roleWord[p.role]}</small></span>
            {isAdmin && !isMe && <span className="uaacts">
              <select className="rolesel" value={p.role} onChange={(e) => {
                const check = canChangeMember(me, p, people, e.target.value);
                if (!check.ok) { setErr(check.why); return; }
                run(() => setRole(baby.id, p.userId, e.target.value), load);
              }}>
                {ROLES.map((r) => <option key={r} value={r}>{roleWord[r]}</option>)}
              </select>
              <button className="mini" title="Remove" onClick={() => {
                const check = canRemoveMember(me, p, people);
                if (!check.ok) { setErr(check.why); return; }
                run(() => removeMember(baby.id, p.userId), load);
              }}>✕</button>
            </span>}
          </div>;
        })}
        {!isAdmin && <p className="fine">Only an admin can invite or remove people.</p>}
      </div>

      {/* FB24-02: joining a SECOND family, or a first one after already making
          your own, was impossible — the code box only existed in the no-baby
          state. */}
      {!showJoin
        ? <button className="ghost full mt" onClick={() => setShowJoin(true)}>I've been given an invite code</button>
        : <div className="card">
            <div className="lbl tight">Enter an invite code</div>
            <input className="inp code" placeholder="ABC123" maxLength={7} value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
            <button className="primary full" disabled={busy || joinCode.replace(/[^A-Z0-9]/g, "").length !== 6}
              onClick={() => run(() => redeemInvite(joinCode, null), async () => { say("You're in."); setJoinCode(""); setShowJoin(false); await load(); })}>Join</button>
            <button className="ghost full mt" onClick={() => { setShowJoin(false); setJoinCode(""); }}>Cancel</button>
          </div>}

      {isAdmin && <>
        <div className="lbl">Invite family</div>
        <div className="card">
          <p className="why">Who they are and exactly what they can do, chosen together on one screen — then send a link, a QR code, or six characters you can read down the phone.</p>
          <button className="primary full" onClick={() => { setErr(""); setInviting(true); }}>➕ Invite someone</button>
        </div>

        {/* FB22-02: pending codes belong to the invite card, not a section of
            their own — they are part of managing invites, not a separate topic. */}
        {codes.length > 0 && <div className="card">
          <div className="lbl tight">Waiting to be used ({codes.length})</div>
            {codes.map((c) => <div className="uarow" key={c.code}>
              <span className="mwho"><b className="codeval">{c.code}</b>
                <small className="msub">{c.label ? c.label + " · " : ""}{roleWord[c.role]} · expires {new Date(c.expires_at).toLocaleDateString()}</small></span>
              <span className="uaacts">
                <button className="mini" title="Show this invite again" onClick={() => setReshow(c)}>👁</button>
                {/* FB20: destructive, so it asks. The old version put this ✕ directly
                    beside the share button, both tiny — a mistap silently destroyed
                    the code you were trying to send. */}
                <button className="mini" title="Cancel this code" onClick={() => {
                  if (window.confirm("Cancel code " + c.code + "?\n\nAnyone still holding it won't be able to join.")) run(() => revokeInvite(c.code), load);
                }}>✕</button>
              </span>
            </div>)}
          <p className="fine">Each code works once and expires after two weeks.</p>
        </div>}
      </>}

      {(inviting || reshow) && <Sheet onClose={() => { setInviting(false); setReshow(null); }}>
        <InviteSheet babyName={baby.name} say={say} existing={reshow}
          onCreate={(role, label) => createInvite(baby.id, role, label)}
          onClose={async () => { setInviting(false); setReshow(null); await load(); }} />
      </Sheet>}

      <div className="lbl">You on this page</div>
      <div className="card">
        {!editingMe
          ? <>
            <p className="why">You appear as <b>{myName || "Family member"}</b>. This is the name on your comments and on outings you log.</p>
            <div className="pills"><button className="pillbtn" onClick={() => setEditingMe(true)}>Change name or photo</button></div>
          </>
          : <>
            <label className="flab">What should people call you?</label>
            <input className="inp" placeholder="Mum, Dad, Grandma…" value={myName} onChange={(e) => setMyName(e.target.value)} />
            <div className="btns">
              <label className="pick main">🖼️ Choose a photo
                <input type="file" accept="image/*" hidden onChange={async (e) => {
                  const f = e.target.files && e.target.files[0]; e.target.value = "";
                  if (!f) return;
                  await run(async () => {
                    const up = await uploadAvatar(baby.id, f);
                    if (!up.ok) return up;
                    return updateMyProfile(baby.id, { avatarPath: up.path });
                  }, async () => { say("Photo updated."); await load(); });
                }} /></label>
            </div>
            <button className="primary full" onClick={() => run(() => updateMyProfile(baby.id, { name: myName.trim() || null }),
              async () => { say("Saved."); setEditingMe(false); await load(); })}>Save</button>
            <button className="ghost full mt" onClick={() => setEditingMe(false)}>Cancel</button>
          </>}
      </div>

      {err && <p className="warnbox">{err}</p>}

      {/* FB26: leaving is not removing. Anything you wrote stays, attributed —
          the founder's decision, and the reason comment authorship is stored on
          the comment rather than looked up from a membership that may be gone. */}
      <button className="ghost full mt" onClick={() => {
        const check = canLeave(me, people);
        if (!check.ok) { setErr(check.why); return; }
        const msg = "Leave " + baby.name + "'s page?" + String.fromCharCode(10, 10) +
          "You'll stop seeing new outings and photos. Anything you've written stays, with your name on it.";
        if (!window.confirm(msg)) return;

        run(() => leaveFamily(baby.id), async () => { say("You've left " + baby.name + "'s page."); await load(); });
      }}>Leave this family</button>

      <button className="ghost full mt" onClick={() => run(() => signOut(), () => say("Signed out. Your journal is still on this phone."))}>Sign out</button>
    </>
  );
}
