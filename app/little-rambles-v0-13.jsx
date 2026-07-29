import { useState, useEffect, useMemo, useRef } from "react";

/* ================================================================
   Little Rambles v0.13
   NEW vs 0.12 (ADR-0012): age range extends to 0-7y - two new bands
   (preschool leap 42-60, big kid 60-84), affordances rule_games +
   big_kid_challenge, six big-kid ideas incl. after-school hours,
   grown-up age display (3y 2m).
   NEW vs 0.11: edit any memory - text, place, photos (add/remove),
   rating correction (feeds engine as corrected child response), and
   two-tap delete with storage cleanup.
   NEW vs 0.10: Memories becomes the hook - stats header, Story/Photos
   views, lightbox, loved/photo filters + search, and freeform journal
   entries (kept OUT of the recommendation engine: parent voice).
   NEW vs 0.9: rich illustration pack - all nine category scenes rebuilt
   with depth (glow, clouds, layers, texture). Photo attempt + fallback
   retained (dormant in sandbox per QA-19; activates Phase 2).
   NEW vs 0.8: real photo banners (Unsplash-licensed) with graceful
   fallback to the illustrated SVG if the sandbox blocks external images
   or a link rots. Emoji identity badge overlays photos.
   NEW vs 0.7: illustrated card banners - per-category SVG scenes in the
   design palette on hero/explore/deck cards; emoji as focal character.
   No network images, no licensing exposure. Real venue photos arrive
   with the Phase 4 Places pipeline.
   NEW vs 0.6.1: Snap - shoot through the app and the photo attaches at
   the capture moment (no evening picking). Cap 6/visit. Check-in preloads
   snapped photos + drafts. Library auto-harvest remains Phase 5 native.
   FIX vs 0.6.0 (defect #2): artifact sandbox blocks the geolocation API
   entirely - pin now fails with an honest environment message instead of
   implying a user error. Feature verified at Phase 2 (PWA) per the
   environment capability matrix (docs/qa/).
   NEW vs 0.5.1 (ADR-0011 rung 1): one-tap on-site pin -> coordinates
   stored, journal gets a see-on-map link; retroactive naming when the
   Phase 4 pipeline lands. No typing, no background tracking.
   FIXES vs 0.5.0 (founder defect report):
   - Visible version badge in header (you can now tell which build runs)
   - Check-in modal reordered: place/photos/note BEFORE ratings, because
     tapping a rating submits — fields after the submit action were
     effectively invisible.
   NEW vs v0.4 (PRD: docs/prds/2026-07-27-v0-5-place-names-photos.md):
   6. Check-in captures WHICH place (optional name field) - journal leads
      with the real venue, category becomes subtitle.
   7. Photo journal: up to 3 compressed photos per visit, persisted,
      thumbnail strip in Memories. Video deferred to Phase 2 storage.
   NEW vs v0.3 (PRD: docs/prds/2026-07-27-v0-4-variety-discover.md):
   4. Variety guarantees: last outing never leads again; recency counts
      unrated visits; Today list is category-diverse (max 1/category).
   5. Discover deck: optional swipe mode. Right=save (weak +2 parent-taste
      signal), left=not-for-us (weak -2, never a ban). Ratings outrank swipes.
   NEW vs v0.2:
   3. Ramble anywhere: set a temporary spot (appointment address,
      grandma's neighbourhood) and every "Let's go" searches near
      there instead of near home. Recent spots are remembered.
      Visits record where you were.
   (v0.2: affordance-based developmental engine + availability
    pre-processing. v0.1: real onboarding, logging, persistence.)
   ================================================================ */

const STORAGE_KEY = "little-rambles-v02";

/* ---------- Condensed developmental map (see full JSON file) ---- */
const AFFORDANCE_LABELS = {
  water_play: "water play", cause_effect: "cause & effect", gross_motor_low: "crawl/cruise/toddle",
  climb_run: "climb & run", fine_motor: "little hands", sensory_textures: "textures & senses",
  naming_targets: "things to name", story_language: "language & songs", music_rhythm: "rhythm",
  peer_faces: "faces & friends", animal_watch: "watching animals", animal_touch: "gentle animal contact",
  calm_regulation: "calm & cozy", pretend_play: "pretend play", art_materials: "messy art",
  attention_span_long: "longer attention",
  rule_games: "games with rules",
  big_kid_challenge: "big-kid challenge",
};

const BANDS = [
  { min: 0, max: 6, theme: "Faces, voices, and gentle motion are the whole world. Anywhere calm counts.", wants: { calm_regulation: 3, peer_faces: 2, music_rhythm: 2, story_language: 2, sensory_textures: 1 } },
  { min: 6, max: 9, theme: "Sitting up changes everything — new sightlines, grabbing, first cause-and-effect games.", wants: { sensory_textures: 3, cause_effect: 2, gross_motor_low: 2, peer_faces: 2, music_rhythm: 2, story_language: 2, water_play: 1 } },
  { min: 9, max: 12, theme: "Object permanence and cruising. Peekaboo is science; pulling up on things is the sport.", wants: { gross_motor_low: 3, cause_effect: 3, story_language: 2, music_rhythm: 2, water_play: 2, sensory_textures: 2, peer_faces: 2, animal_watch: 1 } },
  { min: 12, max: 15, theme: "Cause-and-effect play is peaking — splash, drop, watch, repeat. First words are brewing.", wants: { cause_effect: 3, water_play: 3, gross_motor_low: 2, naming_targets: 2, music_rhythm: 2, story_language: 2, sensory_textures: 2, climb_run: 1, animal_watch: 1 } },
  { min: 15, max: 18, theme: "The pointing-and-naming burst. The world becomes a picture book she wants labeled.", wants: { naming_targets: 3, story_language: 2, animal_watch: 2, climb_run: 2, water_play: 2, cause_effect: 2, music_rhythm: 2, animal_touch: 1, pretend_play: 1 } },
  { min: 18, max: 24, theme: "Pretend play sparks, climbing gets serious, and 'again!' becomes a lifestyle.", wants: { climb_run: 3, pretend_play: 2, naming_targets: 2, animal_touch: 2, water_play: 2, music_rhythm: 2, story_language: 2, art_materials: 1, peer_faces: 2 } },
  { min: 24, max: 30, theme: "Two-word sentences, real running, and following simple stories. Group activities start to land.", wants: { pretend_play: 3, story_language: 3, peer_faces: 2, art_materials: 2, climb_run: 2, animal_touch: 2, naming_targets: 1, cause_effect: 1 } },
  { min: 30, max: 42, theme: "Why-questions, imaginative worlds, and longer attention. 'Real' museums start paying off.", wants: { pretend_play: 3, story_language: 3, attention_span_long: 2, art_materials: 2, climb_run: 2, cause_effect: 2, naming_targets: 1, peer_faces: 2 } },
  { min: 42, max: 60, theme: "The preschool leap: pretend worlds get plots, questions never stop, and bodies learn to pedal, hop, and truly climb.", wants: { pretend_play: 3, climb_run: 3, peer_faces: 3, rule_games: 2, art_materials: 2, attention_span_long: 2, story_language: 2, cause_effect: 2, big_kid_challenge: 2, naming_targets: 1 } },
  { min: 60, max: 84, theme: "Big kid, wide world: games with rules, reading hiding everywhere, real museum stamina — and school reshaping the week.", wants: { rule_games: 3, big_kid_challenge: 3, attention_span_long: 3, peer_faces: 3, climb_run: 2, story_language: 2, art_materials: 2, cause_effect: 2, pretend_play: 2 } },
];
const bandFor = (m) => BANDS.find((b) => m >= b.min && m < b.max) || BANDS[BANDS.length - 1];

