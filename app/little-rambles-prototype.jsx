import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Little Rambles — clickable prototype                               */
/*  Fake data, real interactions. Baby: Mia, 13 months, Vancouver.    */
/* ------------------------------------------------------------------ */

const seedVisits = [
  { id: 1, venue: "Kits Beach splash pad", cat: "water", date: "Jul 19", rating: "loved", note: "Splash pad = pure joy", photos: ["🌊", "😄", "🦶"] },
  { id: 2, venue: "Story time · VPL Kitsilano", cat: "stories", date: "Jul 16", rating: "fine", note: "", photos: ["📚"] },
  { id: 3, venue: "Vancouver Aquarium", cat: "animals", date: "Jul 12", rating: "nope", note: "Scared of the sea lions — but stared at the jellyfish forever", photos: ["🪼", "🦭"] },
  { id: 4, venue: "Story time · VPL Kitsilano", cat: "stories", date: "Jul 9", rating: "fine", note: "", photos: [] },
  { id: 5, venue: "Hillcrest parent-tot swim", cat: "water", date: "Jul 5", rating: "loved", note: "Kicked her legs the whole time", photos: ["🏊", "💦"] },
  { id: 6, venue: "Story time · VPL Kitsilano", cat: "stories", date: "Jul 2", rating: "loved", note: "Clapped at the song part", photos: ["🎶"] },
  { id: 7, venue: "Maplewood Farm", cat: "animals", date: "Jun 28", rating: "fine", note: "Liked the goats… from a distance", photos: ["🐐"] },
  { id: 8, venue: "Story time · VPL Kitsilano", cat: "stories", date: "Jun 25", rating: "fine", note: "", photos: [] },
];

const exploreVenues = [
  {
    id: "qe-park",
    name: "Queen Elizabeth Park water feature",
    cat: "water",
    tags: ["outdoor", "free", "new"],
    fit: "loves",
    why: "Water play has been her biggest hit this month — and this one's new to you.",
  },
  {
    id: "bloedel",
    name: "Bloedel Conservatory",
    cat: "nature",
    tags: ["indoor", "rainy", "new"],
    fit: "great",
    why: "Free-flying birds at stroller height. Warm and calm — a good rainy-day pocket.",
  },
  {
    id: "music",
    name: "Music Together drop-in · Mt Pleasant",
    cat: "music",
    tags: ["indoor", "rainy", "new"],
    fit: "great",
    why: "12–15 months is a rhythm-and-imitation window. Shakers, clapping, repetition.",
  },
  {
    id: "kids-market",
    name: "Granville Island Kids Market",
    cat: "sensory",
    tags: ["indoor", "rainy", "new"],
    fit: "great",
    why: "Busy but contained. Lots to point at, short walking distances between wonders.",
  },
  {
    id: "vpl",
    name: "Story time · VPL Kitsilano",
    cat: "stories",
    tags: ["indoor", "free", "rainy"],
    fit: "worn",
    why: "Still great at this age — but it's been 5 of your last 8 outings.",
  },
  {
    id: "aquarium",
    name: "Vancouver Aquarium — touch pool",
    cat: "animals",
    tags: ["indoor", "rainy"],
    fit: "retry",
    why: "A 'not today' on Jul 12. Around 18 months the pointing-and-naming burst kicks in — the jellyfish she loved become something she can name.",
  },
  {
    id: "science-world",
    name: "Science World",
    cat: "science",
    tags: ["indoor", "rainy"],
    fit: "later",
    why: "Exhibits assume cause-and-effect play and longer attention. Genuinely better around 2½ — it's on her timeline, not today's list.",
  },
];

const FIT_META = {
  loves: { label: "She loves this", tone: "accent" },
  great: { label: "Great at 13 months", tone: "green" },
  worn: { label: "Well-worn", tone: "muted" },
  retry: { label: "Retry ~18 months", tone: "blue" },
  later: { label: "Best around 2½", tone: "muted" },
};

const RATING_META = {
  loved: { emoji: "😍", label: "Loved it", cls: "r-loved" },
  fine: { emoji: "🙂", label: "Fine", cls: "r-fine" },
  nope: { emoji: "😵", label: "Not today", cls: "r-nope" },
};

