import { useState, useEffect, useMemo } from "react";

/* ================================================================
   Little Rambles v0.1 — functional build (user #1: you)
   - Real onboarding: baby name + birthdate drives the age engine
   - Real persistence: saves between sessions (personal storage)
   - Real Google Maps links: "Let's go" opens Maps AND logs the visit
   - Real check-in loop and insights computed from your actual logs
   ================================================================ */

const STORAGE_KEY = "little-rambles-v01";

/* ------------------- Developmental age bands ------------------- */
const AGE_BANDS = [
  { min: 0, max: 6, theme: "Faces, voices, and gentle motion are the whole world right now. Anywhere calm counts." },
  { min: 6, max: 9, theme: "Sitting up changes everything — new sightlines, grabbing, and cause-and-effect games begin." },
  { min: 9, max: 12, theme: "Object permanence and cruising. Peekaboo is science; pulling up on things is the sport." },
  { min: 12, max: 15, theme: "Cause-and-effect play is peaking — splash, drop, watch, repeat. First words are brewing." },
  { min: 15, max: 18, theme: "The pointing-and-naming burst. The world becomes a picture book she wants labeled." },
  { min: 18, max: 24, theme: "Pretend play sparks, climbing gets serious, and 'again!' becomes a lifestyle." },
  { min: 24, max: 30, theme: "Two-word sentences, real running, and following simple stories. Group activities start to land." },
  { min: 30, max: 42, theme: "Why-questions, imaginative worlds, and longer attention. 'Real' museums start paying off." },
];

function bandFor(months) {
  return AGE_BANDS.find((b) => months >= b.min && months < b.max) || AGE_BANDS[AGE_BANDS.length - 1];
}