/* ---------- Idea library: affordances + typical availability ----
   hours: { days: [0=Sun..6=Sat], open, close (24h decimals),
            months: [firstMonth, lastMonth] seasonal window (1-12),
            conf: 'daily' | 'schedule' | 'seasonal' | 'daylight' }
   conf drives the honesty label. 'schedule' = sessions vary, check.
----------------------------------------------------------------- */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const IDEAS = [
  { id: "splash", name: "Splash pad / spray park", cat: "water", emoji: "💦", tags: ["outdoor", "free"], ageMin: 8, aff: ["water_play", "cause_effect", "climb_run", "sensory_textures"], mapsQuery: "splash pad", why: "Water is a physics lab she can sit in — splash, watch, repeat.", hours: { days: ALL_DAYS, open: 9, close: 19, months: [5, 9], conf: "seasonal" } },
  { id: "swim", name: "Parent-tot swim time", cat: "water", emoji: "🏊", tags: ["indoor", "rainy"], ageMin: 6, aff: ["water_play", "gross_motor_low", "calm_regulation"], mapsQuery: "community pool family swim", why: "Warm pool, your arms, her kicks.", hours: { days: ALL_DAYS, open: 9, close: 20, conf: "schedule" } },
  { id: "storytime", name: "Library story time", cat: "stories", emoji: "📚", tags: ["indoor", "free", "rainy"], ageMin: 6, aff: ["story_language", "music_rhythm", "peer_faces"], mapsQuery: "public library", why: "Songs, rhythm, other babies — serve-and-return in group form.", hours: { days: WEEKDAYS, open: 9.5, close: 11.5, conf: "schedule" } },
  { id: "musicclass", name: "Parent & baby music drop-in", cat: "music", emoji: "🎶", tags: ["indoor", "rainy"], ageMin: 8, aff: ["music_rhythm", "peer_faces", "cause_effect"], mapsQuery: "baby music class", why: "Shakers, clapping, repetition — squarely in the rhythm window.", hours: { days: WEEKDAYS, open: 9, close: 12, conf: "schedule" } },
  { id: "farm", name: "Petting farm", cat: "animals", emoji: "🐐", tags: ["outdoor"], ageMin: 10, aff: ["animal_watch", "animal_touch", "naming_targets"], mapsQuery: "petting farm", why: "Animals at her scale, at her pace. She sets the distance.", hours: { days: ALL_DAYS, open: 10, close: 16, months: [3, 10], conf: "seasonal" } },
  { id: "aquarium", name: "Aquarium", cat: "animals", emoji: "🪼", tags: ["indoor", "rainy"], ageMin: 12, aff: ["animal_watch", "naming_targets", "calm_regulation"], mapsQuery: "aquarium", why: "Slow, glowing, mesmerizing — and dramatically better once naming becomes the game.", hours: { days: ALL_DAYS, open: 9.5, close: 17.5, conf: "daily" } },
  { id: "conservatory", name: "Conservatory / botanical garden", cat: "nature", emoji: "🦜", tags: ["indoor", "rainy"], ageMin: 0, aff: ["calm_regulation", "naming_targets", "animal_watch", "sensory_textures"], mapsQuery: "conservatory botanical garden", why: "Warm, calm, birds and colors at stroller height.", hours: { days: ALL_DAYS, open: 10, close: 17, conf: "daily" } },
  { id: "beach", name: "Beach at low tide", cat: "nature", emoji: "🌊", tags: ["outdoor", "free"], ageMin: 10, aff: ["water_play", "sensory_textures", "cause_effect", "climb_run"], mapsQuery: "beach", why: "Sand physics, water edges, treasure everywhere.", hours: { days: ALL_DAYS, open: 8, close: 19, conf: "daylight" } },
  { id: "naturewalk", name: "Stroller-friendly nature walk", cat: "nature", emoji: "🌲", tags: ["outdoor", "free"], ageMin: 0, aff: ["calm_regulation", "naming_targets", "sensory_textures"], mapsQuery: "easy nature trail", why: "Light through leaves is legitimate entertainment. Good for hard days.", hours: { days: ALL_DAYS, open: 8, close: 19, conf: "daylight" } },
  { id: "indoorplay", name: "Indoor playground / play café", cat: "sensory", emoji: "🧸", tags: ["indoor", "rainy"], ageMin: 10, aff: ["climb_run", "gross_motor_low", "cause_effect", "peer_faces"], mapsQuery: "indoor playground toddlers", why: "Soft, contained, climbable. Look for an under-2 zone.", hours: { days: ALL_DAYS, open: 9, close: 18, conf: "daily" } },
  { id: "market", name: "Public market / farmers market", cat: "sensory", emoji: "🍓", tags: ["outdoor"], ageMin: 6, aff: ["sensory_textures", "naming_targets", "peer_faces"], mapsQuery: "farmers market", why: "A sensory buffet: colors, smells, samples, faces.", hours: { days: WEEKEND, open: 9, close: 14, conf: "schedule" } },
  { id: "artdropin", name: "Messy art drop-in", cat: "art", emoji: "🎨", tags: ["indoor", "rainy"], ageMin: 14, aff: ["art_materials", "sensory_textures", "fine_motor", "cause_effect"], mapsQuery: "toddler art class drop-in", why: "Paint as a full-body experience. Their mess, not your kitchen's.", hours: { days: WEEKDAYS, open: 9, close: 16, conf: "schedule" } },
  { id: "playground", name: "Toddler playground", cat: "playground", emoji: "🛝", tags: ["outdoor", "free"], ageMin: 10, aff: ["climb_run", "gross_motor_low", "peer_faces"], mapsQuery: "toddler playground", why: "Baby swings and low structures. The reliable default for a reason.", hours: { days: ALL_DAYS, open: 8, close: 20, conf: "daylight" } },
  { id: "sciencecentre", name: "Science centre", cat: "science", emoji: "🔭", tags: ["indoor", "rainy"], ageMin: 28, aff: ["cause_effect", "attention_span_long", "naming_targets"], mapsQuery: "science centre", why: "Exhibits assume cause-and-effect play plus longer attention.", laterLabel: "Best around 2½", hours: { days: ALL_DAYS, open: 10, close: 17, conf: "daily" } },
  { id: "bikeloop", name: "Bike / scooter loop or pump track", cat: "playground", emoji: "🚲", tags: ["outdoor", "free"], ageMin: 30, aff: ["climb_run", "big_kid_challenge"], mapsQuery: "pump track bike park kids", why: "Wheels are freedom units. Start on the flat loop, graduate to the bumps.", hours: { days: ALL_DAYS, open: 8, close: 20, conf: "daylight" } },
  { id: "bowling", name: "Family bowling (bumpers up)", cat: "sensory", emoji: "🎳", tags: ["indoor", "rainy"], ageMin: 48, aff: ["rule_games", "big_kid_challenge", "peer_faces"], mapsQuery: "bowling alley", why: "Rules, turns, and the mighty drama of pin ten.", hours: { days: ALL_DAYS, open: 11, close: 21, conf: "daily" } },
  { id: "climbgym", name: "Kids climbing gym", cat: "playground", emoji: "🧗", tags: ["indoor", "rainy"], ageMin: 48, aff: ["big_kid_challenge", "climb_run"], mapsQuery: "kids climbing gym", why: "Graded walls: confidence you can measure in metres.", hours: { days: ALL_DAYS, open: 9, close: 20, conf: "daily" } },
  { id: "skate", name: "Family skate session", cat: "playground", emoji: "⛸️", tags: ["indoor"], ageMin: 42, aff: ["big_kid_challenge", "climb_run", "peer_faces"], mapsQuery: "ice rink public skate family", why: "Wobbling together absolutely counts as bonding.", hours: { days: ALL_DAYS, open: 10, close: 20, conf: "schedule" } },
  { id: "upick", name: "U-pick berry farm", cat: "nature", emoji: "🍓", tags: ["outdoor"], ageMin: 24, aff: ["sensory_textures", "naming_targets", "big_kid_challenge"], mapsQuery: "u-pick berry farm", why: "A snack you earned yourself. Sticky hands guaranteed.", hours: { days: ALL_DAYS, open: 9, close: 17, months: [6, 9], conf: "seasonal" } },
  { id: "makerclub", name: "Library LEGO / maker club", cat: "art", emoji: "🧱", tags: ["indoor", "free", "rainy"], ageMin: 48, aff: ["rule_games", "art_materials", "attention_span_long", "peer_faces"], mapsQuery: "library lego club kids", why: "Free, structured — and someone else vacuums the LEGO.", hours: { days: WEEKDAYS, open: 15, close: 17.5, conf: "schedule" } },
  { id: "theatre", name: "Children's theatre / puppet show", cat: "science", emoji: "🎭", tags: ["indoor", "rainy"], ageMin: 30, aff: ["story_language", "attention_span_long", "pretend_play"], mapsQuery: "children's theatre", why: "Following a story on a stage needs ~2½-year-old attention.", laterLabel: "Best around 2½–3", hours: { days: ALL_DAYS, open: 10, close: 18, conf: "schedule" } },
];

const RATING_META = {
  loved: { emoji: "😍", label: "Loved it", cls: "r-loved" },
  fine: { emoji: "🙂", label: "Fine", cls: "r-fine" },
  nope: { emoji: "😵", label: "Not today", cls: "r-nope" },
};

