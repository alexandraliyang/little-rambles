/* Join — what someone sees when they arrive on an invite link or QR code.
   Shown INSTEAD of onboarding: a person joining an existing child's page must
   never be asked to invent a child. That is what happened to the founder's
   husband — he scanned the QR and was handed a "tell us about your baby" form.

   The code, the link and the QR all end up here. The code exists for the case
   the other two cannot cover: reading it down the phone to someone who is not
   holding a device you can send to. */
import React, { useState, useEffect } from "react";
import { signIn, signUp, signInWith, currentUser, onAuthChange, redeemInvite, myBabies } from "../lib/family.js";
import { enabled } from "../lib/supa.js";
import { isValidCode } from "../engine/roles.js";

export default function Join({ code, onJoined, onCancel }) {
  const [user, setUser] = useState(null);
  const [entered, setEntered] = useState(code || "");
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("signin");   // signin | joining | done

  useEffect(() => { if (!enabled) return; currentUser().then(setUser); return onAuthChange(setUser); }, []);

  /* Once signed in, redeem immediately. Making someone press "join" after they
     have already followed an invite and signed in is a step with no question in
     it. */
  useEffect(() => {
    if (!user || step !== "signin") return;
    if (!isValidCode(entered)) return;
    (async () => {
      setStep("joining"); setErr("");
      const r = await redeemInvite(entered, null);
      if (!r.ok) { setErr(r.error); setStep("signin"); return; }
      const b = await myBabies();
      const baby = b.ok ? b.babies.find((x) => x.id === r.babyId) || b.babies[0] : null;
      if (!baby) { setErr("Joined, but couldn't load the page. Try reopening the app."); setStep("signin"); return; }
      setStep("done");
      /* Adopt the child's details from the server so the app opens fully set up:
         the same name, birthdate and home the rest of the family sees. */
      onJoined({
        name: baby.name, birthdate: baby.birthdate || "", notes: baby.notes || "",
        home: baby.home_label ? { label: baby.home_label, lat: baby.home_lat, lng: baby.home_lng } : null,
        caregivers: [], cOff: [],
      }, baby);
    })();
  }, [user, entered, step]);

  if (!enabled) return <div className="pad"><div className="card"><p className="why">Sharing isn't switched on in this build.</p></div></div>;

  return (
    <div className="pad joinpad">
      <div className="brandbig"><b>Rambles</b></div>
      <div className="card hl">
        <h2 className="dtitle">You've been invited</h2>
        <p className="why">Someone has shared a child's page with you — their outings, photos and the little moments. Sign in to see it.</p>
        <p className="fine">You're joining an existing page. You won't be asked to set up a child of your own.</p>
      </div>

      {step === "joining" && <div className="card"><p className="why">Joining…</p></div>}

      {step !== "joining" && !user && <>
        <button className="primary full" disabled={busy} onClick={async () => { setBusy(true); setErr(""); const r = await signInWith("google"); setBusy(false); if (!r.ok) setErr(r.error); }}>
          Continue with Google
        </button>
        <div className="orline"><span>or</span></div>
        <div className="chips">
          {[["in", "I have an account"], ["up", "Create an account"]].map(([k, l]) =>
            <button key={k} className={"chip" + (mode === k ? " on" : "")} onClick={() => { setMode(k); setErr(""); }}>{l}</button>)}
        </div>
        <input className="inp" type="email" autoComplete="email" placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="inp" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"}
          placeholder={mode === "up" ? "choose a password (6+ characters)" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="primary full" disabled={busy || !email || !pw} onClick={async () => {
          setBusy(true); setErr("");
          const r = mode === "up" ? await signUp(email, pw) : await signIn(email, pw);
          setBusy(false);
          if (!r.ok) setErr(r.error);
        }}>{mode === "up" ? "Create account and join" : "Sign in and join"}</button>
      </>}

      {step !== "joining" && !isValidCode(entered) && <>
        <div className="lbl">Invite code</div>
        <div className="card">
          <p className="why">Six characters, from whoever invited you.</p>
          <input className="inp code" placeholder="ABC123" maxLength={7} value={entered}
            onChange={(e) => setEntered(e.target.value.toUpperCase())} />
        </div>
      </>}

      {err && <p className="warnbox">{err}</p>}
      <button className="ghost full mt" onClick={onCancel}>I'm not joining — set up my own child</button>
    </div>
  );
}