/* ----------------------- Idea library -------------------------- */
/* Category-based (not live listings) — Maps resolves the local part. */
const IDEAS = [
  { id: "splash", name: "Splash pad / spray park", cat: "water", emoji: "💦", tags: ["outdoor", "free"], ageMin: 8, ageMax: 48, mapsQuery: "splash pad", why: "Water is a physics lab she can sit in — splash, watch, repeat." },
  { id: "swim", name: "Parent-tot swim time", cat: "water", emoji: "🏊", tags: ["indoor", "rainy"], ageMin: 6, ageMax: 48, mapsQuery: "community pool family swim", why: "Warm pool, your arms, her kicks. Check the rec centre schedule for tot hours." },
  { id: "storytime", name: "Library story time", cat: "stories", emoji: "📚", tags: ["indoor", "free", "rainy"], ageMin: 6, ageMax: 48, mapsQuery: "public library", why: "Songs, rhythm, other babies. Most branches run baby/toddler sessions weekly." },
  { id: "musicclass", name: "Parent & baby music drop-in", cat: "music", emoji: "🎶", tags: ["indoor", "rainy"], ageMin: 8, ageMax: 32, mapsQuery: "baby music class", why: "Shakers, clapping, repetition — squarely in the rhythm-and-imitation window." },
  { id: "farm", name: "Petting farm", cat: "animals", emoji: "🐐", tags: ["outdoor"], ageMin: 10, ageMax: 48, mapsQuery: "petting farm", why: "Animals at her scale, at her pace. She sets the distance." },
  { id: "aquarium", name: "Aquarium", cat: "animals", emoji: "🪼", tags: ["indoor", "rainy"], ageMin: 12, ageMax: 48, mapsQuery: "aquarium", why: "Slow, glowing, mesmerizing. Gets dramatically better once naming things becomes the game." },
  { id: "conservatory", name: "Conservatory / botanical garden", cat: "nature", emoji: "🦜", tags: ["indoor", "rainy"], ageMin: 6, ageMax: 60, mapsQuery: "conservatory botanical garden", why: "Warm, calm, birds and colors at stroller height. A quiet-day classic." },
  { id: "beach", name: "Beach at low tide", cat: "nature", emoji: "🌊", tags: ["outdoor", "free"], ageMin: 10, ageMax: 60, mapsQuery: "beach", why: "Sand physics, water edges, treasure everywhere. Bring the full change of clothes." },
  { id: "naturewalk", name: "Stroller-friendly nature walk", cat: "nature", emoji: "🌲", tags: ["outdoor", "free"], ageMin: 0, ageMax: 60, mapsQuery: "easy nature trail", why: "Light through leaves is legitimate entertainment. Good for hard days." },
  { id: "indoorplay", name: "Indoor playground / play café", cat: "sensory", emoji: "🧸", tags: ["indoor", "rainy"], ageMin: 10, ageMax: 42, mapsQuery: "indoor playground toddlers", why: "Soft, contained, climbable. Look for a dedicated under-2 zone." },
  { id: "market", name: "Public market / farmers market", cat: "sensory", emoji: "🍓", tags: ["outdoor"], ageMin: 6, ageMax: 60, mapsQuery: "farmers market", why: "A sensory buffet: colors, smells, samples, faces. Short distances between wonders." },
  { id: "artdropin", name: "Messy art drop-in", cat: "art", emoji: "🎨", tags: ["indoor", "rainy"], ageMin: 14, ageMax: 48, mapsQuery: "toddler art class drop-in", why: "Paint as a full-body experience. Their mess, not your kitchen's." },
  { id: "playground", name: "Toddler playground", cat: "playground", emoji: "🛝", tags: ["outdoor", "free"], ageMin: 10, ageMax: 60, mapsQuery: "toddler playground", why: "Baby swings and low structures. The reliable default for a reason." },
  { id: "sciencecentre", name: "Science centre", cat: "science", emoji: "🔭", tags: ["indoor", "rainy"], ageMin: 28, ageMax: 72, mapsQuery: "science centre", why: "Exhibits assume cause-and-effect play and longer attention spans.", laterLabel: "Best around 2½" },
  { id: "theatre", name: "Children's theatre / puppet show", cat: "science", emoji: "🎭", tags: ["indoor", "rainy"], ageMin: 30, ageMax: 72, mapsQuery: "children's theatre", why: "Following a story on a stage needs ~2½-year-old attention.", laterLabel: "Best around 2½–3" },
];

const RATING_META = {
  loved: { emoji: "😍", label: "Loved it", cls: "r-loved" },
  fine: { emoji: "🙂", label: "Fine", cls: "r-fine" },
  nope: { emoji: "😵", label: "Not today", cls: "r-nope" },
};

/* ----------------------- Helpers ------------------------------- */
function monthsBetween(birthdateStr) {
  const b = new Date(birthdateStr + "T00:00:00");
  const now = new Date();
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m -= 1;
  return Math.max(0, m);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function mapsUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query + " near me");
}