/* ------------------ Availability pre-processing ----------------- */
function fmtHour(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = ((hh + 11) % 12) + 1;
  return mm ? `${h12}:${String(mm).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

function availability(idea, now = new Date()) {
  const h = idea.hours;
  const month = now.getMonth() + 1;
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  if (h.months && (month < h.months[0] || month > h.months[1])) {
    return { status: "closed", rank: -1, label: `Season: ${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][h.months[0]]}–${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][h.months[1]]}` };
  }
  if (!h.days.includes(day)) {
    const isWeekendOnly = h.days.length === 2;
    return { status: "closed", rank: -1, label: isWeekendOnly ? "Weekends" : "Not today — weekday thing" };
  }
  if (hour < h.open) {
    const soon = h.open - hour <= 1.5;
    return soon
      ? { status: "soon", rank: 0.5, label: `Opens ~${fmtHour(h.open)}` }
      : { status: "closed", rank: -1, label: `Opens ~${fmtHour(h.open)}` };
  }
  if (hour >= h.close) return { status: "closed", rank: -1, label: `Done for today` };
  if (h.close - hour <= 1) return { status: "closing", rank: 0.6, label: `Closes ~${fmtHour(h.close)}` };

  const confLabel = { daily: "Open now", daylight: "Good now", seasonal: "Open now · in season", schedule: "Sessions today — check times" }[h.conf];
  return { status: "open", rank: 1, label: confLabel };
}

/* ----------------------- Helpers ------------------------------- */
function monthsBetween(birthdateStr) {
  const b = new Date(birthdateStr + "T00:00:00");
  const now = new Date();
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m -= 1;
  return Math.max(0, m);
}
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtAge = (m) => (m < 24 ? m + " mo" : Math.floor(m / 12) + "y" + (m % 12 ? " " + (m % 12) + "m" : ""));
const timeGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const mapsUrl = (q, loc) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + " near " + (loc || "me"));
const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* =========================== App =============================== */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [baby, setBaby] = useState(null);
  const [visits, setVisits] = useState([]);
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState("today");
  const [checkInFor, setCheckInFor] = useState(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInPlace, setCheckInPlace] = useState("");
  const [checkInPhotos, setCheckInPhotos] = useState([]);
  const [photosByVisit, setPhotosByVisit] = useState({});
  const [memFilter, setMemFilter] = useState("all");
  const [memSearch, setMemSearch] = useState("");
  const [memView, setMemView] = useState("story");
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [journalPhotos, setJournalPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [editPlace, setEditPlace] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [editRating, setEditRating] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editingProfile, setEditingProfile] = useState(false);
  const [loc, setLoc] = useState(null); // null = near home ("near me")
  const [recentLocs, setRecentLocs] = useState([]);
  const [locModal, setLocModal] = useState(false);
  const [locInput, setLocInput] = useState("");
  const [swipes, setSwipes] = useState({}); // ideaId -> "yes" | "no" (parent taste, weak signal)
  const [deckOpen, setDeckOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const s = JSON.parse(res.value);
          if (s.baby) setBaby(s.baby);
          if (s.visits) setVisits(s.visits);
          if (s.saved) setSaved(s.saved);
          if (s.loc !== undefined) setLoc(s.loc);
          if (s.recentLocs) setRecentLocs(s.recentLocs);
          if (s.swipes) setSwipes(s.swipes);
        }
      } catch (e) { /* first run */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (tab !== "memories") return;
    (async () => {
      for (const v of visits) {
        if (v.photoCount > 0 && !photosByVisit[v.id]) {
          try {
            const res = await window.storage.get("lr-photos:" + v.id);
            if (res && res.value) setPhotosByVisit((m) => ({ ...m, [v.id]: JSON.parse(res.value) }));
          } catch (err) { /* photos missing — visit still shows */ }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, visits]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify({ baby, visits, saved, loc, recentLocs, swipes })); }
      catch (e) { console.error("Save failed", e); }
    })();
  }, [baby, visits, saved, loc, recentLocs, swipes, loaded]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 3400); };

  const months = baby ? monthsBetween(baby.birthdate) : null;
  const band = months != null ? bandFor(months) : null;

  const rated = visits.filter((v) => v.rating);
  const pendingVisits = visits.filter((v) => !v.rating && v.kind !== "journal");

  const catStats = useMemo(() => {
    const m = {};
    for (const v of rated) {
      if (!m[v.cat]) m[v.cat] = { loved: 0, fine: 0, nope: 0, total: 0 };
      m[v.cat][v.rating] += 1; m[v.cat].total += 1;
    }
    return m;
  }, [rated]);

  const lovedCats = Object.entries(catStats).filter(([, s]) => s.loved >= 2).map(([c]) => c);
  const pausedCats = Object.entries(catStats).filter(([, s]) => s.total >= 2 && s.loved === 0 && s.nope >= 1).map(([c]) => c);

  const staleness = useMemo(() => {
    const recent = rated.slice(0, 8);
    if (recent.length < 5) return null;
    const counts = {};
    for (const v of recent) counts[v.ideaId] = (counts[v.ideaId] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top[1] / recent.length >= 0.5) {
      const idea = IDEAS.find((i) => i.id === top[0]);
      return { name: idea ? idea.name : top[0], count: top[1], of: recent.length };
    }
    return null;
  }, [rated]);

  const retryIdeas = useMemo(() => {
    if (months == null) return [];
    return IDEAS.filter((idea) => {
      const past = rated.filter((v) => v.ideaId === idea.id);
      if (!past.length) return false;
      const last = past[0];
      const monthsAgo = (Date.now() - last.ts) / (1000 * 60 * 60 * 24 * 30);
      return last.rating === "nope" && monthsAgo >= 2 && months >= idea.ageMin;
    }).map((i) => i.id);
  }, [rated, months]);

  /* -------- Affordance engine: the map does the ranking -------- */
  function devScore(idea) {
    if (!band) return 0;
    let s = 0;
    for (const a of idea.aff) if (band.wants[a]) s += band.wants[a];
    return s;
  }
  function matchedAffordances(idea) {
    if (!band) return [];
    return idea.aff.filter((a) => band.wants[a]).sort((a, b) => band.wants[b] - band.wants[a]).slice(0, 3);
  }
  function score(idea, avail) {
    if (months == null || months < idea.ageMin) return -100;
    let s = devScore(idea);                              // developmental fit (0–10ish)
    if (lovedCats.includes(idea.cat)) s += 4;            // her observed loves
    if (pausedCats.includes(idea.cat)) s -= 5;           // her observed nopes
    if (!rated.some((v) => v.ideaId === idea.id)) s += 2; // novelty
    if (visits.slice(0, 4).some((v) => v.ideaId === idea.id)) s -= 3; // anti-samey (counts unrated too)
    if (visits[0] && visits[0].ideaId === idea.id) s -= 6;              // variety: last outing never leads again
    if (swipes[idea.id] === "yes") s += 2;                              // parent-taste, weak
    if (swipes[idea.id] === "no") s -= 2;                               // weak negative, never a ban
    if (retryIdeas.includes(idea.id)) s += 2;            // developmental retry
    s *= avail.rank <= 0 ? 0 : avail.rank;               // AVAILABILITY GATE
    if (avail.rank <= 0) s = -50;
    return s;
  }

  const now = new Date();
  const ranked = useMemo(() => {
    return IDEAS.map((idea) => {
      const avail = availability(idea, now);
      return { idea, avail, s: score(idea, avail), fit: fitFor(idea) };
    }).sort((a, b) => b.s - a.s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, rated, visits, swipes, lovedCats, pausedCats, retryIdeas, tab]);

  function fitFor(idea) {
    if (months == null) return { key: "great", label: "—" };
    if (months < idea.ageMin) return { key: "later", label: idea.laterLabel || `Later — around ${Math.round((idea.ageMin / 12) * 2) / 2} yrs` };
    if (retryIdeas.includes(idea.id)) return { key: "retry", label: "Worth a retry" };
    if (pausedCats.includes(idea.cat)) return { key: "paused", label: "Resting this type" };
    if (lovedCats.includes(idea.cat)) return { key: "loves", label: `${baby.name} loves this` };
    return { key: "great", label: `Great at ${fmtAge(months)}` };
  }

  const goOut = (idea) => {
    setVisits((v) => [{ id: Date.now(), ideaId: idea.id, name: idea.name, cat: idea.cat, emoji: idea.emoji, ts: Date.now(), rating: null, note: "", loc: loc }, ...v]);
    showToast("Visit logged — no typing needed. Check in tonight if you feel like it.");
  };
  const applyLoc = (label) => {
    const clean = label.trim();
    if (!clean) return;
    setLoc(clean);
    setRecentLocs((r) => [clean, ...r.filter((x) => x !== clean)].slice(0, 5));
    setLocModal(false); setLocInput("");
    showToast(`Exploring near ${clean}. Tap the pin anytime to come back home.`);
  };
  const toggleSave = (idea) => setSaved((s) => (s.includes(idea.id) ? s.filter((x) => x !== idea.id) : [...s, idea.id]));
  const handlePickPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - checkInPhotos.length);
    try {
      const imgs = [];
      for (const f of files) imgs.push(await compressImage(f));
      setCheckInPhotos((prev) => [...prev, ...imgs].slice(0, 6));
    } catch (err) { showToast("Couldn't read that photo — try another?"); }
    e.target.value = "";
  };
  const submitCheckIn = async (rating) => {
    const id = checkInFor.id;
    const nPhotos = checkInPhotos.length;
    setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, rating, note: checkInNote, place: checkInPlace.trim() || null, photoCount: nPhotos } : v)));
    if (nPhotos > 0) {
      try {
        await window.storage.set("lr-photos:" + id, JSON.stringify(checkInPhotos));
        setPhotosByVisit((m) => ({ ...m, [id]: checkInPhotos }));
      } catch (err) { showToast("Photos couldn't save (storage limit) — the visit itself is saved."); }
    }
    setCheckInFor(null); setCheckInNote(""); setCheckInPlace(""); setCheckInPhotos([]);
    showToast(rating === "loved" ? `Saved to ${baby.name}'s story. Noted — more like this.` : rating === "nope" ? "Saved. Resting this type; I'll flag a retry when she's ready." : `Saved to ${baby.name}'s story.`);
  };
  const dismissPending = (visit) => setVisits((vs) => vs.filter((v) => v.id !== visit.id));
  const loadPhotos = async (id) => {
    try { const r = await window.storage.get("lr-photos:" + id); return r && r.value ? JSON.parse(r.value) : []; }
    catch (e) { return []; }
  };
  const snapPhoto = async (visit, e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const img = await compressImage(f);
      const existing = photosByVisit[visit.id] || (visit.photoCount ? await loadPhotos(visit.id) : []);
      const arr = [...existing, img].slice(0, 6);
      await window.storage.set("lr-photos:" + visit.id, JSON.stringify(arr));
      setPhotosByVisit((m) => ({ ...m, [visit.id]: arr }));
      setVisits((vs) => vs.map((v) => (v.id === visit.id ? { ...v, photoCount: arr.length } : v)));
      showToast("Snapped into the journal 📸 (" + arr.length + "/6)");
    } catch (err) { showToast("Couldn't save that one — try again?"); }
  };
  const handleJournalPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - journalPhotos.length);
    try {
      const imgs = [];
      for (const f of files) imgs.push(await compressImage(f));
      setJournalPhotos((prev) => [...prev, ...imgs].slice(0, 6));
    } catch (err) { showToast("Couldn't read that photo — try another?"); }
    e.target.value = "";
  };
  const saveJournal = async () => {
    const id = Date.now();
    const entry = { id, kind: "journal", ts: id, note: journalText.trim(), photoCount: journalPhotos.length, emoji: "✍️", name: "Journal" };
    setVisits((vs) => [entry, ...vs]);
    if (journalPhotos.length) {
      try { await window.storage.set("lr-photos:" + id, JSON.stringify(journalPhotos)); setPhotosByVisit((m) => ({ ...m, [id]: journalPhotos })); }
      catch (err) { showToast("Photos couldn't save — the note itself is saved."); }
    }
    setJournalOpen(false); setJournalText(""); setJournalPhotos([]);
    showToast("Saved to the story ✍️");
  };
  const openEdit = async (v) => {
    const ph = photosByVisit[v.id] || (v.photoCount ? await loadPhotos(v.id) : []);
    if (ph.length && !photosByVisit[v.id]) setPhotosByVisit((m) => ({ ...m, [v.id]: ph }));
    setEditPhotos(ph); setEditPlace(v.place || ""); setEditNote(v.note || ""); setEditRating(v.rating || null);
    setConfirmDel(false); setEditFor(v);
  };
  const handleEditPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - editPhotos.length);
    try {
      const imgs = [];
      for (const f of files) imgs.push(await compressImage(f));
      setEditPhotos((prev) => [...prev, ...imgs].slice(0, 6));
    } catch (err) { showToast("Couldn't read that photo — try another?"); }
    e.target.value = "";
  };
  const removeEditPhoto = (i) => setEditPhotos((prev) => prev.filter((_, idx) => idx !== i));
  const saveEdit = async () => {
    const id = editFor.id;
    const isJournal = editFor.kind === "journal";
    setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, note: editNote.trim(), place: isJournal ? v.place : (editPlace.trim() || null), rating: isJournal ? v.rating : editRating, photoCount: editPhotos.length } : v)));
    try {
      if (editPhotos.length) await window.storage.set("lr-photos:" + id, JSON.stringify(editPhotos));
      else await window.storage.delete("lr-photos:" + id);
    } catch (err) { /* delete on missing key etc. */ }
    setPhotosByVisit((m) => { const n = { ...m }; if (editPhotos.length) n[id] = editPhotos; else delete n[id]; return n; });
    setEditFor(null); setConfirmDel(false);
    showToast("Memory updated ✏️");
  };
  const deleteEntry = async () => {
    const id = editFor.id;
    setVisits((vs) => vs.filter((v) => v.id !== id));
    try { await window.storage.delete("lr-photos:" + id); } catch (err) {}
    setPhotosByVisit((m) => { const n = { ...m }; delete n[id]; return n; });
    setEditFor(null); setConfirmDel(false);
    showToast("Memory deleted.");
  };
  const openCheckIn = async (pv) => {
    const existing = photosByVisit[pv.id] || (pv.photoCount ? await loadPhotos(pv.id) : []);
    setCheckInPhotos(existing);
    setCheckInPlace(pv.place || "");
    setCheckInNote(pv.note || "");
    setCheckInFor(pv);
  };
  const pinVisit = (visit) => {
    if (!navigator.geolocation) { showToast("Location isn't available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVisits((vs) => vs.map((v) => (v.id === visit.id ? { ...v, pin: { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) } } : v)));
        showToast("Pinned 📍 Even if you forget the name, the map won't.");
      },
      () => showToast("Heads up: the chat preview blocks location (platform limit, not your settings). Pinning goes live in the Phase 2 installed app — everything else about this visit still works."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const resetAll = async () => {
    setBaby(null); setVisits([]); setSaved([]); setEditingProfile(false); setTab("today");
    try { await window.storage.delete(STORAGE_KEY); } catch (e) {}
  };

  if (!loaded) return (<div className="lr-root"><style>{css}</style><div className="phone center-all"><p className="loading">〰️</p></div></div>);

  if (!baby || editingProfile) {
    return (<div className="lr-root"><style>{css}</style><div className="phone">
      <Onboarding existing={editingProfile ? baby : null}
        onDone={(b) => { setBaby(b); setEditingProfile(false); }}
        onReset={editingProfile ? resetAll : null}
        onCancel={editingProfile ? () => setEditingProfile(false) : null} />
    </div></div>);
  }

  const openRanked = ranked.filter((r) => r.s > 0);
  // Category-diverse Today list: the visible top-4 spans distinct categories; backfill only if needed
  const diverseToday = [];
  const usedCats = new Set();
  for (const r of openRanked) { if (!usedCats.has(r.idea.cat)) { diverseToday.push(r); usedCats.add(r.idea.cat); } if (diverseToday.length >= 4) break; }
  for (const r of openRanked) { if (diverseToday.length >= 4) break; if (!diverseToday.includes(r)) diverseToday.push(r); }
  const hero = diverseToday[0];
  const deckIdeas = ranked.filter((r) => months != null && months >= r.idea.ageMin && swipes[r.idea.id] === undefined);
  const memEntries = visits.filter((v) => v.rating || v.kind === "journal");
  const memQ = memSearch.trim().toLowerCase();
  const memFiltered = memEntries.filter((v) => {
    if (memFilter === "loved" && v.rating !== "loved") return false;
    if (memFilter === "photos" && !(v.photoCount > 0)) return false;
    if (memQ && !(((v.place || "") + " " + (v.name || "") + " " + (v.note || "")).toLowerCase().includes(memQ))) return false;
    return true;
  });
  const gridPhotos = memFiltered.flatMap((v) => (photosByVisit[v.id] || []).map((src) => ({ src, label: (v.place || v.name || "Journal") + " · " + fmtDate(v.ts) })));
  const doSwipe = (dir) => {
    const cur = deckIdeas[0];
    if (!cur) return;
    setSwipes((sw) => ({ ...sw, [cur.idea.id]: dir }));
    if (dir === "yes") setSaved((sv) => (sv.includes(cur.idea.id) ? sv : [...sv, cur.idea.id]));
  };
  const filtered = ranked.filter(({ idea, avail }) => {
    if (filter === "rainy") return idea.tags.includes("rainy") || idea.tags.includes("indoor");
    if (filter === "free") return idea.tags.includes("free");
    if (filter === "new") return !rated.some((v) => v.ideaId === idea.id);
    if (filter === "opennow") return avail.status === "open" || avail.status === "closing";
    return true;
  });

  return (
    <div className="lr-root">
      <style>{css}</style>
      <div className="phone">
        <header className="hdr">
          <div className="hdr-brand"><span className="hdr-logo">〰️</span><span className="hdr-name">Little Rambles</span><span className="ver">v0.13</span></div>
          <button className="hdr-baby" onClick={() => setEditingProfile(true)}>{baby.name} · {fmtAge(months)}</button>
        </header>

        <main className="scroll">
          {tab === "today" && (
            <div className="pad">
              <p className="greeting">{timeGreeting()}</p>
              <button className={"loc-pill" + (loc ? " loc-on" : "")} onClick={() => setLocModal(true)}>📍 {loc ? `Near ${loc}` : "Near home"}</button>
              {band && <p className="band-note">{band.theme}</p>}

              {pendingVisits.map((pv) => (
                <div className="card pending-card" key={pv.id}>
                  <div className="eyebrow">Recent outing · {fmtDate(pv.ts)}</div>
                  <h2 className="card-title">{pv.emoji} {pv.name}</h2>
                  <p className="why">How did it go? One tap — or skip it, no guilt.</p>
                  {photosByVisit[pv.id] && photosByVisit[pv.id].length > 0 && (
                    <div className="photo-strip">{photosByVisit[pv.id].map((ph, i) => (<img key={i} src={ph} className="photo-img" alt="" />))}</div>
                  )}
                  <div className="btn-row">
                    <button className="primary small" onClick={() => openCheckIn(pv)}>Check in</button>
                    <label className="ghost small snap-btn">📸 Snap
                      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => snapPhoto(pv, e)} />
                    </label>
                    {pv.pin ? <span className="pin-ok">📍 Pinned</span> : <button className="ghost small" onClick={() => pinVisit(pv)}>📍 Pin where we are</button>}
                    <button className="ghost small" onClick={() => dismissPending(pv)}>Didn't go</button>
                  </div>
                </div>
              ))}

              {hero ? (
                <div className="card hero-card">
                  <CardArt idea={hero.idea} variant="hero" />
                  <div className="hero-top">
                    <div className="eyebrow accent-text">Right now</div>
                    <AvailChip avail={hero.avail} />
                  </div>
                  <h2 className="card-title">{hero.idea.emoji} {hero.idea.name}</h2>
                  <p className="why">{hero.idea.why}</p>
                  <div className="aff-row">{matchedAffordances(hero.idea).map((a) => (<span className="aff" key={a}>{AFFORDANCE_LABELS[a]}</span>))}</div>
                  {hero.fit.key === "loves" && <p className="dev-note">This type keeps winning with {baby.name} — worth riding the streak.</p>}
                  {hero.fit.key === "retry" && <p className="dev-note">A "not today" a while back — she's grown a lot since. Worth another shot.</p>}
                  <div className="btn-row">
                    <a className="primary link-btn" href={mapsUrl(hero.idea.mapsQuery, loc)} target="_blank" rel="noreferrer" onClick={() => goOut(hero.idea)}>Let's go · open Maps</a>
                    <button className="ghost" onClick={() => toggleSave(hero.idea)}>{saved.includes(hero.idea.id) ? "Saved ✓" : "Save"}</button>
                  </div>
                </div>
              ) : (
                <div className="card empty-card"><p className="why">It's late — most places are done for today. Tomorrow's list is ready when you are. 🌙</p></div>
              )}

              <div className="section-label">Also good right now</div>
              {diverseToday.slice(1, 4).map(({ idea, avail, fit }) => (
                <IdeaCard key={idea.id} idea={idea} fit={fit} avail={avail} affs={matchedAffordances(idea)} onGo={goOut} onSave={toggleSave} savedList={saved} loc={loc} compact />
              ))}

              {rated.length === 0 && (
                <div className="nudge"><span className="nudge-emoji">🌱</span><p>Day one: this list is ranked by what {baby.name} is developmentally hungry for at {fmtAge(months)} — and pre-filtered to what's actually open. Each outing teaches it what she loves.</p></div>
              )}
              {rated.length < 3 && (
                <button className="deck-launch" onClick={() => setDeckOpen(true)}>💫 Quick picks — swipe through ideas for {baby.name}</button>
              )}
              {staleness && (
                <div className="nudge"><span className="nudge-emoji">🔁</span><p>{staleness.name} has been {staleness.count} of your last {staleness.of} outings — totally fine, but fresh options are ranked up top.</p></div>
              )}
            </div>
          )}

          {tab === "explore" && (
            <div className="pad">
              <button className={"loc-pill" + (loc ? " loc-on" : "")} onClick={() => setLocModal(true)}>📍 {loc ? `Near ${loc}` : "Near home"}</button>
              <button className="deck-launch" onClick={() => setDeckOpen(true)}>💫 Quick picks — swipe through ideas</button>
              <div className="chips">
                {[["all", "All"], ["opennow", "Open now"], ["rainy", "Rainy day"], ["free", "Free"], ["new", "New to you"]].map(([k, l]) => (
                  <button key={k} className={"chip" + (filter === k ? " chip-on" : "")} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              {filtered.map(({ idea, avail, fit }) => (
                <IdeaCard key={idea.id} idea={idea} fit={fit} avail={avail} affs={matchedAffordances(idea)} onGo={goOut} onSave={toggleSave} savedList={saved} loc={loc} />
              ))}
              <div className="timeline-box">
                <div className="section-label">Coming up as {baby.name} grows</div>
                {BANDS.filter((b) => b.min > (months || 0)).slice(0, 3).map((b) => (
                  <div className="tl-item" key={b.min}><span className="tl-age">{b.min}–{b.max} mo</span><span>{b.theme}</span></div>
                ))}
              </div>
            </div>
          )}

          {tab === "memories" && (
            <div className="pad">
              <div className="mem-stats">
                <div className="stat"><b>{rated.length}</b><span>outings</span></div>
                <div className="stat"><b>{new Set(rated.map((v) => v.place || v.name)).size}</b><span>places</span></div>
                <div className="stat"><b>{visits.reduce((n, v) => n + (v.photoCount || 0), 0)}</b><span>photos</span></div>
                <div className="stat"><b>{memEntries.length ? fmtDate(memEntries[memEntries.length - 1].ts) : "—"}</b><span>since</span></div>
              </div>
              <button className="deck-launch" onClick={() => setJournalOpen(true)}>✍️ Write a moment — anything worth remembering today</button>
              <div className="chips">
                <button className={"chip" + (memView === "story" ? " chip-on" : "")} onClick={() => setMemView("story")}>Story</button>
                <button className={"chip" + (memView === "grid" ? " chip-on" : "")} onClick={() => setMemView("grid")}>Photos</button>
                <button className={"chip" + (memFilter === "loved" ? " chip-on" : "")} onClick={() => setMemFilter(memFilter === "loved" ? "all" : "loved")}>😍 Loved</button>
                <button className={"chip" + (memFilter === "photos" ? " chip-on" : "")} onClick={() => setMemFilter(memFilter === "photos" ? "all" : "photos")}>📷 Photos</button>
              </div>
              <input className="note-input" placeholder="Search places, notes…" value={memSearch} onChange={(e) => setMemSearch(e.target.value)} />

              {memView === "story" && rated.length >= 2 && (
                <div className="insights">
                  <div className="section-label">What the log is learning</div>
                  {lovedCats.map((c) => (<div className="insight up" key={c}><span>💛</span><p><b>Working well:</b> {c} outings — {catStats[c].loved} "loved it". Leaning suggestions this way.</p></div>))}
                  {staleness && (<div className="insight warn"><span>🔁</span><p><b>Getting samey:</b> {staleness.name} was {staleness.count} of your last {staleness.of}. Fresh ideas queued in Explore.</p></div>)}
                  {pausedCats.map((c) => (<div className="insight pause" key={c}><span>⏸️</span><p><b>Resting:</b> {c} outings — not landing right now. I'll flag a retry as she grows.</p></div>))}
                  {lovedCats.length === 0 && !staleness && pausedCats.length === 0 && (<div className="insight pause"><span>🌱</span><p>Patterns show up after a few rated outings. Keep rambling.</p></div>)}
                </div>
              )}

              {memView === "story" ? (
                <div>
                  <div className="section-label">{baby.name}'s story</div>
                  {memFiltered.length === 0 && (
                    <div className="card empty-card"><p className="why">{memEntries.length === 0 ? "Nothing here yet — and that's the point. This page writes itself from taps you barely notice making." : "No memories match that filter — try clearing it."}</p></div>
                  )}
                  {memFiltered.map((v) => (
                    <div key={v.id} className={"mem" + (v.kind === "journal" ? " mem-journal" : "")}>
                      <div className="mem-head">
                        <span className="mem-date">{fmtDate(v.ts)}</span>
                        <div className="mem-head-right">
                          {v.kind === "journal" ? <span className="mem-rating r-journal">✍️ Journal</span> : (v.rating ? <span className={"mem-rating " + RATING_META[v.rating].cls}>{RATING_META[v.rating].emoji} {RATING_META[v.rating].label}</span> : null)}
                          <button className="edit-btn" onClick={() => openEdit(v)}>✏️</button>
                        </div>
                      </div>
                      {v.kind !== "journal" && (
                        <div className="mem-venue">{v.emoji} {v.place || v.name}{v.place ? <span className="mem-loc"> · {v.name}</span> : null}{v.loc ? <span className="mem-loc"> · near {v.loc}</span> : null}{v.pin ? <a className="mem-loc pin-link" href={"https://www.google.com/maps/search/?api=1&query=" + v.pin.lat + "," + v.pin.lng} target="_blank" rel="noreferrer"> · 📍 map</a> : null}</div>
                      )}
                      {v.note ? <div className={v.kind === "journal" ? "mem-journal-text" : "mem-note"}>{v.kind === "journal" ? v.note : '"' + v.note + '"'}</div> : null}
                      {photosByVisit[v.id] && (
                        <div className="photo-strip">{photosByVisit[v.id].map((ph, i) => (
                          <button key={i} className="thumb-btn" onClick={() => setLightbox({ src: ph, label: (v.place || v.name || "Journal") + " · " + fmtDate(v.ts) })}><img src={ph} className="photo-img" alt="" /></button>
                        ))}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="section-label">Every photo, one place</div>
                  {gridPhotos.length === 0 ? (
                    <div className="card empty-card"><p className="why">No photos match — 📸 Snap on your next outing and this page becomes her album.</p></div>
                  ) : (
                    <div className="photo-grid">
                      {gridPhotos.map((g, i) => (<button key={i} className="grid-cell" onClick={() => setLightbox(g)}><img src={g.src} alt="" /></button>))}
                    </div>
                  )}
                </div>
              )}
              <p className="fineprint center">Tap "{baby.name} · {fmtAge(months)}" up top to edit her profile.</p>
            </div>
          )}
        </main>

        <nav className="tabs">
          {[["today", "Today"], ["explore", "Explore"], ["memories", "Memories"]].map(([key, label]) => (
            <button key={key} className={"tab" + (tab === key ? " tab-on" : "")} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>

        {deckOpen && (
          <div className="modal-bg deck-bg" onClick={() => setDeckOpen(false)}>
            <div className="deck-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">Quick picks · swipe or tap</div>
              {deckIdeas.length > 0 ? (
                <div>
                  <div
                    className="deck-card"
                    style={{ transform: `translateX(${dragX}px) rotate(${dragX / 14}deg)`, transition: dragStart.current == null ? "transform .18s" : "none" }}
                    onPointerDown={(e) => { dragStart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => { if (dragStart.current != null) setDragX(e.clientX - dragStart.current); }}
                    onPointerUp={() => { const x = dragX; dragStart.current = null; setDragX(0); if (x > 70) doSwipe("yes"); else if (x < -70) doSwipe("no"); }}
                  >
                    <CardArt idea={deckIdeas[0].idea} variant="deck" />
                    <h3 className="deck-name">{deckIdeas[0].idea.name}</h3>
                    <div className="chip-line" style={{ justifyContent: "center" }}>
                      <AvailChip avail={deckIdeas[0].avail} />
                      {matchedAffordances(deckIdeas[0].idea).map((a) => (<span className="aff" key={a}>{AFFORDANCE_LABELS[a]}</span>))}
                    </div>
                    <p className="why" style={{ textAlign: "center" }}>{deckIdeas[0].idea.why}</p>
                  </div>
                  <div className="deck-btns">
                    <button className="deck-no" onClick={() => doSwipe("no")}>👋 Not for us</button>
                    <button className="deck-yes" onClick={() => doSwipe("yes")}>💛 Save it</button>
                  </div>
                  <p className="fineprint center">Swipes tune what you see. {baby.name}'s real reactions after outings always count more.</p>
                </div>
              ) : (
                <div className="deck-empty">
                  <p className="why" style={{ textAlign: "center" }}>That's everyone for now — new ideas appear as {baby.name} grows.</p>
                  <button className="ghost small" onClick={() => setSwipes({})}>Restart the deck</button>
                </div>
              )}
              <button className="ghost full mt8" onClick={() => setDeckOpen(false)}>Done</button>
            </div>
          </div>
        )}

        {editFor && (
          <div className="modal-bg" onClick={() => { setEditFor(null); setConfirmDel(false); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">✏️ Edit memory · {fmtDate(editFor.ts)}</div>
              {editFor.kind !== "journal" && (
                <input className="note-input" placeholder={'Which place? e.g. "Jump Gym Kitsilano"'} value={editPlace} onChange={(e) => setEditPlace(e.target.value)} />
              )}
              <textarea className="note-input journal-area" placeholder={editFor.kind === "journal" ? "Your moment…" : "Notes about this outing…"} value={editNote} onChange={(e) => setEditNote(e.target.value)} />
              <label className="photo-pick">📷 Add photos ({editPhotos.length}/6)
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleEditPhotos} />
              </label>
              {editPhotos.length > 0 && (
                <div className="photo-strip">{editPhotos.map((ph, i) => (
                  <button key={i} className="thumb-btn del-thumb" onClick={() => removeEditPhoto(i)}><img src={ph} className="photo-img" alt="" /><span className="thumb-x">✕</span></button>
                ))}</div>
              )}
              {editFor.kind !== "journal" && (
                <div className="rate-row">
                  {Object.entries(RATING_META).map(([key, m]) => (
                    <button key={key} className={"rate-btn " + m.cls + (editRating === key ? " rate-on" : "")} onClick={() => setEditRating(key)}>
                      <span className="rate-emoji">{m.emoji}</span><span>{m.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="primary full" onClick={saveEdit}>Save changes</button>
              <button className="danger-link" onClick={() => (confirmDel ? deleteEntry() : setConfirmDel(true))}>{confirmDel ? "⚠️ Tap again to delete forever" : "Delete this memory"}</button>
              <button className="ghost full mt8" onClick={() => { setEditFor(null); setConfirmDel(false); }}>Cancel</button>
            </div>
          </div>
        )}

        {journalOpen && (
          <div className="modal-bg" onClick={() => setJournalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">✍️ A moment for the story</div>
              <textarea className="note-input journal-area" placeholder="What happened? First words, tiny victories, hard days — it all counts." value={journalText} onChange={(e) => setJournalText(e.target.value)} />
              <label className="photo-pick">📷 Add photos ({journalPhotos.length}/6)
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleJournalPhotos} />
              </label>
              {journalPhotos.length > 0 && (<div className="photo-strip">{journalPhotos.map((ph, i) => (<img key={i} src={ph} className="photo-img" alt="" />))}</div>)}
              <button className="primary full" disabled={!journalText.trim() && journalPhotos.length === 0} onClick={saveJournal}>Save to {baby.name}'s story</button>
              <button className="ghost full mt8" onClick={() => setJournalOpen(false)}>Not now</button>
            </div>
          </div>
        )}

        {lightbox && (
          <div className="modal-bg lightbox" onClick={() => setLightbox(null)}>
            <div className="lightbox-wrap">
              <img src={lightbox.src} alt="" />
              <p className="lightbox-label">{lightbox.label}</p>
            </div>
          </div>
        )}

        {locModal && (
          <div className="modal-bg" onClick={() => setLocModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">Where are you rambling today?</div>
              <h3 className="modal-title">Set a spot</h3>
              <p className="why">Appointment across town? Visiting grandma? Type an address, neighbourhood, or landmark — every "Let's go" will search near there instead.</p>
              <input className="note-input" placeholder="e.g. 4500 Oak St, or Metrotown" value={locInput} onChange={(e) => setLocInput(e.target.value)} />
              <button className="primary full" onClick={() => applyLoc(locInput)}>Explore near there</button>
              {recentLocs.length > 0 && (
                <div>
                  <div className="section-label">Recent spots</div>
                  <div className="chips">
                    {recentLocs.map((r) => (<button key={r} className="chip" onClick={() => applyLoc(r)}>{r}</button>))}
                  </div>
                </div>
              )}
              {loc && <button className="ghost full mt8" onClick={() => { setLoc(null); setLocModal(false); showToast("Back to exploring near home."); }}>Back to near home</button>}
            </div>
          </div>
        )}

        {checkInFor && (
          <div className="modal-bg" onClick={() => setCheckInFor(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-eyebrow">Quick check-in</div>
              <h3 className="modal-title">How was {checkInFor.name}?</h3>
              <input className="note-input" placeholder={'Which place? e.g. "Jump Gym Kitsilano" (optional)'} value={checkInPlace} onChange={(e) => setCheckInPlace(e.target.value)} />
              <label className="photo-pick">📷 Add photos ({checkInPhotos.length}/6)
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePickPhotos} />
              </label>
              {checkInPhotos.length > 0 && (<div className="photo-strip">{checkInPhotos.map((ph, i) => (<img key={i} src={ph} className="photo-img" alt="" />))}</div>)}
              <input className="note-input" placeholder="Anything worth remembering? (optional)" value={checkInNote} onChange={(e) => setCheckInNote(e.target.value)} />
              <div className="rate-label">How did it go? — tapping saves everything above</div>
              <div className="rate-row">
                {Object.entries(RATING_META).map(([key, m]) => (
                  <button key={key} className={"rate-btn " + m.cls} onClick={() => submitCheckIn(key)}>
                    <span className="rate-emoji">{m.emoji}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
              <button className="ghost small" onClick={() => setCheckInFor(null)}>Not now</button>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

/* ------------------------- Pieces ------------------------------ */
const CATEGORY_ART = {
  water: { photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&q=70&auto=format&fit=crop", c1: "#AEE0EF", c2: "#7FB0C4", shapes: (<g><circle cx="272" cy="26" r="26" fill="#F6D690" opacity="0.35" /><circle cx="272" cy="26" r="16" fill="#E9A23B" /><ellipse cx="60" cy="20" rx="26" ry="9" fill="#FFFFFF" opacity="0.7" /><ellipse cx="84" cy="24" rx="20" ry="8" fill="#FFFFFF" opacity="0.55" /><path d="M0,60 Q30,50 60,60 T120,60 T180,60 T240,60 T320,60 V100 H0 Z" fill="#8FC3D6" opacity="0.8" /><path d="M0,72 Q30,63 60,72 T120,72 T180,72 T240,72 T320,72 V100 H0 Z" fill="#FFFFFF" opacity="0.5" /><path d="M0,84 Q30,76 60,84 T120,84 T180,84 T240,84 T320,84 V100 H0 Z" fill="#FFFFFF" opacity="0.7" /><circle cx="150" cy="52" r="2" fill="#FFFFFF" /><circle cx="196" cy="46" r="1.6" fill="#FFFFFF" opacity="0.8" /><circle cx="120" cy="44" r="1.5" fill="#FFFFFF" opacity="0.7" /></g>) },
  stories: { photo: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=640&q=70&auto=format&fit=crop", c1: "#F7ECD9", c2: "#E3C9A0", shapes: (<g><circle cx="250" cy="40" r="34" fill="#F6D690" opacity="0.45" /><rect x="222" y="60" width="60" height="10" rx="3" fill="#A14E33" /><rect x="228" y="50" width="52" height="10" rx="3" fill="#2F5138" /><rect x="234" y="40" width="44" height="10" rx="3" fill="#33606F" /><path d="M236,36 Q252,28 252,36 Q252,28 268,36 L268,40 Q252,33 236,40 Z" fill="#FFFFFF" /><circle cx="210" cy="28" r="1.8" fill="#E9A23B" /><circle cx="292" cy="22" r="1.5" fill="#E9A23B" opacity="0.8" /><circle cx="276" cy="58" r="1.5" fill="#E9A23B" opacity="0.6" /><circle cx="60" cy="26" r="2" fill="#FFFFFF" opacity="0.8" /></g>) },
  music: { photo: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&q=70&auto=format&fit=crop", c1: "#F8E3DC", c2: "#E3A797", shapes: (<g><circle cx="258" cy="46" r="14" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" /><circle cx="258" cy="46" r="24" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" /><circle cx="258" cy="46" r="34" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.25" /><circle cx="236" cy="58" r="7" fill="#29382F" /><rect x="241.5" y="26" width="3.5" height="32" rx="1.5" fill="#29382F" /><circle cx="284" cy="52" r="7" fill="#29382F" /><rect x="289.5" y="22" width="3.5" height="30" rx="1.5" fill="#29382F" /><path d="M241.5,26 Q268,18 293,22 L293,30 Q268,26 241.5,34 Z" fill="#29382F" /><circle cx="206" cy="30" r="2.5" fill="#E9A23B" /><circle cx="300" cy="70" r="2.5" fill="#8FB3C0" /><rect x="216" y="66" width="6" height="6" rx="1.5" fill="#8FB3C0" transform="rotate(20 219 69)" /></g>) },
  animals: { photo: "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=640&q=70&auto=format&fit=crop", c1: "#E9F1E4", c2: "#AFC9A8", shapes: (<g><circle cx="286" cy="20" r="20" fill="#F6D690" opacity="0.4" /><circle cx="286" cy="20" r="12" fill="#E9A23B" /><ellipse cx="70" cy="118" rx="150" ry="52" fill="#9DBD9A" opacity="0.8" /><ellipse cx="270" cy="124" rx="150" ry="58" fill="#87A884" opacity="0.9" /><rect x="20" y="56" width="4" height="18" fill="#7A6A4F" opacity="0.7" /><rect x="44" y="56" width="4" height="18" fill="#7A6A4F" opacity="0.7" /><rect x="14" y="60" width="42" height="3.5" fill="#7A6A4F" opacity="0.7" /><circle cx="120" cy="82" r="2.5" fill="#FFFFFF" /><circle cx="150" cy="90" r="2.5" fill="#E5AFA3" /><circle cx="220" cy="86" r="2.5" fill="#FFFFFF" /><circle cx="250" cy="92" r="2.5" fill="#E9A23B" /><ellipse cx="90" cy="18" rx="24" ry="8" fill="#FFFFFF" opacity="0.7" /></g>) },
  nature: { photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=640&q=70&auto=format&fit=crop", c1: "#DDEBE0", c2: "#92B79F", shapes: (<g><polygon points="40,0 70,0 130,100 90,100" fill="#F6D690" opacity="0.25" /><polygon points="90,0 112,0 180,100 150,100" fill="#F6D690" opacity="0.18" /><polygon points="200,74 216,34 232,74" fill="#5F8A6E" opacity="0.6" /><polygon points="228,76 242,42 256,76" fill="#5F8A6E" opacity="0.5" /><polygon points="248,80 268,26 288,80" fill="#2F5138" opacity="0.92" /><rect x="265" y="80" width="6" height="10" fill="#7A6A4F" /><polygon points="286,82 302,40 318,82" fill="#2F5138" opacity="0.8" /><ellipse cx="160" cy="96" rx="200" ry="18" fill="#FFFFFF" opacity="0.4" /><circle cx="48" cy="18" r="10" fill="#E9A23B" /><path d="M120,26 q4,-4 8,0 M132,22 q4,-4 8,0" stroke="#29382F" strokeWidth="1.6" fill="none" opacity="0.7" /></g>) },
  sensory: { photo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&q=70&auto=format&fit=crop", c1: "#FCEFD2", c2: "#F0CE8F", shapes: (<g><rect x="0" y="0" width="320" height="12" fill="#A14E33" opacity="0.85" /><path d="M0,12 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0 q10,10 20,0" fill="#A14E33" opacity="0.85" /><circle cx="230" cy="44" r="10" fill="#E9A23B" opacity="0.5" /><circle cx="258" cy="60" r="8" fill="#8FB3C0" opacity="0.5" /><circle cx="284" cy="38" r="7" fill="#E5AFA3" opacity="0.6" /><circle cx="304" cy="62" r="6" fill="#2F5138" opacity="0.35" /><rect x="206" y="66" width="8" height="8" rx="2" fill="#8FB3C0" transform="rotate(18 210 70)" /><rect x="240" y="26" width="8" height="8" rx="2" fill="#E5AFA3" transform="rotate(-14 244 30)" /></g>) },
  art: { photo: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=640&q=70&auto=format&fit=crop", c1: "#FFF6EF", c2: "#F0C9B8", shapes: (<g><circle cx="238" cy="44" r="18" fill="#E9A23B" opacity="0.85" /><circle cx="252" cy="60" r="6" fill="#E9A23B" opacity="0.7" /><circle cx="224" cy="62" r="4" fill="#E9A23B" opacity="0.6" /><circle cx="282" cy="62" r="14" fill="#8FB3C0" opacity="0.8" /><circle cx="294" cy="46" r="5" fill="#8FB3C0" opacity="0.6" /><circle cx="296" cy="28" r="9" fill="#2F5138" opacity="0.55" /><path d="M20,26 q40,14 90,4" stroke="#E5AFA3" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.7" /><rect x="234" y="58" width="5" height="18" rx="2.5" fill="#E9A23B" opacity="0.7" /></g>) },
  playground: { photo: "https://images.unsplash.com/photo-1547861749-0df4321e275e?w=640&q=70&auto=format&fit=crop", c1: "#E2F0F6", c2: "#A9C9D8", shapes: (<g><ellipse cx="70" cy="18" rx="26" ry="9" fill="#FFFFFF" opacity="0.85" /><ellipse cx="96" cy="23" rx="18" ry="7" fill="#FFFFFF" opacity="0.7" /><ellipse cx="200" cy="14" rx="20" ry="7" fill="#FFFFFF" opacity="0.6" /><circle cx="296" cy="18" r="11" fill="#E9A23B" /><ellipse cx="160" cy="112" rx="210" ry="30" fill="#9DBD9A" opacity="0.7" /><polygon points="226,84 262,34 272,40 242,84" fill="#E9A23B" /><rect x="260" y="32" width="6" height="52" rx="3" fill="#33606F" /><rect x="252" y="30" width="22" height="6" rx="3" fill="#33606F" /><path d="M120,30 q30,0 60,0" stroke="#33606F" strokeWidth="4" fill="none" /><rect x="132" y="30" width="3" height="34" fill="#33606F" /><rect x="162" y="30" width="3" height="34" fill="#33606F" /><rect x="128" y="63" width="41" height="5" rx="2.5" fill="#A14E33" /><circle cx="204" cy="82" r="7" fill="#E5AFA3" /></g>) },
  science: { photo: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=640&q=70&auto=format&fit=crop", c1: "#23342C", c2: "#16211C", shapes: (<g><circle cx="90" cy="30" r="30" fill="#8FB3C0" opacity="0.14" /><circle cx="120" cy="50" r="24" fill="#E5AFA3" opacity="0.10" /><circle cx="252" cy="42" r="18" fill="#E9A23B" /><path d="M222,46 a30,10 0 1,0 60,-8" fill="none" stroke="#F6F5EF" strokeWidth="3" opacity="0.85" /><circle cx="245" cy="36" r="4" fill="#C9821B" opacity="0.8" /><circle cx="40" cy="16" r="1.8" fill="#F6F5EF" /><circle cx="180" cy="12" r="1.4" fill="#F6F5EF" opacity="0.9" /><circle cx="304" cy="20" r="2" fill="#F6F5EF" /><circle cx="200" cy="70" r="1.4" fill="#F6F5EF" opacity="0.8" /><circle cx="300" cy="76" r="1.6" fill="#F6F5EF" opacity="0.9" /><circle cx="150" cy="34" r="1.2" fill="#F6F5EF" opacity="0.7" /><path d="M28,64 l26,-10" stroke="#F6F5EF" strokeWidth="2" strokeLinecap="round" opacity="0.7" /><circle cx="56" cy="53" r="2.4" fill="#F6F5EF" /></g>) },
};
function CardArt({ idea, variant }) {
  const art = CATEGORY_ART[idea.cat] || CATEGORY_ART.nature;
  const gid = "g" + idea.id + (variant || "c");
  const [photoOk, setPhotoOk] = useState(!!art.photo);
  if (art.photo && photoOk) {
    return (
      <div className={"card-art art-" + (variant || "card") + " photo-banner"}>
        <img src={art.photo} alt="" loading="lazy" onError={() => setPhotoOk(false)} />
        <span className="banner-emoji">{idea.emoji}</span>
      </div>
    );
  }
  return (
    <svg className={"card-art art-" + (variant || "card")} viewBox="0 0 320 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={art.c1} /><stop offset="1" stopColor={art.c2} /></linearGradient></defs>
      <rect width="320" height="100" fill={"url(#" + gid + ")"} />
      {art.shapes}
      <text x="24" y="76" fontSize="44">{idea.emoji}</text>
    </svg>
  );
}
function AvailChip({ avail }) {
  return <span className={"avail a-" + avail.status}>{avail.label}</span>;
}

function IdeaCard({ idea, fit, avail, affs, onGo, onSave, savedList, compact, loc }) {
  const later = fit.key === "later";
  const closed = avail.status === "closed";
  return (
    <div className={"card" + (compact ? " mini" : " venue-card") + (later || closed ? " dimmed" : "")}>
      <CardArt idea={idea} variant={compact ? "mini" : "card"} />
      <div className="venue-top">
        <h3 className="venue-name">{idea.emoji} {idea.name}</h3>
        <span className={"badge b-" + fit.key}>{fit.label}</span>
      </div>
      <div className="chip-line"><AvailChip avail={avail} />{!later && affs.map((a) => (<span className="aff" key={a}>{AFFORDANCE_LABELS[a]}</span>))}</div>
      <p className="why">{idea.why}</p>
      {later ? (
        <div className="later-note">On the timeline — it'll resurface when she's ready</div>
      ) : closed ? (
        <div className="btn-row"><button className="ghost small" onClick={() => onSave(idea)}>{savedList.includes(idea.id) ? "Saved ✓" : "Save for later"}</button></div>
      ) : (
        <div className="btn-row">
          <a className="primary small link-btn" href={mapsUrl(idea.mapsQuery, loc)} target="_blank" rel="noreferrer" onClick={() => onGo(idea)}>Let's go</a>
          <button className="ghost small" onClick={() => onSave(idea)}>{savedList.includes(idea.id) ? "Saved ✓" : "Save"}</button>
        </div>
      )}
    </div>
  );
}

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
      <button className="primary full" disabled={!valid} onClick={() => onDone({ name: name.trim(), birthdate, notes })}>{existing ? "Save changes" : "Start rambling"}</button>
      {onCancel && <button className="ghost full mt8" onClick={onCancel}>Cancel</button>}
      {onReset && <button className="danger-link" onClick={onReset}>Reset everything (erases all logs)</button>}
      <p className="fineprint center mt16">Stays on your account. No location tracking — the app only knows what you tap.</p>
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
.ver { font-size: 10.5px; font-weight: 700; color: #8A8875; background: #ECEAE0; border-radius: 999px; padding: 3px 7px; margin-left: 7px; }
.snap-btn { display: inline-flex; align-items: center; cursor: pointer; }
.pin-ok { font-size: 13px; font-weight: 700; color: #2F5138; align-self: center; padding: 0 4px; }
.pin-link { text-decoration: none; color: #33606F; font-weight: 700; }
.rate-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8A8875; margin: 4px 0 8px; }
.hdr-baby { font-size: 13px; font-weight: 700; color: #F6F5EF; background: #29382F; border-radius: 999px; padding: 5px 12px; border: none; cursor: pointer; font-family: 'Karla', sans-serif; }
.scroll { flex: 1; overflow-y: auto; padding-bottom: 76px; }
.pad { padding: 6px 18px 24px; }
.greeting { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 500; margin: 8px 0 6px; }
.band-note { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 14.5px; color: #5A6B60; margin: 0 0 16px; line-height: 1.45; }
.card { background: #FFFFFF; border: 1px solid #E3E1D6; border-radius: 18px; padding: 18px; margin-bottom: 14px; }
.hero-card { border: 2px solid #29382F; box-shadow: 4px 4px 0 #E9A23B; }
.hero-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.pending-card { border: 2px solid #8FB3C0; }
.empty-card { border-style: dashed; }
.eyebrow { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #8A8875; }
.accent-text { color: #C9821B; }
.card-title { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 600; margin: 6px 0 8px; line-height: 1.2; }
.why { font-size: 14.5px; line-height: 1.5; margin: 0 0 8px; color: #3D4A42; }
.dev-note { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 14px; color: #5A6B60; border-left: 3px solid #E9A23B; padding-left: 10px; margin: 10px 0 14px; }
.btn-row { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
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
.b-later { background: #ECEAE0; color: #7B7965; }
.dimmed { opacity: 0.75; }
.later-note { font-size: 13px; color: #7B7965; font-style: italic; }
.chip-line { display: flex; gap: 6px; flex-wrap: wrap; margin: 2px 0 8px; }
.avail { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 9px; white-space: nowrap; }
.a-open { background: #DDE8DC; color: #2F5138; }
.a-soon { background: #FBEAC9; color: #9A6410; }
.a-closing { background: #FBEAC9; color: #9A6410; }
.a-closed { background: #ECEAE0; color: #8A8875; }
.aff { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 9px; background: #F0EFE4; color: #5A6B60; white-space: nowrap; }
.card-art { display: block; }
.photo-banner { position: relative; overflow: hidden; }
.photo-banner img { width: 100%; height: 100%; object-fit: cover; display: block; }
.banner-emoji { position: absolute; left: 12px; bottom: 8px; font-size: 26px; background: rgba(246,245,239,0.88); border-radius: 999px; padding: 4px 9px; line-height: 1; }
.art-hero { width: calc(100% + 36px); margin: -18px -18px 12px; height: 112px; border-radius: 14px 14px 0 0; }
.art-card { width: calc(100% + 36px); margin: -18px -18px 10px; height: 84px; border-radius: 16px 16px 0 0; }
.art-mini { width: calc(100% + 32px); margin: -14px -16px 10px; height: 62px; border-radius: 16px 16px 0 0; }
.art-deck { width: calc(100% + 36px); margin: -26px -18px 12px; height: 112px; border-radius: 17px 17px 0 0; }
.nudge { display: flex; gap: 10px; background: #FBEAC9; border-radius: 14px; padding: 14px; margin-top: 14px; align-items: flex-start; }
.nudge p { margin: 0; font-size: 13.5px; line-height: 1.5; }
.nudge-emoji { font-size: 18px; }
.loc-pill { display: inline-flex; align-items: center; gap: 4px; background: #FFFFFF; border: 1.5px solid #DDDACB; border-radius: 999px; padding: 6px 13px; font-size: 13px; font-weight: 700; font-family: 'Karla', sans-serif; color: #4A554D; cursor: pointer; margin: 0 0 12px; }
.loc-pill.loc-on { background: #DEEAEF; border-color: #8FB3C0; color: #33606F; }
.mem-loc { font-family: 'Karla', sans-serif; font-size: 12.5px; font-weight: 400; color: #8A8875; }
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
.photo-strip { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.photo-img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; border: 1px solid #E3E1D6; }
.photo-pick { display: inline-block; border: 1.5px dashed #C9C6B4; border-radius: 12px; padding: 10px 14px; font-size: 13.5px; font-weight: 700; color: #4A554D; cursor: pointer; margin-bottom: 12px; font-family: 'Karla', sans-serif; background: #FFFFFF; }
.mem-stats { display: flex; gap: 8px; margin: 6px 0 12px; }
.stat { flex: 1; background: #FFFFFF; border: 1px solid #E3E1D6; border-radius: 14px; padding: 10px 4px; text-align: center; }
.stat b { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 16px; }
.stat span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8A8875; }
.mem-head-right { display: flex; align-items: center; gap: 6px; }
.edit-btn { border: none; background: #F0EFE4; border-radius: 8px; padding: 4px 7px; cursor: pointer; font-size: 13px; }
.del-thumb { position: relative; }
.thumb-x { position: absolute; top: -4px; right: -4px; background: #A14E33; color: #FFFFFF; border-radius: 999px; font-size: 10px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.rate-on { border-color: #29382F; background: #F0EFE4; }
.mem-journal { border-left: 4px solid #E9A23B; }
.r-journal { background: #FBEAC9; color: #9A6410; }
.mem-journal-text { font-family: 'Fraunces', Georgia, serif; font-size: 15px; line-height: 1.55; color: #3D4A42; }
.journal-area { min-height: 96px; resize: vertical; font-family: 'Karla', sans-serif; }
.photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
.grid-cell { border: none; padding: 0; background: none; cursor: pointer; border-radius: 12px; overflow: hidden; aspect-ratio: 1; }
.grid-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-btn { border: none; padding: 0; background: none; cursor: pointer; }
.lightbox { align-items: center; padding: 24px; box-sizing: border-box; }
.lightbox-wrap { max-width: 100%; width: 100%; }
.lightbox-wrap img { width: 100%; border-radius: 16px; display: block; }
.lightbox-label { color: #F6F5EF; text-align: center; font-size: 13px; font-weight: 700; margin-top: 10px; }
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
.deck-bg { align-items: center; padding: 20px; box-sizing: border-box; }
.deck-wrap { background: #F6F5EF; border-radius: 22px; padding: 20px; width: 100%; max-width: 340px; }
.deck-card { background: #FFFFFF; border: 2px solid #29382F; box-shadow: 4px 4px 0 #E9A23B; border-radius: 20px; padding: 26px 18px; text-align: center; touch-action: none; cursor: grab; user-select: none; }
.deck-emoji { font-size: 44px; }
.deck-name { font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 600; margin: 8px 0; }
.deck-btns { display: flex; gap: 10px; margin-top: 14px; }
.deck-no, .deck-yes { flex: 1; border-radius: 14px; padding: 13px 8px; font-weight: 700; font-family: 'Karla', sans-serif; font-size: 14px; cursor: pointer; }
.deck-no { background: #FFFFFF; border: 1.5px solid #DDDACB; color: #4A554D; }
.deck-yes { background: #29382F; border: none; color: #F6F5EF; }
.deck-launch { display: block; width: 100%; background: #FBEAC9; border: 1.5px dashed #E9A23B; border-radius: 14px; padding: 13px; font-family: 'Karla', sans-serif; font-weight: 700; font-size: 14px; color: #9A6410; cursor: pointer; margin: 0 0 14px; }
.deck-empty { text-align: center; padding: 10px 0; }
.toast { position: absolute; bottom: 82px; left: 16px; right: 16px; z-index: 30; background: #29382F; color: #F6F5EF; border-radius: 14px; padding: 13px 16px; font-size: 13.5px; line-height: 1.45; box-shadow: 0 8px 24px rgba(41,56,47,0.3); }
`;
