/* Family — accounts, families, members and invitations.

   Structured as a small router rather than one long screen, because these are
   genuinely different jobs: seeing who is in a family, administering invites,
   and moving between the families you belong to.

     home     who can see this child · you on this page · leave
     invites  make an invite · codes waiting to be used
     switch   every family you belong to · join another with a code

   THE ASSUMPTION THIS FIXES. baby_members has always been many-to-many — a
   person can be admin of their own child and a viewer on a friend's — but the
   UI took babies[0] and never looked again. So being invited to a second family
   silently did nothing: you joined, and there was nowhere to go. The founder
   put it exactly right: "the whole logistics does not exist".

   Two rules still run through this file:
   - The app works without an account. None of this is required to log an outing.
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
import { canRemoveMember, canChangeMember, canLeave, ROLES } from "../engine/roles.js";
import InviteSheet from "./Invite.jsx";
import Sheet from "./Sheet.jsx";

const roleWord = { admin: "Full access", caregiver: "Can look and add", viewer: "Can look, like and comment" };
const ACTIVE_KEY = "lr:active-baby";

export default function Family({ profile, visits, plans, say, onSwitchChild, onCloudContext, localChild }) {
  const [user, setUser] = useState(null);
  const [babies, setBabies] = useState([]);
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || ""; } catch (e) { return ""; } });
  const [view, setView] = useState("home");        // home | invites | switch
  const [people, setPeople] = useState([]);
  const [codes, setCodes] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [newFolk, setNewFolk] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [note, setNote] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [reshow, setReshow] = useState(null);
  const [editingMe, setEditingMe] = useState(false);
  const [myName, setMyName] = useState("");
  const [managing, setManaging] = useState(null);   // FB30: member tapped by an admin

  const baby = babies.find((b) => b.id === activeId) || babies[0] || null;
  const me = baby && user ? { userId: user.id, role: baby.role } : null;
  const isAdmin = !!me && me.role === "admin";

  useEffect(() => { if (!enabled) return; currentUser().then(setUser); return onAuthChange(setUser); }, []);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("join");
    if (!c) return;
    setJoinCode(c.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    setShowJoin(true); setView("switch");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const loadBabies = async () => {
    const r = await myBabies();
    if (!r.ok) { setErr(r.error); return null; }
    setBabies(r.babies);
    if (r.babies.length && !r.babies.some((b) => b.id === activeId)) {
      setActiveId(r.babies[0].id);
      try { localStorage.setItem(ACTIVE_KEY, r.babies[0].id); } catch (e) {}
    }
    return r.babies;
  };

  const loadMembers = async (b) => {
    if (!b) { setPeople([]); setCodes([]); return; }
    const m = await members(b.id);
    if (m.ok) {
      setPeople(m.members);
      const mine = m.members.find((x) => x.userId === (user && user.id));
      if (mine) setMyName(mine.name || "");
      /* In-app join notice, no server needed: anyone whose membership is newer
         than the last time this screen was opened on this device. Push is T7. */
      const key = "lr:seen-members:" + b.id;
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
      if (seen.length) {
        const fresh = m.members.filter((x) => !seen.includes(x.userId) && x.userId !== (user && user.id));
        if (fresh.length) setNewFolk(fresh);
      }
      try { localStorage.setItem(key, JSON.stringify(m.members.map((x) => x.userId))); } catch (e) {}
      const urls = {};
      await Promise.all(m.members.filter((x) => x.avatar).map(async (x) => { urls[x.userId] = await avatarUrl(x.avatar); }));
      setAvatars(urls);
      /* Tell the app which family it is syncing with, and who it is posting as.
         One owner of that fact, handed up, rather than two copies drifting. */
      if (onCloudContext) onCloudContext({ babyId: b.id, userId: user.id, myName: (mine && mine.name) || null, role: b.role });
    }
    if (b.role === "admin") { const i = await listInvites(b.id); if (i.ok) setCodes(i.invites.filter((x) => !x.used_by)); }
    else setCodes([]);
  };

  useEffect(() => {
    if (user) loadBabies();
    else { setBabies([]); setPeople([]); setCodes([]); if (onCloudContext) onCloudContext(null); }
  }, [user]);
  useEffect(() => { loadMembers(baby); }, [baby && baby.id, user]);

  const run = async (fn, after) => {
    setBusy(true); setErr(""); setNote("");
    const r = await fn();
    setBusy(false);
    if (!r || r.ok === false) { setErr((r && r.error) || "Something went wrong."); return null; }
    if (after) await after(r);
    return r;
  };

  /* Switching swaps the whole context: whose page you are on AND which child
     the app ranks for. The profile is handed up so there is one idea of "the
     current child" rather than two that can disagree. */
  const switchTo = (b) => {
    setActiveId(b.id);
    try { localStorage.setItem(ACTIVE_KEY, b.id); } catch (e) {}
    setView("home");
    if (onSwitchChild) onSwitchChild({
      name: b.name, birthdate: b.birthdate || "", notes: b.notes || "",
      home: b.home_label ? { label: b.home_label, lat: b.home_lat, lng: b.home_lng } : null,
    }, b);
    say("Now showing " + b.name + "'s page.");
  };

  if (!enabled) return <div className="card"><p className="why">Family sharing isn't switched on in this build.</p></div>;

  /* ---------------------------------------------------------- signed out -- */
  if (!user) return (
    <>
      <div className="card hl">
        <p className="why"><b>Everything works without an account.</b> Signing in adds two things: your journal is backed up, and you can share it with family.</p>
      </div>
      <button className="primary full" disabled={busy} onClick={() => run(() => signInWith("google"))}>Continue with Google</button>
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
      {mode === "link" && <button className="primary full" disabled={busy || !email}
        onClick={() => run(() => sendMagicLink(email), () => setNote("Link sent. If it doesn't arrive in a few minutes, use a password instead — our email delivery is still being set up."))}>Send me a link</button>}
      {mode === "reset" && <>
        <button className="primary full" disabled={busy || !email}
          onClick={() => run(() => resetPassword(email), () => setNote("If that email has an account, a reset link is on its way. If nothing arrives, tell Alex — our email delivery is still being set up."))}>Send a reset link</button>
        <button className="ghost full mt" onClick={() => setMode("in")}>Back</button>
      </>}
      {err && <p className="warnbox">{err}</p>}
      {note && <p className="okbox">{note}</p>}
    </>
  );

  /* -------------------------------------------------- signed in, no family */
  if (!babies.length) return (
    <>
      <div className="card hl"><p className="why">Signed in as <b>{user.email}</b></p></div>
      {!showJoin ? <>
        <div className="lbl">Start {profile.name}'s page</div>
        <div className="card">
          <p className="why">This makes {profile.name} the account. You'll be the admin, and can invite family afterwards.</p>
          {(visits.length > 0 || plans.length > 0) &&
            <p className="why"><b>Your {visits.length} {visits.length === 1 ? "memory" : "memories"}{plans.length ? " and " + plans.length + " saved ideas" : ""} will come with you.</b> Photos stay on this phone for now.</p>}
          <button className="primary full" disabled={busy} onClick={() => run(
            async () => {
              const b = await createBaby(profile, user.id);
              if (!b.ok) return b;
              if (visits.length || plans.length) { const up = await uploadLocal(b.baby.id, user.id, visits, plans); if (!up.ok) return up; }
              return b;
            },
            async () => { say("Family page created."); await loadBabies(); })}>Create {profile.name}'s page</button>
        </div>
        <button className="ghost full mt" onClick={() => setShowJoin(true)}>I have an invite code instead</button>
      </> : <JoinBox code={joinCode} setCode={setJoinCode} busy={busy}
        onJoin={() => run(() => redeemInvite(joinCode, null), async () => {
          say("You're in."); setJoinCode(""); setShowJoin(false);
          const list = await loadBabies();
          if (list && list.length) switchTo(list[list.length - 1]);
        })}
        onCancel={() => setShowJoin(false)} />}
      {err && <p className="warnbox">{err}</p>}
      <button className="ghost full mt" onClick={() => run(() => signOut())}>Sign out</button>
    </>
  );

  /* ------------------------------------------------------------- switcher */
  if (view === "switch") return (
    <>
      <button className="ghost full" onClick={() => setView("home")}>‹ Back</button>
      <div className="lbl">Pages you belong to ({babies.length})</div>
      <div className="card">
        {/* FB29. A child set up on this device but never shared still belongs
            here. Joining someone else's page used to make your own disappear
            with nowhere to go back to — the founder's husband lost his. */}
        {localChild && !babies.some((b) => b.name === localChild.name) && (
          <div className="uarow">
            <span className="mwho">
              <span className="mline"><b>{localChild.name}</b><span className="nowtag local">this phone only</span></span>
              <small className="msub">Not shared — nobody else can see it</small>
            </span>
            <span className="uaacts">
              <button className="mini" title="Share this child with family" onClick={() => run(
                async () => {
                  const b = await createBaby(localChild, user.id);
                  if (!b.ok) return b;
                  if (visits.length || plans.length) { const up = await uploadLocal(b.baby.id, user.id, visits, plans); if (!up.ok) return up; }
                  return b;
                },
                async () => { say(localChild.name + "'s page created."); await loadBabies(); })}>＋</button>
            </span>
          </div>
        )}
        {babies.map((b) => (
          <button key={b.id} className={"familyrow" + (b.id === (baby && baby.id) ? " on" : "")} onClick={() => switchTo(b)}>
            <span className="mwho">
              <span className="mline"><b>{b.name}</b>{b.id === (baby && baby.id) ? <span className="nowtag">showing</span> : null}</span>
              <small className="msub">{roleWord[b.role]}</small>
            </span>
          </button>
        ))}
      </div>
      <p className="fine">Switching changes whose outings and recommendations you see. You stay signed in to all of them.</p>

      <div className="lbl">Join another child's page</div>
      {!showJoin
        ? <button className="wide" onClick={() => setShowJoin(true)}>➕ I've been given an invite code</button>
        : <JoinBox code={joinCode} setCode={setJoinCode} busy={busy}
            onJoin={() => run(() => redeemInvite(joinCode, null), async () => {
              say("You're in."); setJoinCode(""); setShowJoin(false);
              const known = babies.map((x) => x.id);
              const list = await loadBabies();
              const joined = list && list.find((x) => known.indexOf(x.id) < 0);
              if (joined) switchTo(joined);
            })}
            onCancel={() => setShowJoin(false)} />}
      {err && <p className="warnbox">{err}</p>}
    </>
  );

  /* ----------------------------------------------------------- invitations */
  if (view === "invites") return (
    <>
      <button className="ghost full" onClick={() => setView("home")}>‹ Back to {baby.name}'s family</button>
      <div className="lbl">Invite someone to {baby.name}'s page</div>
      <div className="card">
        <p className="why">Choose who they are and exactly what they can do, then send a link, a QR code, or six characters you can read down the phone.</p>
        <button className="primary full" onClick={() => { setErr(""); setInviting(true); }}>➕ Make an invite</button>
      </div>

      <div className="lbl">Waiting to be used ({codes.length})</div>
      <div className="card">
        {!codes.length && <p className="why">Nothing outstanding. Codes appear here until someone uses them.</p>}
        {codes.map((c) => <div className="uarow" key={c.code}>
          <span className="mwho"><b className="codeval">{c.code}</b>
            <small className="msub">{c.label ? c.label + " · " : ""}{roleWord[c.role]} · expires {new Date(c.expires_at).toLocaleDateString()}</small></span>
          <span className="uaacts">
            <button className="mini" title="Show this invite again" onClick={() => setReshow(c)}>👁</button>
            <button className="mini danger-mini" title="Cancel this code" onClick={() => {
              if (window.confirm("Cancel code " + c.code + "? Anyone still holding it won't be able to join.")) run(() => revokeInvite(c.code), () => loadMembers(baby));
            }}>✕</button>
          </span>
        </div>)}
        {codes.length > 0 && <p className="fine">Each code works once and expires after two weeks.</p>}
      </div>

      {(inviting || reshow) && <Sheet onClose={() => { setInviting(false); setReshow(null); }}>
        <InviteSheet babyName={baby.name} say={say} existing={reshow}
          onCreate={(role, label) => createInvite(baby.id, role, label)}
          onClose={async () => { setInviting(false); setReshow(null); await loadMembers(baby); }} />
      </Sheet>}
      {err && <p className="warnbox">{err}</p>}
    </>
  );

  /* ------------------------------------------------------------------ home */
  /* FB30. One card per child you follow, rather than a single active page with
     the rest hidden behind a switcher. The faces are the point: a family page is
     people, and seeing who is on it — including yourself, ringed — is the first
     thing anyone looks for. Your own face is the way into your name and photo,
     because that is where you would tap. */
  return (
    <>
      {newFolk.length > 0 && <div className="nudge away"><span>&#128075;</span>
        <p><b>{newFolk.map((f) => f.name || "Someone").join(", ")} {newFolk.length === 1 ? "has" : "have"} joined {baby.name}'s page.</b></p>
        <button className="mini x" onClick={() => setNewFolk([])}>&#10005;</button></div>}

      <div className="lbl">Pages you follow ({babies.length})</div>

      {babies.map((b) => {
        const active = b.id === (baby && baby.id);
        const folk = active ? people : [];
        const admin = b.role === "admin";
        return (
          <div className={"babycard" + (active ? " on" : "")} key={b.id}>
            <div className="babytop">
              <h3>{b.name}</h3>
              {active ? <span className="nowtag">showing</span>
                      : <button className="pillbtn" onClick={() => switchTo(b)}>Open</button>}
            </div>
            <p className="fine">You are {roleWord[b.role].toLowerCase()} here</p>

            {active && <>
              <div className="faces">
                {folk.map((p) => {
                  const isMe = p.userId === user.id;
                  return (
                    <button className={"face" + (isMe ? " me" : "")} key={p.userId}
                      onClick={() => { if (isMe) setEditingMe(true); else if (admin) setManaging(p); }}>
                      {avatars[p.userId]
                        ? <img src={avatars[p.userId]} alt="" />
                        : <span className="ph">{(p.name || "?").trim().charAt(0).toUpperCase()}</span>}
                      <small>{isMe ? "You" : (p.name || "Family")}</small>
                      <i>{p.role === "admin" ? "admin" : p.role === "caregiver" ? "can add" : "can look"}</i>
                    </button>
                  );
                })}
              </div>
              <p className="fine">{admin
                ? "Tap a face to change what they can do. Tap yours to change your name or photo."
                : "Tap your own face to change your name or photo."}</p>

              <div className="pills">
                {admin && <button className="pillbtn dark" onClick={() => { setErr(""); setView("invites"); }}>
                  Invite{codes.length ? " \u00b7 " + codes.length + " waiting" : ""}</button>}
                <button className="pillbtn" onClick={() => {
                  const check = canLeave(me, people);
                  if (!check.ok) { setErr(check.why); return; }
                  const msg = "Leave " + b.name + "'s page?" + String.fromCharCode(10, 10) +
                    "You will stop seeing new outings and photos. Anything you have written stays, with your name on it.";
                  if (!window.confirm(msg)) return;
                  run(() => leaveFamily(b.id), async () => { say("You have left " + b.name + "'s page."); await loadBabies(); });
                }}>Leave</button>
              </div>
            </>}
          </div>
        );
      })}

      {localChild && !babies.some((b) => b.name === localChild.name) && (
        <div className="babycard">
          <div className="babytop"><h3>{localChild.name}</h3><span className="nowtag local">this phone only</span></div>
          <p className="fine">Set up here but never shared, so nobody else can see it.</p>
          <div className="pills"><button className="pillbtn dark" onClick={() => run(
            async () => {
              const nb = await createBaby(localChild, user.id);
              if (!nb.ok) return nb;
              if (visits.length || plans.length) { const up = await uploadLocal(nb.baby.id, user.id, visits, plans); if (!up.ok) return up; }
              return nb;
            },
            async () => { say(localChild.name + "'s page created."); await loadBabies(); })}>Share with family</button></div>
        </div>
      )}

      <div className="lbl">Another child</div>
      {!showJoin
        ? <button className="wide" onClick={() => setShowJoin(true)}>Join a child's page with an invite code</button>
        : <JoinBox code={joinCode} setCode={setJoinCode} busy={busy}
            onJoin={() => run(() => redeemInvite(joinCode, null), async () => {
              say("You are in."); setJoinCode(""); setShowJoin(false);
              const known = babies.map((x) => x.id);
              const list = await loadBabies();
              const joined = list && list.find((x) => known.indexOf(x.id) < 0);
              if (joined) switchTo(joined);
            })}
            onCancel={() => setShowJoin(false)} />}

      {err && <p className="warnbox">{err}</p>}

      {editingMe && <Sheet onClose={() => setEditingMe(false)}>
        <div className="eyebrow">You on {baby.name}'s page</div>
        <label className="flab">What should people call you?</label>
        <input className="inp" placeholder="Mum, Dad, Grandma..." value={myName} onChange={(e) => setMyName(e.target.value)} />
        <div className="btns">
          <label className="pick main">Choose a photo
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files && e.target.files[0]; e.target.value = "";
              if (!f) return;
              await run(async () => {
                const up = await uploadAvatar(baby.id, f);
                if (!up.ok) return up;
                return updateMyProfile(baby.id, { avatarPath: up.path });
              }, async () => { say("Photo updated."); await loadMembers(baby); });
            }} /></label>
        </div>
        <button className="primary full" onClick={() => run(() => updateMyProfile(baby.id, { name: myName.trim() || null }),
          async () => { say("Saved."); setEditingMe(false); await loadMembers(baby); })}>Save</button>
        <button className="ghost full mt" onClick={() => setEditingMe(false)}>Cancel</button>
      </Sheet>}

      {managing && <Sheet onClose={() => setManaging(null)}>
        <div className="eyebrow">{managing.name || "Family member"}</div>
        <div className="lbl">What can they do?</div>
        <div className="chips">
          {ROLES.map((r) => <button key={r} className={"chip fk" + (managing.role === r ? " on" : "")}
            onClick={() => {
              const check = canChangeMember(me, managing, people, r);
              if (!check.ok) { setErr(check.why); return; }
              run(() => setRole(baby.id, managing.userId, r), async () => { setManaging(null); await loadMembers(baby); });
            }}>{roleWord[r]}</button>)}
        </div>
        <button className="danger" onClick={() => {
          const check = canRemoveMember(me, managing, people);
          if (!check.ok) { setErr(check.why); return; }
          if (!window.confirm("Remove " + (managing.name || "this person") + "? They lose access immediately, including the photos.")) return;
          run(() => removeMember(baby.id, managing.userId), async () => { setManaging(null); await loadMembers(baby); });
        }}>Remove from {baby.name}'s page</button>
        <button className="ghost full mt" onClick={() => setManaging(null)}>Close</button>
      </Sheet>}

      <button className="ghost full mt" onClick={() => run(() => signOut(), () => say("Signed out. Your journal is still on this phone."))}>Sign out</button>
    </>
  );
}

function JoinBox({ code, setCode, busy, onJoin, onCancel }) {
  return <div className="card">
    <div className="lbl tight">Enter an invite code</div>
    <input className="inp code" placeholder="ABC123" maxLength={7} value={code}
      onChange={(e) => setCode(e.target.value.toUpperCase())} />
    <button className="primary full" disabled={busy || code.replace(/[^A-Z0-9]/g, "").length !== 6} onClick={onJoin}>Join</button>
    <button className="ghost full mt" onClick={onCancel}>Cancel</button>
  </div>;
}