export default function App() {
  const [tab, setTab] = useState("today");
  const [visits, setVisits] = useState(seedVisits);
  const [pending, setPending] = useState(null); // visit awaiting check-in
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const [savedIds, setSavedIds] = useState([]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const waterLoves = useMemo(
    () => visits.filter((v) => v.cat === "water" && v.rating === "loved").length,
    [visits]
  );
  const libraryCount = useMemo(
    () => visits.slice(0, 8).filter((v) => v.cat === "stories").length,
    [visits]
  );

  const goOut = (venue) => {
    setPending({
      id: Date.now(),
      venue: venue.name,
      cat: venue.cat,
      date: "Today",
      rating: null,
      note: "",
      photos: ["📷"],
    });
    showToast("Opening Maps… visit logged automatically. No typing needed.");
  };

  const saveForLater = (venue) => {
    setSavedIds((s) => (s.includes(venue.id) ? s : [...s, venue.id]));
    showToast("Saved for later.");
  };

  const submitCheckIn = (rating) => {
    const done = { ...pending, rating, note: checkInNote, photos: rating === "loved" ? ["📷", "😄", "💦"] : ["📷"] };
    setVisits((v) => [done, ...v]);
    setPending(null);
    setCheckInOpen(false);
    setCheckInNote("");
    if (rating === "loved" && done.cat === "water") {
      showToast("Saved to Mia's story. Noted: water play keeps winning — I'll lean into it.");
    } else if (rating === "nope") {
      showToast("Saved. I'll quiet this type down for a while and suggest a retry when she's ready.");
    } else {
      showToast("Saved to Mia's story.");
    }
    setTab("memories");
  };

  const filteredVenues = exploreVenues.filter((v) => {
    if (filter === "all") return true;
    if (filter === "rainy") return v.tags.includes("rainy");
    if (filter === "free") return v.tags.includes("free");
    if (filter === "new") return v.tags.includes("new");
    return true;
  });

  return (
    <div className="lr-root">
      <style>{css}</style>
      <div className="phone">
        <header className="hdr">
          <div className="hdr-brand">
            <span className="hdr-logo">〰️</span>
            <span className="hdr-name">Little Rambles</span>
          </div>
          <div className="hdr-baby">Mia · 13 mo</div>
        </header>

        <main className="scroll">
          {tab === "today" && (
            <TodayScreen
              pending={pending}
              onGo={goOut}
              onSave={saveForLater}
              onOpenCheckIn={() => setCheckInOpen(true)}
              waterLoves={waterLoves}
            />
          )}
          {tab === "explore" && (
            <ExploreScreen
              venues={filteredVenues}
              filter={filter}
              setFilter={setFilter}
              onGo={goOut}
              onSave={saveForLater}
              savedIds={savedIds}
            />
          )}
          {tab === "memories" && (
            <MemoriesScreen visits={visits} waterLoves={waterLoves} libraryCount={libraryCount} />
          )}
        </main>

        <nav className="tabs">
          {[
            ["today", "Today"],
            ["explore", "Explore"],
            ["memories", "Memories"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={"tab" + (tab === key ? " tab-on" : "")}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        {checkInOpen && pending && (
          <div className="modal-bg" onClick={() => setCheckInOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">Later that evening…</div>
              <h3 className="modal-title">How was {pending.venue}?</h3>
              <div className="rate-row">
                {Object.entries(RATING_META).map(([key, m]) => (
                  <button key={key} className={"rate-btn " + m.cls} onClick={() => submitCheckIn(key)}>
                    <span className="rate-emoji">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
              <input
                className="note-input"
                placeholder="Anything worth remembering? (optional)"
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
              />
              <button className="ghost small" onClick={() => setCheckInOpen(false)}>
                Not now
              </button>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

/* ----------------------------- Today ------------------------------ */

function TodayScreen({ pending, onGo, onSave, onOpenCheckIn, waterLoves }) {
  const hero = exploreVenues[0]; // QE Park water feature
  return (
    <div className="pad">
      <p className="greeting">Saturday morning</p>
      <div className="conditions">
        <span className="cond">☀️ 21° sunny</span>
        <span className="cond">😴 nap ended 9:40</span>
        <span className="cond">🕐 good window · now–1:30</span>
      </div>

      {pending ? (
        <div className="card pending-card">
          <div className="eyebrow">Out right now</div>
          <h2 className="card-title">{pending.venue}</h2>
          <p className="why">Logged automatically when you opened Maps. Photos you take today will attach here.</p>
          <div className="photo-strip">
            <span className="photo">📷</span>
            <span className="photo dim">＋</span>
          </div>
          <button className="primary" onClick={onOpenCheckIn}>
            Evening check-in →
          </button>
          <p className="fineprint">(In real life this appears tonight. One tap, optional.)</p>
        </div>
      ) : (
        <div className="card hero-card">
          <div className="eyebrow accent-text">Right now</div>
          <h2 className="card-title">{hero.name}</h2>
          <p className="why">“{hero.why}”</p>
          <p className="dev-note">
            At 13 months she's deep in cause-and-effect play — splash, watch, repeat. Water is basically a physics lab she can sit in.
          </p>
          <div className="btn-row">
            <button className="primary" onClick={() => onGo(hero)}>
              Let's go · open Maps
            </button>
            <button className="ghost" onClick={() => onSave(hero)}>
              Save
            </button>
          </div>
        </div>
      )}

      <div className="section-label">Also good today</div>
      {exploreVenues.slice(1, 4).map((v) => (
        <MiniCard key={v.id} v={v} onGo={onGo} onSave={onSave} />
      ))}

      <div className="nudge">
        <span className="nudge-emoji">💡</span>
        <p>
          Water play is {waterLoves} for {waterLoves} “loved it” this month. When something works this well, it's worth
          riding the streak.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Explore ---------------------------- */

function ExploreScreen({ venues, filter, setFilter, onGo, onSave, savedIds }) {
  return (
    <div className="pad">
      <div className="chips">
        {[
          ["all", "All"],
          ["rainy", "Rainy day"],
          ["free", "Free"],
          ["new", "New to you"],
        ].map(([key, label]) => (
          <button key={key} className={"chip" + (filter === key ? " chip-on" : "")} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {venues.map((v) => (
        <div key={v.id} className={"card venue-card" + (v.fit === "later" ? " dimmed" : "")}>
          <div className="venue-top">
            <h3 className="venue-name">{v.name}</h3>
            <FitBadge fit={v.fit} />
          </div>
          <p className="why">{v.why}</p>
          {v.fit !== "later" ? (
            <div className="btn-row">
              <button className="primary small" onClick={() => onGo(v)}>
                Let's go
              </button>
              <button className="ghost small" onClick={() => onSave(v)}>
                {savedIds.includes(v.id) ? "Saved ✓" : "Save"}
              </button>
            </div>
          ) : (
            <div className="later-note">On Mia's timeline · we'll resurface it</div>
          )}
        </div>
      ))}

      <div className="timeline-box">
        <div className="section-label">Coming up as she grows</div>
        <div className="tl-item">
          <span className="tl-age">14–16 mo</span>
          <span>Pointing &amp; naming burst — animal outings get a second life</span>
        </div>
        <div className="tl-item">
          <span className="tl-age">18 mo</span>
          <span>Aquarium touch pool retry · first pretend play props</span>
        </div>
        <div className="tl-item">
          <span className="tl-age">~2½ y</span>
          <span>Science World, children's theatre, first “museum” museums</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Memories ---------------------------- */

function MemoriesScreen({ visits, waterLoves, libraryCount }) {
  return (
    <div className="pad">
      <div className="insights">
        <div className="section-label">What the log is learning</div>
        <div className="insight up">
          <span>💧</span>
          <p>
            <b>Working well:</b> water play — {waterLoves} “loved it” this month. Leaning suggestions this way.
          </p>
        </div>
        <div className="insight warn">
          <span>🔁</span>
          <p>
            <b>Getting samey:</b> story time was {libraryCount} of your last 8 outings. Two fresh ideas are queued in Explore.
          </p>
        </div>
        <div className="insight pause">
          <span>🦭</span>
          <p>
            <b>Paused:</b> big-animal outings — mostly “fine” or worse. Retry flagged for ~18 months, when naming things becomes the game.
          </p>
        </div>
      </div>

      <div className="section-label">Mia's story</div>
      {visits.map((v) => (
        <div key={v.id} className="mem">
          <div className="mem-head">
            <span className="mem-date">{v.date}</span>
            {v.rating && (
              <span className={"mem-rating " + RATING_META[v.rating].cls}>
                {RATING_META[v.rating].emoji} {RATING_META[v.rating].label}
              </span>
            )}
          </div>
          <div className="mem-venue">{v.venue}</div>
          {v.note ? <div className="mem-note">“{v.note}”</div> : null}
          {v.photos && v.photos.length > 0 && (
            <div className="photo-strip">
              {v.photos.map((p, i) => (
                <span key={i} className="photo">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="fineprint center">
        Six months from now, this scroll is her first-year story — built from taps you barely noticed making.
      </p>
    </div>
  );
}

/* ---------------------------- Bits -------------------------------- */

function MiniCard({ v, onGo, onSave }) {
  return (
    <div className="card mini">
      <div className="venue-top">
        <h3 className="venue-name">{v.name}</h3>
        <FitBadge fit={v.fit} />
      </div>
      <p className="why">{v.why}</p>
      <div className="btn-row">
        <button className="primary small" onClick={() => onGo(v)}>
          Let's go
        </button>
        <button className="ghost small" onClick={() => onSave(v)}>
          Save
        </button>
      </div>
    </div>
  );
}

function FitBadge({ fit }) {
  const m = FIT_META[fit];
  return <span className={"badge b-" + m.tone}>{m.label}</span>;
}

/* ----------------------------- Styles ------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;700&display=swap');

.lr-root {
  min-height: 100vh;
  background: #E9EAE0;
  display: flex;
  justify-content: center;
  align-items: stretch;
  font-family: 'Karla', system-ui, sans-serif;
  color: #29382F;
}
.phone {
  width: 100%;
  max-width: 430px;
  background: #F6F5EF;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  box-shadow: 0 0 40px rgba(41,56,47,0.12);
}
.hdr {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px 10px;
}
.hdr-brand { display: flex; align-items: center; gap: 8px; }
.hdr-logo { font-size: 18px; }
.hdr-name { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 19px; letter-spacing: 0.2px; }
.hdr-baby {
  font-size: 13px; font-weight: 700; color: #F6F5EF;
  background: #29382F; border-radius: 999px; padding: 5px 12px;
}
.scroll { flex: 1; overflow-y: auto; padding-bottom: 76px; }
.pad { padding: 6px 18px 24px; }

.greeting { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 500; margin: 8px 0 10px; }
.conditions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.cond {
  font-size: 12.5px; font-weight: 500; background: #FFFFFF;
  border: 1px solid #E0DED2; border-radius: 999px; padding: 5px 11px;
}

.card {
  background: #FFFFFF; border: 1px solid #E3E1D6; border-radius: 18px;
  padding: 18px; margin-bottom: 14px;
}
.hero-card { border: 2px solid #29382F; box-shadow: 4px 4px 0 #E9A23B; }
.pending-card { border: 2px solid #8FB3C0; }
.eyebrow { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; margin-bottom: 6px; }
.accent-text { color: #C9821B; }
.card-title { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 600; margin: 0 0 8px; line-height: 1.2; }
.why { font-size: 14.5px; line-height: 1.5; margin: 0 0 8px; color: #3D4A42; }
.dev-note {
  font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 14px;
  color: #5A6B60; border-left: 3px solid #E9A23B; padding-left: 10px; margin: 10px 0 14px;
}
.btn-row { display: flex; gap: 10px; margin-top: 4px; }
.primary {
  background: #29382F; color: #F6F5EF; border: none; border-radius: 12px;
  padding: 12px 18px; font-size: 15px; font-weight: 700; font-family: 'Karla', sans-serif;
  cursor: pointer; flex-shrink: 0;
}
.primary:hover { background: #1E2B23; }
.primary.small { padding: 9px 14px; font-size: 14px; }
.ghost {
  background: transparent; color: #29382F; border: 1.5px solid #C9C6B4;
  border-radius: 12px; padding: 12px 18px; font-size: 15px; font-weight: 700;
  font-family: 'Karla', sans-serif; cursor: pointer;
}
.ghost.small { padding: 9px 14px; font-size: 14px; }
.fineprint { font-size: 12px; color: #8A8875; margin-top: 10px; }
.fineprint.center { text-align: center; margin-top: 18px; }

.section-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px;
  color: #8A8875; margin: 20px 0 10px;
}
.mini { padding: 14px 16px; }
.venue-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
.venue-name { font-family: 'Fraunces', Georgia, serif; font-size: 16.5px; font-weight: 600; margin: 0; line-height: 1.25; }
.badge {
  font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 9px;
  white-space: nowrap; flex-shrink: 0;
}
.b-accent { background: #FBEAC9; color: #9A6410; }
.b-green { background: #DDE8DC; color: #2F5138; }
.b-blue { background: #DEEAEF; color: #33606F; }
.b-muted { background: #ECEAE0; color: #7B7965; }
.dimmed { opacity: 0.72; }
.later-note { font-size: 13px; color: #7B7965; font-style: italic; }

.nudge {
  display: flex; gap: 10px; background: #FBEAC9; border-radius: 14px;
  padding: 14px; margin-top: 18px; align-items: flex-start;
}
.nudge p { margin: 0; font-size: 13.5px; line-height: 1.5; }
.nudge-emoji { font-size: 18px; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 16px; }
.chip {
  background: #FFFFFF; border: 1.5px solid #DDDACB; border-radius: 999px;
  padding: 7px 14px; font-size: 13.5px; font-weight: 700; font-family: 'Karla', sans-serif;
  color: #4A554D; cursor: pointer;
}
.chip-on { background: #29382F; color: #F6F5EF; border-color: #29382F; }

.timeline-box { margin-top: 8px; }
.tl-item {
  display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #D8D5C6;
  font-size: 14px; line-height: 1.45; align-items: baseline;
}
.tl-age {
  font-weight: 700; font-size: 12.5px; color: #C9821B; flex-shrink: 0; width: 64px;
}

.insights { margin-bottom: 6px; }
.insight {
  display: flex; gap: 10px; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px;
  font-size: 13.5px; line-height: 1.5; align-items: flex-start;
}
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
.mem-note { font-size: 13.5px; font-style: italic; color: #5A6B60; margin-bottom: 6px; }
.photo-strip { display: flex; gap: 6px; margin-top: 6px; }
.photo {
  width: 44px; height: 44px; border-radius: 10px; background: #F0EFE6;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  border: 1px solid #E3E1D6;
}
.photo.dim { color: #B5B2A0; font-size: 22px; }

.tabs {
  position: absolute; bottom: 0; left: 0; right: 0; display: flex;
  background: #FFFFFF; border-top: 1px solid #E3E1D6; padding: 6px 8px 10px;
}
.tab {
  flex: 1; background: none; border: none; padding: 10px 0; font-size: 14px;
  font-weight: 700; font-family: 'Karla', sans-serif; color: #9A9884; cursor: pointer;
  border-radius: 10px;
}
.tab-on { color: #29382F; background: #F0EFE4; }

.modal-bg {
  position: absolute; inset: 0; background: rgba(41,56,47,0.45);
  display: flex; align-items: flex-end; z-index: 20;
}
.modal {
  background: #F6F5EF; width: 100%; border-radius: 22px 22px 0 0; padding: 22px 20px 26px;
}
.modal-eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; margin-bottom: 6px; }
.modal-title { font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; margin: 0 0 16px; }
.rate-row { display: flex; gap: 10px; margin-bottom: 14px; }
.rate-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
  border: 1.5px solid #DDDACB; border-radius: 16px; padding: 14px 6px; background: #FFFFFF;
  font-size: 13px; font-weight: 700; font-family: 'Karla', sans-serif; cursor: pointer; color: #29382F;
}
.rate-btn:hover { border-color: #29382F; }
.rate-emoji { font-size: 26px; }
.note-input {
  width: 100%; box-sizing: border-box; border: 1.5px solid #DDDACB; border-radius: 12px;
  padding: 12px 14px; font-size: 14px; font-family: 'Karla', sans-serif; background: #FFFFFF;
  margin-bottom: 12px; color: #29382F;
}
.note-input::placeholder { color: #A5A28E; }

.toast {
  position: absolute; bottom: 82px; left: 16px; right: 16px; z-index: 30;
  background: #29382F; color: #F6F5EF; border-radius: 14px; padding: 13px 16px;
  font-size: 13.5px; line-height: 1.45; box-shadow: 0 8px 24px rgba(41,56,47,0.3);
}
`;
