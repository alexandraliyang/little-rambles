/* Invite — one sheet: who they are, what they can do, and how to send it.
   Replaces a row of two tiny icons where 📤 (share) sat beside ✕ (revoke), so a
   mistap silently destroyed the code you were trying to send.

   Three things the old version got wrong and this fixes:
   - Permission was two buttons that each made a SEPARATE code, so wanting
     "both" produced two codes and no explanation. Permissions are cumulative;
     you pick one level.
   - Relationship and permission were the same field. "Admin" is what you may
     do; "Mum" is who you are. Comments should be signed Grandma, not viewer.
   - Sharing failed silently. Now the code, the link and a QR are all on screen,
     so sending works even if the share sheet does not.
*/
import React, { useState } from "react";
import qrcode from "qrcode-generator";

export const RELATIONS = ["Mum", "Dad", "Grandma", "Grandpa", "Auntie", "Uncle", "Nanny", "Family friend"];

/* Cumulative by design, and stated as such: the commonest support question a
   sharing feature gets is "does the second one include the first?". */
export const LEVELS = [
  { role: "viewer", icon: "👀", title: "Just look",
    can: ["See every outing and photo", "Like and leave comments"],
    cant: ["Can't add or change anything"],
    note: "What most grandparents want." },
  { role: "caregiver", icon: "✍️", title: "Look and add",
    can: ["Everything above, plus…", "Log outings and add photos", "Edit what they added themselves"],
    cant: ["Can't invite people or change the child's details"],
    note: "For whoever else takes them out." },
  { role: "admin", icon: "🛠️", title: "Full access",
    can: ["Everything above, plus…", "Invite and remove people", "Edit the child's name, age and preferences", "Delete anyone's entries"],
    cant: [],
    note: "Only for someone you'd trust with the account itself." },
];

export function inviteUrl(code) {
  return "https://little-rambles.netlify.app/?join=" + encodeURIComponent(code);
}

/* Rendered as an SVG path so it scales, prints and survives a screenshot —
   and needs no canvas, no network and no image host. */
function QR({ text, size = 180 }) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  const cell = size / n;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d += `M${(c * cell).toFixed(2)} ${(r * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    }
  }
  return <svg className="qr" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Invite QR code">
    <rect width={size} height={size} fill="#FFF" /><path d={d} fill="#29382F" />
  </svg>;
}

export default function InviteSheet({ babyName, onCreate, onClose, say, existing }) {
  const [relation, setRelation] = useState("");
  const [custom, setCustom] = useState("");
  const [level, setLevel] = useState("viewer");
  /* `existing` re-opens a code already created, so "show it again" and "make a
     new one" land on the same screen instead of two half-similar ones. */
  const [made, setMade] = useState(existing || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const who = (custom.trim() || relation || (existing && existing.label) || "").trim();

  const create = async () => {
    setBusy(true); setErr("");
    const r = await onCreate(level, who || null);
    setBusy(false);
    if (!r || r.ok === false) { setErr((r && r.error) || "Couldn't make an invite."); return; }
    setMade(r.invite);
  };

  /* Sharing must never fail silently — that is what made the first version look
     like it had sent something when it had not. Every path reports back. */
  const message = made
    ? `Come and see ${babyName}'s page on Rambles.\n\n${inviteUrl(made.code)}\n\nOr open little-rambles.netlify.app and enter code ${made.code}`
    : "";

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: `${babyName} on Rambles`, text: message }); say("Invite sent."); return; }
      throw new Error("no share");
    } catch (e) {
      if (e && e.name === "AbortError") return;              // user chose not to send
      try {
        await navigator.clipboard.writeText(message);
        say("Invite copied — paste it into a message.");
      } catch (e2) {
        setErr("Couldn't open sharing. Read the code out, or copy it by hand — it's on screen above.");
      }
    }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(made.code); say("Code copied."); }
    catch { setErr("Couldn't copy — the code is on screen, it can be typed."); }
  };

  if (made) return (
    <>
      <div className="eyebrow">Invite ready{who ? " · " + who : ""}</div>
      <h3 className="ctitle">Send this to {who || "them"}</h3>

      <div className="invitecode">{made.code}</div>
      <p className="fine center">They can type this, or scan the code below.</p>

      <div className="qrwrap"><QR text={inviteUrl(made.code)} /></div>

      <button className="primary full" onClick={share}>📤 Send invite</button>
      <div className="btns">
        <button className="ghost sm" onClick={copyCode}>Copy code</button>
        <button className="ghost sm" onClick={async () => {
          try { await navigator.clipboard.writeText(inviteUrl(made.code)); say("Link copied."); }
          catch { setErr("Couldn't copy the link."); }
        }}>Copy link</button>
      </div>

      <div className="nudge sm"><span>ℹ️</span><p>They'll need to sign in first — with Google, or an email and password. The code works <b>once</b> and expires in two weeks.</p></div>

      {err && <p className="warnbox">{err}</p>}
      <button className="ghost full mt" onClick={onClose}>Done</button>
    </>
  );

  return (
    <>
      <div className="eyebrow">Invite someone to {babyName}'s page</div>

      <div className="lbl">Who are they?</div>
      <div className="chips">
        {RELATIONS.map((r) => <button key={r} className={"chip fk" + (relation === r && !custom ? " on" : "")}
          onClick={() => { setRelation(r); setCustom(""); }}>{r}</button>)}
      </div>
      <input className="inp" placeholder="or type it — “Nana”, “Auntie Mei”" value={custom}
        onChange={(e) => { setCustom(e.target.value); if (e.target.value) setRelation(""); }} />
      <p className="fine">This is how they'll be shown on comments and outings. It's separate from what they're allowed to do.</p>

      <div className="lbl">What can they do?</div>
      {LEVELS.map((l) => (
        <button key={l.role} className={"levelcard" + (level === l.role ? " on" : "")} onClick={() => setLevel(l.role)}>
          <div className="lvhead"><span className="lvicon">{l.icon}</span><b>{l.title}</b>
            <span className={"lvradio" + (level === l.role ? " on" : "")} aria-hidden="true" /></div>
          <ul className="lvlist">
            {l.can.map((c) => <li key={c} className="yes">{c}</li>)}
            {l.cant.map((c) => <li key={c} className="no">{c}</li>)}
          </ul>
          <p className="lvnote">{l.note}</p>
        </button>
      ))}

      {err && <p className="warnbox">{err}</p>}
      <button className="primary full" disabled={busy} onClick={create}>
        {busy ? "Making the invite…" : "Make an invite"}
      </button>
      <button className="ghost full mt" onClick={onClose}>Cancel</button>
    </>
  );
}