/* =========================== App =============================== */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [baby, setBaby] = useState(null); // {name, birthdate, notes}
  const [visits, setVisits] = useState([]); // {id, ideaId, name, cat, emoji, ts, rating, note}
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState("today");
  const [checkInFor, setCheckInFor] = useState(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editingProfile, setEditingProfile] = useState(false);

  /* ---------- load & persist ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const s = JSON.parse(res.value);
          if (s.baby) setBaby(s.baby);
          if (s.visits) setVisits(s.visits);
          if (s.saved) setSaved(s.saved);
        }
      } catch (e) {
        /* first run — nothing saved yet */
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ baby, visits, saved }));
      } catch (e) {
        console.error("Save failed", e);
      }
    })();
  }, [baby, visits, saved, loaded]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  const months = baby ? monthsBetween(baby.birthdate) : null;
  const band = months != null ? bandFor(months) : null;

  /* ---------- derived insight data ---------- */
  const rated = visits.filter((v) => v.rating);
  const pendingVisits = visits.filter((v) => !v.rating);

  const catStats = useMemo(() => {
    const m = {};
    for (const v of rated) {
      if (!m[v.cat]) m[v.cat] = { loved: 0, fine: 0, nope: 0, total: 0 };
      m[v.cat][v.rating] += 1;
      m[v.cat].total += 1;
    }
    return m;
  }, [rated]);

  const lovedCats = Object.entries(catStats).filter(([, s]) => s.loved >= 2).map(([c]) => c);
  const pausedCats = Object.entries(catStats)
    .filter(([, s]) => s.total >= 2 && s.loved === 0 && s.nope + s.fine >= 2 && s.nope >= 1)
    .map(([c]) => c);

  const staleness = useMemo(() => {
    const recent = rated.slice(0, 8);
    if (recent.length < 5) return null;
    const counts = {};
    for (const v of recent) counts[v.ideaId] = (counts[v.ideaId] || 0) + 1;
    const [topId, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (topCount / recent.length >= 0.5) {
      const idea = IDEAS.find((i) => i.id === topId);
      return { name: idea ? idea.name : topId, count: topCount, of: recent.length };
    }
    return null;
  }, [rated]);

  const retryIdeas = useMemo(() => {
    if (months == null) return [];
    const out = [];
    for (const idea of IDEAS) {
      const past = rated.filter((v) => v.ideaId === idea.id);
      if (past.length === 0) continue;
      const last = past[0];
      const lastMonthsAgo = (Date.now() - last.ts) / (1000 * 60 * 60 * 24 * 30);
      if (last.rating === "nope" && lastMonthsAgo >= 2 && months >= idea.ageMin) {
        out.push(idea.id);
      }
    }
    return out;
  }, [rated, months]);

  /* ---------- fit + scoring ---------- */
  function fitFor(idea) {
    if (months == null) return { key: "great", label: "—" };
    if (months < idea.ageMin) return { key: "later", label: idea.laterLabel || `Best around ${Math.round(idea.ageMin / 12 * 2) / 2} yrs` };
    if (retryIdeas.includes(idea.id)) return { key: "retry", label: "Worth a retry" };
    if (pausedCats.includes(idea.cat)) return { key: "paused", label: "Resting this type" };
    if (lovedCats.includes(idea.cat)) return { key: "loves", label: `${baby.name} loves this` };
    if (staleness && IDEAS.find((i) => i.name === staleness.name && i.id === idea.id)) return { key: "worn", label: "Well-worn" };
    if (months > idea.ageMax) return { key: "worn", label: "Growing past it" };
    return { key: "great", label: `Great at ${months} mo` };
  }

  function score(idea) {
    if (months == null) return 0;
    let s = 0;
    if (months >= idea.ageMin && months <= idea.ageMax) s += 10; else return -100;
    if (lovedCats.includes(idea.cat)) s += 5;
    if (pausedCats.includes(idea.cat)) s -= 6;
    const visitCount = rated.filter((v) => v.ideaId === idea.id).length;
    if (visitCount === 0) s += 3; // novelty
    const recentSame = rated.slice(0, 4).some((v) => v.ideaId === idea.id);
    if (recentSame) s -= 4;
    if (retryIdeas.includes(idea.id)) s += 2;
    return s;
  }

  const rankedIdeas = useMemo(
    () => [...IDEAS].sort((a, b) => score(b) - score(a)),
    [months, rated, lovedCats, pausedCats, retryIdeas]
  );
  const hero = rankedIdeas[0];

  /* ---------- actions ---------- */
  const goOut = (idea) => {
    const visit = {
      id: Date.now(),
      ideaId: idea.id,
      name: idea.name,
      cat: idea.cat,
      emoji: idea.emoji,
      ts: Date.now(),
      rating: null,
      note: "",
    };
    setVisits((v) => [visit, ...v]);
    showToast("Visit logged — no typing needed. Check in tonight if you feel like it.");
  };

  const toggleSave = (idea) => {
    setSaved((s) => (s.includes(idea.id) ? s.filter((x) => x !== idea.id) : [...s, idea.id]));
  };

  const submitCheckIn = (rating) => {
    setVisits((vs) => vs.map((v) => (v.id === checkInFor.id ? { ...v, rating, note: checkInNote } : v)));
    const cat = checkInFor.cat;
    setCheckInFor(null);
    setCheckInNote("");
    if (rating === "loved") showToast(`Saved to ${baby.name}'s story. Noted — more like this.`);
    else if (rating === "nope") showToast("Saved. I'll rest this type for a while and flag a retry when she's ready.");
    else showToast(`Saved to ${baby.name}'s story.`);
  };

  const dismissPending = (visit) => {
    setVisits((vs) => vs.filter((v) => v.id !== visit.id));
  };

  const resetAll = async () => {
    setBaby(null); setVisits([]); setSaved([]); setEditingProfile(false); setTab("today");
    try { await window.storage.delete(STORAGE_KEY); } catch (e) {}
  };

  /* ---------- render ---------- */
  if (!loaded) {
    return (
      <div className="lr-root"><style>{css}</style>
        <div className="phone center-all"><p className="loading">〰️</p></div>
      </div>
    );
  }

  if (!baby || editingProfile) {
    return (
      <div className="lr-root"><style>{css}</style>
        <div className="phone">
          <Onboarding
            existing={editingProfile ? baby : null}
            onDone={(b) => { setBaby(b); setEditingProfile(false); }}
            onReset={editingProfile ? resetAll : null}
            onCancel={editingProfile ? () => setEditingProfile(false) : null}
          />
        </div>
      </div>
    );
  }

  const filteredIdeas = rankedIdeas.filter((i) => {
    if (filter === "rainy") return i.tags.includes("rainy") || i.tags.includes("indoor");
    if (filter === "free") return i.tags.includes("free");
    if (filter === "new") return !rated.some((v) => v.ideaId === i.id);
    return true;
  });

  return (
    <div className="lr-root">
      <style>{css}</style>
      <div className="phone">
        <header className="hdr">
          <div className="hdr-brand"><span className="hdr-logo">〰️</span><span className="hdr-name">Little Rambles</span></div>
          <button className="hdr-baby" onClick={() => setEditingProfile(true)}>{baby.name} · {months} mo</button>
        </header>

        <main className="scroll">
          {tab === "today" && (
            <div className="pad">
              <p className="greeting">{timeGreeting()}</p>
              {band && <p className="band-note">{band.theme}</p>}

              {pendingVisits.map((pv) => (
                <div className="card pending-card" key={pv.id}>
                  <div className="eyebrow">Recent outing · {fmtDate(pv.ts)}</div>
                  <h2 className="card-title">{pv.emoji} {pv.name}</h2>
                  <p className="why">Logged when you headed out. How did it go? (One tap — or skip it, no guilt.)</p>
                  <div className="btn-row">
                    <button className="primary small" onClick={() => setCheckInFor(pv)}>Check in</button>
                    <button className="ghost small" onClick={() => dismissPending(pv)}>Didn't go</button>
                  </div>
                </div>
              ))}

              {hero && score(hero) > 0 && (
                <div className="card hero-card">
                  <div className="eyebrow accent-text">Right now</div>
                  <h2 className="card-title">{hero.emoji} {hero.name}</h2>
                  <p className="why">{hero.why}</p>
                  {fitFor(hero).key === "loves" && <p className="dev-note">This type keeps winning with {baby.name} — worth riding the streak.</p>}
                  {fitFor(hero).key === "retry" && <p className="dev-note">A "not today" a while back — she's grown a lot since. Worth another shot.</p>}
                  <div className="btn-row">
                    <a className="primary link-btn" href={mapsUrl(hero.mapsQuery)} target="_blank" rel="noreferrer" onClick={() => goOut(hero)}>Let's go · open Maps</a>
                    <button className="ghost" onClick={() => toggleSave(hero)}>{saved.includes(hero.id) ? "Saved ✓" : "Save"}</button>
                  </div>
                </div>
              )}

              <div className="section-label">Also good today</div>
              {rankedIdeas.slice(1, 4).filter((i) => score(i) > 0).map((idea) => (
                <IdeaCard key={idea.id} idea={idea} fit={fitFor(idea)} onGo={goOut} onSave={toggleSave} savedList={saved} compact />
              ))}

              {rated.length === 0 && (
                <div className="nudge"><span className="nudge-emoji">🌱</span>
                  <p>Day one: everything above is picked for {baby.name} at {months} months. Each outing you take teaches this list what she loves.</p>
                </div>
              )}
              {staleness && (
                <div className="nudge"><span className="nudge-emoji">🔁</span>
                  <p>{staleness.name} has been {staleness.count} of your last {staleness.of} outings — totally fine, but fresh options are ranked up top.</p>
                </div>
              )}
            </div>
          )}

          {tab === "explore" && (
            <div className="pad">
              <div className="chips">
                {[["all", "All"], ["rainy", "Rainy day"], ["free", "Free"], ["new", "New to you"]].map(([k, l]) => (
                  <button key={k} className={"chip" + (filter === k ? " chip-on" : "")} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              {filteredIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} fit={fitFor(idea)} onGo={goOut} onSave={toggleSave} savedList={saved} />
              ))}
              <div className="timeline-box">
                <div className="section-label">Coming up as {baby.name} grows</div>
                {AGE_BANDS.filter((b) => b.min > (months || 0)).slice(0, 3).map((b) => (
                  <div className="tl-item" key={b.min}>
                    <span className="tl-age">{b.min}–{b.max} mo</span><span>{b.theme}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "memories" && (
            <div className="pad">
              {rated.length >= 2 && (
                <div className="insights">
                  <div className="section-label">What the log is learning</div>
                  {lovedCats.map((c) => (
                    <div className="insight up" key={c}><span>💛</span><p><b>Working well:</b> {c} outings — {catStats[c].loved} "loved it". Leaning suggestions this way.</p></div>
                  ))}
                  {staleness && (
                    <div className="insight warn"><span>🔁</span><p><b>Getting samey:</b> {staleness.name} was {staleness.count} of your last {staleness.of}. Fresh ideas queued in Explore.</p></div>
                  )}
                  {pausedCats.map((c) => (
                    <div className="insight pause" key={c}><span>⏸️</span><p><b>Resting:</b> {c} outings — not landing right now. I'll flag a retry as she grows.</p></div>
                  ))}
                  {lovedCats.length === 0 && !staleness && pausedCats.length === 0 && (
                    <div className="insight pause"><span>🌱</span><p>Patterns show up after a few rated outings. Keep rambling.</p></div>
                  )}
                </div>
              )}

              <div className="section-label">{baby.name}'s story</div>
              {rated.length === 0 && (
                <div className="card empty-card">
                  <p className="why">Nothing here yet — and that's the point. This page writes itself from taps you barely notice making. In six months it's her story.</p>
                </div>
              )}
              {rated.map((v) => (
                <div key={v.id} className="mem">
                  <div className="mem-head">
                    <span className="mem-date">{fmtDate(v.ts)}</span>
                    <span className={"mem-rating " + RATING_META[v.rating].cls}>{RATING_META[v.rating].emoji} {RATING_META[v.rating].label}</span>
                  </div>
                  <div className="mem-venue">{v.emoji} {v.name}</div>
                  {v.note ? <div className="mem-note">"{v.note}"</div> : null}
                </div>
              ))}
              <p className="fineprint center">Tap "{baby.name} · {months} mo" up top to edit her profile.</p>
            </div>
          )}
        </main>

        <nav className="tabs">
          {[["today", "Today"], ["explore", "Explore"], ["memories", "Memories"]].map(([key, label]) => (
            <button key={key} className={"tab" + (tab === key ? " tab-on" : "")} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>

        {checkInFor && (
          <div className="modal-bg" onClick={() => setCheckInFor(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">Quick check-in</div>
              <h3 className="modal-title">How was {checkInFor.name}?</h3>
              <div className="rate-row">
                {Object.entries(RATING_META).map(([key, m]) => (
                  <button key={key} className={"rate-btn " + m.cls} onClick={() => submitCheckIn(key)}>
                    <span className="rate-emoji">{m.emoji}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
              <input className="note-input" placeholder="Anything worth remembering? (optional)" value={checkInNote} onChange={(e) => setCheckInNote(e.target.value)} />
              <button className="ghost small" onClick={() => setCheckInFor(null)}>Not now</button>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

/* ------------------------- Onboarding -------------------------- */
function Onboarding({ existing, onDone, onReset, onCancel }) {
  const [name, setName] = useState(existing ? existing.name : "");
  const [birthdate, setBirthdate] = useState(existing ? existing.birthdate : "");
  const [notes, setNotes] = useState(existing ? existing.notes : "");

  const valid = name.trim().length > 0 && birthdate && new Date(birthdate) < new Date();

  return (
    <div className="pad ob">
      <p className="ob-logo">〰️</p>
      <h1 className="ob-title">Little Rambles</h1>
      <p className="ob-sub">Two facts and we're off. No quiz — the app learns by rambling with you, not by asking questions.</p>

      <label className="ob-label">Baby's name</label>
      <input className="note-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mia" />

      <label className="ob-label">Birthdate</label>
      <input className="note-input" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />

      <label className="ob-label">Anything I should know? <span className="opt">(optional, free-form)</span></label>
      <input className="note-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hates loud spaces · loves dogs · naps at 12:30…" />

      <button className="primary full" disabled={!valid} onClick={() => onDone({ name: name.trim(), birthdate, notes })}>
        {existing ? "Save changes" : "Start rambling"}
      </button>
      {onCancel && <button className="ghost full mt8" onClick={onCancel}>Cancel</button>}
      {onReset && <button className="danger-link" onClick={onReset}>Reset everything (erases all logs)</button>}
      <p className="fineprint center mt16">Stays on your account. No location tracking — the app only knows what you tap.</p>
    </div>
  );
}

/* ------------------------- Idea card --------------------------- */
function IdeaCard({ idea, fit, onGo, onSave, savedList, compact }) {
  const later = fit.key === "later";
  return (
    <div className={"card" + (compact ? " mini" : " venue-card") + (later ? " dimmed" : "")}>
      <div className="venue-top">
        <h3 className="venue-name">{idea.emoji} {idea.name}</h3>
        <span className={"badge b-" + fit.key}>{fit.label}</span>
      </div>
      <p className="why">{idea.why}</p>
      {!later ? (
        <div className="btn-row">
          <a className="primary small link-btn" href={mapsUrl(idea.mapsQuery)} target="_blank" rel="noreferrer" onClick={() => onGo(idea)}>Let's go</a>
          <button className="ghost small" onClick={() => onSave(idea)}>{savedList.includes(idea.id) ? "Saved ✓" : "Save"}</button>
        </div>
      ) : (
        <div className="later-note">On the timeline — it'll resurface when she's ready</div>
      )}
    </div>
  );
}

/* --------------------------- Styles ---------------------------- */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;700&display=swap');

.lr-root { min-height: 100vh; background: #E9EAE0; display: flex; justify-content: center; font-family: 'Karla', system-ui, sans-serif; color: #29382F; }
.phone { width: 100%; max-width: 430px; background: #F6F5EF; display: flex; flex-direction: column; min-height: 100vh; position: relative; box-shadow: 0 0 40px rgba(41,56,47,0.12); }
.center-all { align-items: center; justify-content: center; }
.loading { font-size: 40px; }

.hdr { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 10px; }
.hdr-brand { display: flex; align-items: center; gap: 8px; }
.hdr-logo { font-size: 18px; }
.hdr-name { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 19px; }
.hdr-baby { font-size: 13px; font-weight: 700; color: #F6F5EF; background: #29382F; border-radius: 999px; padding: 5px 12px; border: none; cursor: pointer; font-family: 'Karla', sans-serif; }

.scroll { flex: 1; overflow-y: auto; padding-bottom: 76px; }
.pad { padding: 6px 18px 24px; }
.greeting { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 500; margin: 8px 0 6px; }
.band-note { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 14.5px; color: #5A6B60; margin: 0 0 16px; line-height: 1.45; }

.card { background: #FFFFFF; border: 1px solid #E3E1D6; border-radius: 18px; padding: 18px; margin-bottom: 14px; }
.hero-card { border: 2px solid #29382F; box-shadow: 4px 4px 0 #E9A23B; }
.pending-card { border: 2px solid #8FB3C0; }
.empty-card { border-style: dashed; }
.eyebrow { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; margin-bottom: 6px; }
.accent-text { color: #C9821B; }
.card-title { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 600; margin: 0 0 8px; line-height: 1.2; }
.why { font-size: 14.5px; line-height: 1.5; margin: 0 0 8px; color: #3D4A42; }
.dev-note { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 14px; color: #5A6B60; border-left: 3px solid #E9A23B; padding-left: 10px; margin: 10px 0 14px; }
.btn-row { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }

.primary { background: #29382F; color: #F6F5EF; border: none; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700; font-family: 'Karla', sans-serif; cursor: pointer; }
.primary:hover { background: #1E2B23; }
.primary:disabled { background: #B5B2A0; cursor: default; }
.primary.small { padding: 9px 14px; font-size: 14px; }
.primary.full { width: 100%; margin-top: 16px; }
.link-btn { text-decoration: none; display: inline-block; text-align: center; }
.ghost { background: transparent; color: #29382F; border: 1.5px solid #C9C6B4; border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700; font-family: 'Karla', sans-serif; cursor: pointer; }
.ghost.small { padding: 9px 14px; font-size: 14px; }
.ghost.full { width: 100%; }
.mt8 { margin-top: 8px; } .mt16 { margin-top: 16px; }
.danger-link { background: none; border: none; color: #A14E33; font-size: 13px; font-weight: 700; margin-top: 18px; cursor: pointer; font-family: 'Karla', sans-serif; width: 100%; }

.fineprint { font-size: 12px; color: #8A8875; margin-top: 10px; line-height: 1.5; }
.fineprint.center { text-align: center; margin-top: 18px; }
.section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; margin: 20px 0 10px; }
.mini { padding: 14px 16px; }
.venue-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.venue-name { font-family: 'Fraunces', Georgia, serif; font-size: 16.5px; font-weight: 600; margin: 0; line-height: 1.25; }

.badge { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 9px; white-space: nowrap; flex-shrink: 0; }
.b-loves { background: #FBEAC9; color: #9A6410; }
.b-great { background: #DDE8DC; color: #2F5138; }
.b-retry { background: #DEEAEF; color: #33606F; }
.b-paused { background: #ECEAE0; color: #7B7965; }
.b-worn { background: #ECEAE0; color: #7B7965; }
.b-later { background: #ECEAE0; color: #7B7965; }
.dimmed { opacity: 0.72; }
.later-note { font-size: 13px; color: #7B7965; font-style: italic; }

.nudge { display: flex; gap: 10px; background: #FBEAC9; border-radius: 14px; padding: 14px; margin-top: 14px; align-items: flex-start; }
.nudge p { margin: 0; font-size: 13.5px; line-height: 1.5; }
.nudge-emoji { font-size: 18px; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 16px; }
.chip { background: #FFFFFF; border: 1.5px solid #DDDACB; border-radius: 999px; padding: 7px 14px; font-size: 13.5px; font-weight: 700; font-family: 'Karla', sans-serif; color: #4A554D; cursor: pointer; }
.chip-on { background: #29382F; color: #F6F5EF; border-color: #29382F; }

.timeline-box { margin-top: 8px; }
.tl-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #D8D5C6; font-size: 14px; line-height: 1.45; align-items: baseline; }
.tl-age { font-weight: 700; font-size: 12.5px; color: #C9821B; flex-shrink: 0; width: 70px; }

.insights { margin-bottom: 6px; }
.insight { display: flex; gap: 10px; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; font-size: 13.5px; line-height: 1.5; align-items: flex-start; }
.insight p { margin: 0; }
.insight span { font-size: 17px; }
.insight.up { background: #DEEAEF; }
.insight.warn { background: #FBEAC9; }
.insight.pause { background: #ECEAE0; }

.mem { background: #FFFFFF; border: 1px solid #E3E1D6; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
.mem-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.mem-date { font-size: 12px; font-weight: 700; color: #8A8875; text-transform: uppercase; letter-spacing: 1px; }
.mem-rating { font-size: 12.5px; font-weight: 700; border-radius: 999px; padding: 3px 9px; }
.r-loved { background: #F6DDD5; color: #A14E33; }
.r-fine { background: #ECEAE0; color: #6B695A; }
.r-nope { background: #DEEAEF; color: #33606F; }
.mem-venue { font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.mem-note { font-size: 13.5px; font-style: italic; color: #5A6B60; }

.tabs { position: absolute; bottom: 0; left: 0; right: 0; display: flex; background: #FFFFFF; border-top: 1px solid #E3E1D6; padding: 6px 8px 10px; }
.tab { flex: 1; background: none; border: none; padding: 10px 0; font-size: 14px; font-weight: 700; font-family: 'Karla', sans-serif; color: #9A9884; cursor: pointer; border-radius: 10px; }
.tab-on { color: #29382F; background: #F0EFE4; }

.modal-bg { position: absolute; inset: 0; background: rgba(41,56,47,0.45); display: flex; align-items: flex-end; z-index: 20; }
.modal { background: #F6F5EF; width: 100%; border-radius: 22px 22px 0 0; padding: 22px 20px 26px; }
.modal-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; margin-bottom: 6px; }
.modal-title { font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; margin: 0 0 16px; }
.rate-row { display: flex; gap: 10px; margin-bottom: 14px; }
.rate-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1.5px solid #DDDACB; border-radius: 16px; padding: 14px 6px; background: #FFFFFF; font-size: 13px; font-weight: 700; font-family: 'Karla', sans-serif; cursor: pointer; color: #29382F; }
.rate-btn:hover { border-color: #29382F; }
.rate-emoji { font-size: 26px; }
.note-input { width: 100%; box-sizing: border-box; border: 1.5px solid #DDDACB; border-radius: 12px; padding: 12px 14px; font-size: 14px; font-family: 'Karla', sans-serif; background: #FFFFFF; margin-bottom: 12px; color: #29382F; }
.note-input::placeholder { color: #A5A28E; }

.ob { padding-top: 40px; }
.ob-logo { font-size: 36px; text-align: center; margin: 0; }
.ob-title { font-family: 'Fraunces', Georgia, serif; font-size: 30px; font-weight: 600; text-align: center; margin: 6px 0 8px; }
.ob-sub { font-size: 14.5px; color: #5A6B60; text-align: center; line-height: 1.5; margin: 0 0 26px; }
.ob-label { display: block; font-size: 13px; font-weight: 700; margin: 14px 0 6px; }
.opt { font-weight: 400; color: #8A8875; }

.toast { position: absolute; bottom: 82px; left: 16px; right: 16px; z-index: 30; background: #29382F; color: #F6F5EF; border-radius: 14px; padding: 13px 16px; font-size: 13.5px; line-height: 1.45; box-shadow: 0 8px 24px rgba(41,56,47,0.3); }
`;
