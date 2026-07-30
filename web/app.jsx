import React, { useState, useEffect, useMemo, useRef } from "react";
import { AGE_BANDS, bandFor, AFF, CAT_META, ACTIVITIES, FEATURED, FEATURED_CITY, AREA_SUGGESTIONS, IMG, KIDQ } from "./data.js";

/* ==================================================================
   Rambles v3.2
   Tabs: Discover (swipe) · Explore · Up Next · Story  + Settings
   ================================================================== */

const KEY = "little-rambles-v2";
const FEEDBACK_EMAIL = "alexlycau@gmail.com";
const SURVEY_URL = "https://docs.google.com/forms/d/e/1FAIpQLScwGfNEKUm4xONslhSRcn9ZTg5DLxz-zuMA_eHc1PsbffDUyQ/viewform";

/* ---------------- storage: IndexedDB + fallback ---------------- */
const DB = "little-rambles", STORE = "kv";
let _dbp = null;
const _mem = {};
const _hasIDB = (() => { try { return typeof indexedDB !== "undefined" && !!indexedDB; } catch (e) { return false; } })();
function db() {
  if (!_dbp) _dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return _dbp;
}
async function kv(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, mode); const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}
const fb = {
  get(k) { const v = _mem[k] !== undefined ? _mem[k] : (typeof localStorage !== "undefined" ? localStorage.getItem(k) : null); if (v == null) throw new Error("not found"); return { value: v }; },
  set(k, v) { _mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} return { value: v }; },
  del(k) { delete _mem[k]; try { localStorage.removeItem(k); } catch (e) {} },
};
const store = {
  async get(k) { if (!_hasIDB) return fb.get(k); try { const v = await kv("readonly", (s) => s.get(k)); if (v === undefined) throw new Error("not found"); return { value: v }; } catch (e) { if (e.message === "not found") throw e; return fb.get(k); } },
  async set(k, v) { if (!_hasIDB) return fb.set(k, v); try { await kv("readwrite", (s) => s.put(v, k)); return { value: v }; } catch (e) { return fb.set(k, v); } },
  async del(k) { if (!_hasIDB) return fb.del(k); try { await kv("readwrite", (s) => s.delete(k)); } catch (e) { fb.del(k); } },
};

/* ---------------------------- helpers -------------------------- */
const RATE = { loved: { e: "😍", l: "Loved it", c: "r-loved" }, fine: { e: "🙂", l: "Fine", c: "r-fine" }, nope: { e: "😵", l: "Not today", c: "r-nope" } };
const DAY = 86400000;
const monthsOld = (bd) => { const b = new Date(bd + "T00:00:00"), n = new Date(); let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth()); if (n.getDate() < b.getDate()) m -= 1; return Math.max(0, m); };
const fmtAge = (m) => (m < 24 ? m + " mo" : Math.floor(m / 12) + "y" + (m % 12 ? " " + (m % 12) + "m" : ""));
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60), ap = hh >= 12 ? "pm" : "am", h12 = ((hh + 11) % 12) + 1; return mm ? `${h12}:${String(mm).padStart(2, "0")}${ap}` : `${h12}${ap}`; };
/* Keyless worldwide address autocomplete (Photon, OpenStreetMap data).
   Returns {label, lat, lng} so Maps searches can be centred on real coordinates. */
async function photon(q, near) {
  const bias = near && near.lat != null ? "&lat=" + near.lat + "&lon=" + near.lng : "";
  const r = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=7" + bias);
  if (!r.ok) throw new Error("photon " + r.status);
  const j = await r.json();
  return (j.features || []).map((f) => {
    const p = f.properties || {};
    const l1 = [p.name, p.housenumber && p.street ? p.housenumber + " " + p.street : p.street].filter(Boolean).join(", ");
    const l2 = [p.district, p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(", ");
    return { label: l1 || l2, sub: l1 && l2 !== l1 ? l2 : "", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  }).filter((x) => x.label);
}
async function nominatim(q) {
  const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&addressdetails=1&q=" + encodeURIComponent(q));
  if (!r.ok) throw new Error("nominatim " + r.status);
  const j = await r.json();
  return (j || []).map((x) => {
    const parts = String(x.display_name).split(",").map((s) => s.trim());
    return { label: parts.slice(0, 2).join(", "), sub: parts.slice(2, 5).filter(Boolean).join(", "), lat: +x.lat, lng: +x.lon };
  });
}
/* Two independent providers so one being blocked or slow never leaves the user stuck. */
async function geoSearch(q, near) {
  if (!q || q.trim().length < 2) return [];
  const dedupe = (arr) => { const seen = {}; return arr.filter((x) => (seen[x.label + x.sub] ? false : (seen[x.label + x.sub] = true))); };
  try { const a = await photon(q, near); if (a.length) return dedupe(a); } catch (e) {}
  return dedupe(await nominatim(q));
}
const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* When we hold real coordinates we centre the Maps search on them (@lat,lng),
   which is the only reliable way to move results off the phone's default area. */
const gmaps = (q, place) => {
  if (place && place.lat != null) return "https://www.google.com/maps/search/" + encodeURIComponent(q) + "/@" + place.lat + "," + place.lng + ",14z";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + (place && place.label ? " near " + place.label : ""));
};
const nearQuery = (q, place) => gmaps(q, place);
const venueQuery = (name, area, place) => gmaps(name + (area ? ", " + area : ""), place);

function availability(a, now = new Date()) {
  const h = a.hours, mo = now.getMonth() + 1, day = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
  if (h.months) { const [s, e] = h.months; const inSeason = s <= e ? (mo >= s && mo <= e) : (mo >= s || mo <= e); if (!inSeason) return { st: "closed", rank: -1, label: `Season: ${MON[s]}–${MON[e]}` }; }
  if (!h.days.includes(day)) return { st: "closed", rank: -1, label: h.days.length === 2 ? "Weekends" : "Weekdays only" };
  if (hr < h.open) return h.open - hr <= 1.5 ? { st: "soon", rank: 0.5, label: `Opens ~${fmtHour(h.open)}` } : { st: "closed", rank: -1, label: `Opens ~${fmtHour(h.open)}` };
  if (hr >= h.close) return { st: "closed", rank: -1, label: "Done for today" };
  if (h.close - hr <= 1) return { st: "closing", rank: 0.6, label: `Closes ~${fmtHour(h.close)}` };
  return { st: "open", rank: 1, label: { daily: "Open now", daylight: "Good now", seasonal: "Open now · in season", schedule: "Sessions today — check times" }[h.conf] };
}

async function shrink(file, max = 1000, q = 0.72) {
  const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  if (!String(file.type).startsWith("image/")) return { t: "v", d: data };
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data; });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { t: "i", d: c.toDataURL("image/jpeg", q) };
}

/* -------- constraints parsed from the free-text profile note ---- */
const CMAP = [
  { k: ["water", "pool", "swim", "wet"], cats: ["water"], affs: ["water_play"], label: "water" },
  { k: ["animal", "animals", "dog", "dogs", "zoo"], cats: ["animals"], affs: ["animal_watch", "animal_touch"], label: "animals" },
  { k: ["loud", "noise", "noisy", "crowd", "crowds", "busy", "chaos"], cats: [], affs: ["peer_faces", "music_rhythm", "group_program"], label: "loud/busy places" },
  { k: ["snow", "cold", "winter"], cats: ["winter"], affs: ["snow_play"], label: "snow & cold" },
  { k: ["sand", "mess", "messy", "paint"], cats: [], affs: ["sensory_textures", "art_materials"], label: "messy play" },
  { k: ["climb", "climbing", "height", "heights"], cats: [], affs: ["climb_run", "big_kid_challenge"], label: "climbing" },
  { k: ["car", "driving", "drive"], cats: [], affs: [], label: "long drives" },
  { k: ["music", "singing"], cats: ["music"], affs: ["music_rhythm"], label: "music" },
  { k: ["book", "books", "story", "stories", "reading"], cats: ["stories"], affs: ["story_language"], label: "books & stories" },
  { k: ["food", "eating", "restaurant", "snack"], cats: ["food"], affs: ["food_ritual"], label: "food outings" },
  { k: ["train", "trains", "bus", "plane", "planes", "truck", "trucks", "digger", "boat"], cats: ["transit"], affs: ["vehicle_watch"], label: "machines & rides" },
];
const NEG = ["hate", "hates", "dislike", "dislikes", "avoid", "avoids", "scared", "afraid", "fear", "not ", "no ", "won't", "doesn't like", "does not like"];
const POS = ["love", "loves", "like", "likes", "obsessed", "adore", "enjoys", "favourite", "favorite"];
function parseConstraints(notes) {
  const out = { avoid: [], love: [] };
  if (!notes) return out;
  String(notes).toLowerCase().split(/[,;.\n·]+/).forEach((cl) => {
    const c = cl.trim(); if (!c) return;
    const neg = NEG.some((w) => c.includes(w)), pos = POS.some((w) => c.includes(w));
    if (!neg && !pos) return;
    CMAP.forEach((m) => { if (m.k.some((w) => new RegExp("\\b" + w).test(c))) (neg ? out.avoid : out.love).push(m.label); });
  });
  out.avoid = [...new Set(out.avoid)]; out.love = [...new Set(out.love.filter((l) => !out.avoid.includes(l)))];
  return out;
}
const cmapFor = (label) => CMAP.find((m) => m.label === label) || { cats: [], affs: [] };

/* ============================== APP ============================= */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [swipes, setSwipes] = useState({});
  const [customActs, setCustomActs] = useState([]);
  const [dropped, setDropped] = useState([]);
  const [spot, setSpot] = useState(null);
  const [tab, setTab] = useState("discover");
  const [toast, setToast] = useState(null);
  const [photosBy, setPhotosBy] = useState({});
  const [locOpen, setLocOpen] = useState(false);
  const [locText, setLocText] = useState("");
  const [locHits, setLocHits] = useState([]);
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState(false);
  const locTimer = useRef(null);
  const [checkIn, setCheckIn] = useState(null);
  const [ciRating, setCiRating] = useState(null);
  const [ciPlace, setCiPlace] = useState("");
  const [ciNote, setCiNote] = useState("");
  const [ciBy, setCiBy] = useState("");
  const [ciMedia, setCiMedia] = useState([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editMem, setEditMem] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [memFilter, setMemFilter] = useState("all");
  const [memSearch, setMemSearch] = useState("");
  const [memView, setMemView] = useState("story");
  const [exFilter, setExFilter] = useState("all");
  const [exCat, setExCat] = useState("all");
  const [showLater, setShowLater] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [fling, setFling] = useState(0);
  const dragT = useRef(0);
  const [hintShown, setHintShown] = useState(false);
  const [round, setRound] = useState(0);
  const dragFrom = useRef(null);
  const say = (m) => { setToast(m); setTimeout(() => setToast(null), 3600); };

  /* ---------------- load / persist ---------------- */
  useEffect(() => { (async () => {
    try { const r = await store.get(KEY); const s = JSON.parse(r.value);
      if (s.profile) { setProfile(s.profile); setSignedIn(s.signedIn !== false); }
      setVisits(s.visits || []); setPlans(s.plans || []); setSwipes(s.swipes || {});
      setCustomActs(s.customActs || []); setDropped(s.dropped || []); setSpot(s.spot || null);
    } catch (e) {}
    setLoaded(true);
  })(); }, []);
  useEffect(() => { if (!loaded) return; store.set(KEY, JSON.stringify({ profile, signedIn, visits, plans, swipes, customActs, dropped, spot })).catch(() => {}); },
    [profile, signedIn, visits, plans, swipes, customActs, dropped, spot, loaded]);
  useEffect(() => { if (tab !== "story") return; (async () => {
    for (const v of visits) if (v.mediaCount > 0 && !photosBy[v.id]) {
      try { const r = await store.get("lrm:" + v.id); setPhotosBy((m) => ({ ...m, [v.id]: JSON.parse(r.value) })); } catch (e) {}
    }
  })(); }, [tab, visits]);

  const profileComplete = !!(profile && profile.name && profile.birthdate && !isNaN(monthsOld(profile.birthdate)));
  const months = profileComplete ? monthsOld(profile.birthdate) : null;
  const band = months != null ? bandFor(months) : null;
  const pool = useMemo(() => [...ACTIVITIES, ...customActs], [customActs]);
  const constraints = useMemo(() => {
    const auto = parseConstraints(profile && profile.notes);
    const off = (profile && profile.cOff) || [];
    return { avoid: auto.avoid.filter((a) => !off.includes(a)), love: auto.love.filter((a) => !off.includes(a)) };
  }, [profile]);

  /* place used for all Maps queries + whether Vancouver featured data applies */
  const activePlace = spot || (profile && profile.home) || null;
  const placeLabel = activePlace ? activePlace.label : null;
  const inFeaturedCity = !spot && placeLabel && /vancouver|burnaby|richmond|surrey|coquitlam|langley|north van|west van|new westminster/i.test(placeLabel);
  const featFor = (a) => (inFeaturedCity && !a.userAdded ? FEATURED[a.id] || null : null);

  /* ---------------- signals ---------------- */
  const rated = visits.filter((v) => v.rating && v.ideaId);
  const catStats = useMemo(() => { const m = {}; rated.forEach((v) => { m[v.cat] = m[v.cat] || { loved: 0, fine: 0, nope: 0, total: 0 }; m[v.cat][v.rating]++; m[v.cat].total++; }); return m; }, [rated]);
  const lovedCats = Object.entries(catStats).filter(([, s]) => s.loved >= 2).map(([c]) => c);
  const pausedCats = Object.entries(catStats).filter(([, s]) => s.total >= 2 && s.loved === 0 && s.nope >= 1).map(([c]) => c);
  const recentIdeas = useMemo(() => { const m = {}; visits.forEach((v) => { if (v.ideaId && (!m[v.ideaId] || v.ts > m[v.ideaId])) m[v.ideaId] = v.ts; }); return m; }, [visits]);
  const recentCats = useMemo(() => { const m = {}; visits.forEach((v) => { if (v.cat && (!m[v.cat] || v.ts > m[v.cat])) m[v.cat] = v.ts; }); return m; }, [visits]);
  const retryIds = useMemo(() => rated.filter((v) => v.rating === "nope" && Date.now() - v.ts > 60 * DAY).map((v) => v.ideaId), [rated]);

  function score(a, avail) {
    if (months == null || months < a.ageMin) return -100;
    if (dropped.includes(a.id)) return -100;
    let s = 0;
    for (const f of a.aff) if (band.wants[f]) s += band.wants[f];
    if (a.ageMax && months > a.ageMax) s -= 4;
    if (lovedCats.includes(a.cat)) s += 4;
    if (pausedCats.includes(a.cat)) s -= 5;
    if (!recentIdeas[a.id]) s += 2;
    const now = Date.now();
    if (recentIdeas[a.id] && now - recentIdeas[a.id] < 3 * DAY) s -= 10;         // item 10
    else if (recentIdeas[a.id] && now - recentIdeas[a.id] < 10 * DAY) s -= 4;
    if (recentCats[a.cat] && now - recentCats[a.cat] < 2 * DAY) s -= 5;          // item 10
    if (swipes[a.id] === "yes") s += 2;
    if (swipes[a.id] === "no") s -= 3;
    if (retryIds.includes(a.id)) s += 2;
    constraints.avoid.forEach((l) => { const m = cmapFor(l); if (m.cats.includes(a.cat)) s -= 14; a.aff.forEach((f) => { if (m.affs.includes(f)) s -= 6; }); });
    constraints.love.forEach((l) => { const m = cmapFor(l); if (m.cats.includes(a.cat)) s += 5; a.aff.forEach((f) => { if (m.affs.includes(f)) s += 2; }); });
    if (a.userAdded) s += 3;
    s += avail.st === "open" ? 5 : avail.st === "closing" || avail.st === "soon" ? 2 : 0;
    return s;
  }
  const ranked = useMemo(() => pool.map((a) => { const avail = availability(a); return { a, avail, s: score(a, avail) }; }).sort((x, y) => y.s - x.s),
    [pool, months, visits, swipes, dropped, constraints, tab, round]);
  const openRanked = ranked.filter((r) => r.s > -50);

  function fit(a) {
    if (months < a.ageMin) return { k: "later", l: a.ageMin >= 60 ? "Best around 5+" : a.ageMin >= 42 ? "Best around 3½+" : a.ageMin >= 28 ? "Best around 2½" : `From ${fmtAge(a.ageMin)}` };
    if (a.userAdded) return { k: "yours", l: "Yours" };
    if (retryIds.includes(a.id)) return { k: "retry", l: "Worth a retry" };
    if (constraints.avoid.some((l) => cmapFor(l).cats.includes(a.cat))) return { k: "paused", l: "You're avoiding this" };
    if (pausedCats.includes(a.cat)) return { k: "paused", l: "Resting this type" };
    if (lovedCats.includes(a.cat)) return { k: "loves", l: `${profile.name} loves this` };
    return { k: "great", l: `Great at ${fmtAge(months)}` };
  }
  const matched = (a) => a.aff.filter((f) => band && band.wants[f]).sort((x, y) => band.wants[y] - band.wants[x]).slice(0, 3);

  /* ---------------- plan room (dedupe: one row per activity) ------- */
  const upsertPlan = (a, status) => {
    const f = featFor(a);
    setPlans((ps) => {
      const i = ps.findIndex((p) => p.ideaId === a.id);
      const row = { id: i >= 0 ? ps[i].id : Date.now(), ideaId: a.id, name: a.name, cat: a.cat, emoji: a.emoji,
        place: f ? f.name : null, area: f ? f.area : null, status, ts: Date.now(), locLabel: placeLabel, times: (i >= 0 ? ps[i].times || 1 : 1) + (status === "out" && i >= 0 && ps[i].status === "out" ? 1 : 0) };
      if (i >= 0) { const c = [...ps]; c[i] = row; return c; }
      return [row, ...ps];
    });
  };
  const goNow = (a) => { upsertPlan(a, "out"); const f = featFor(a); say(f ? `Heading to ${f.name} — tap Our List to log it afterwards.` : `${a.name} — tap Our List to log it afterwards.`); };
  const saveLater = (a) => { upsertPlan(a, "planned"); say("Saved to Our List 💛"); };
  const removePlan = (id) => setPlans((ps) => ps.filter((p) => p.id !== id));

  /* ---------------- check-in ---------------- */
  const openCheck = (p) => { setCiRating(null); setCiPlace(p.place || ""); setCiNote(""); setCiBy((profile.caregivers && profile.caregivers[0]) || ""); setCiMedia([]); setCheckIn(p); };
  const addMedia = async (e, setter, cap = 8) => {
    const files = Array.from(e.target.files || []); e.target.value = "";
    try { const out = []; for (const f of files) out.push(await shrink(f)); setter((prev) => [...prev, ...out].slice(0, cap)); }
    catch (err) { say("Couldn't read that file — try another?"); }
  };
  const saveCheck = async () => {
    if (!ciRating) { say("Pick how it went first — one tap."); return; }
    const id = Date.now();
    const v = { id, kind: "visit", ideaId: checkIn.ideaId, name: checkIn.name, cat: checkIn.cat, emoji: checkIn.emoji, ts: id,
      rating: ciRating, note: ciNote.trim(), place: ciPlace.trim() || null, by: ciBy || null, locLabel: checkIn.locLabel, mediaCount: ciMedia.length };
    setVisits((vs) => [v, ...vs]);
    if (ciMedia.length) { try { await store.set("lrm:" + id, JSON.stringify(ciMedia)); setPhotosBy((m) => ({ ...m, [id]: ciMedia })); } catch (e) { say("Media couldn't save, but the memory did."); } }
    removePlan(checkIn.id); setCheckIn(null);
    say(ciRating === "loved" ? `Saved to ${profile.name}'s story — more like this.` : ciRating === "nope" ? "Saved. Resting this type for a while." : `Saved to ${profile.name}'s story.`);
    setTab("story");
  };

  /* ---------------- discover deck ---------------- */
  const deck = useMemo(() => {
    const fresh = openRanked.filter((r) => swipes[r.a.id] === undefined);
    if (fresh.length) return { list: fresh, reshuffled: false };
    const all = [...openRanked];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return { list: all, reshuffled: true };
  }, [openRanked, swipes, round]);
  const top = deck.list[0];
  const doSwipe = (dir) => {
    if (!top) return;
    if (deck.reshuffled) { setRound((r) => r + 1); if (dir === "yes") saveLater(top.a); return; }
    setSwipes((s) => ({ ...s, [top.a.id]: dir }));
    if (dir === "yes") saveLater(top.a);
  };

  /* ---------------- location ---------------- */
  const useCurrent = (asHome) => {
    if (!navigator.geolocation) { say("Location isn't available on this device."); return; }
    say("Finding you…");
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { label: "my current spot", lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5), isGps: true };
      if (asHome) { setProfile((pr) => ({ ...(pr || {}), home: { ...p, label: "home (pinned)" } })); say("Home pinned to where you are now."); }
      else { setSpot(p); say("Using your exact location — Maps searches will centre here."); }
      setLocOpen(false);
    }, () => say("Couldn't get location — check the permission prompt and try again."), { enableHighAccuracy: true, timeout: 9000 });
  };

  /* ---------------- custom activity / memory ---------------- */
  const addCustomActivity = (form) => {
    const id = "u_" + Date.now();
    setPlans((ps) => [{ id: Date.now() + 1, ideaId: id, name: form.name, cat: form.cat, emoji: CAT_META[form.cat].emoji, place: form.place || null, area: null, status: "planned", ts: Date.now(), times: 1, mine: true }, ...ps]);
    setCustomActs((c) => [{ id, name: form.name, cat: form.cat, emoji: CAT_META[form.cat].emoji, ageMin: Number(form.ageMin) || 0, ageMax: 84,
      aff: (function () { const m = ACTIVITIES.find((a) => a.cat === form.cat); return m ? m.aff : ["peer_faces"]; })(), tags: ["indoor"],
      why: form.why || "Added by you.", place: form.place || null, mapsQuery: form.place || form.name, hours: { days: [0, 1, 2, 3, 4, 5, 6], open: 8, close: 20, conf: "daily", months: null }, userAdded: true, place: form.place || null }, ...c]);
    say(form.name + " added — it is in Our List, ready to visit or log.");
    setTab("upnext");
  };
  const addCustomMemory = async (form, media) => {
    const id = Date.now();
    const v = { id, kind: "custom", ideaId: null, name: form.name || "Our own outing", cat: form.cat || null, emoji: form.cat ? CAT_META[form.cat].emoji : "📍",
      ts: form.date ? new Date(form.date + "T12:00:00").getTime() : id, rating: form.rating || null, note: form.note || "", place: form.place || null, by: form.by || null, mediaCount: media.length, userAdded: true };
    setVisits((vs) => [v, ...vs].sort((a, b) => b.ts - a.ts));
    if (media.length) { try { await store.set("lrm:" + id, JSON.stringify(media)); setPhotosBy((m) => ({ ...m, [id]: media })); } catch (e) {} }
    say("Added to the story.");
  };

  /* ---------------- memory views ---------------- */
  const memAll = visits.filter((v) => v.rating || v.kind === "journal" || v.kind === "custom");
  const q = memSearch.trim().toLowerCase();
  const memList = memAll.filter((v) => {
    if (memFilter === "loved" && v.rating !== "loved") return false;
    if (memFilter === "media" && !(v.mediaCount > 0)) return false;
    if (q && !((v.place || "") + " " + (v.name || "") + " " + (v.note || "") + " " + (v.by || "")).toLowerCase().includes(q)) return false;
    return true;
  });
  const gridMedia = memList.flatMap((v) => (photosBy[v.id] || []).map((m) => ({ ...m, label: (v.place || v.name) + " · " + fmtDate(v.ts) })));
  const memCatCounts = useMemo(() => { const m = {}; memAll.forEach((v) => { if (v.cat) m[v.cat] = (m[v.cat] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [memAll]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, visits, plans, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "little-rambles-backup.json"; a.click();
  };

  /* ============================ RENDER ============================ */
  if (!loaded) return <div className="root"><style>{CSS}</style><div className="phone mid"><p className="big">〰️</p></div></div>;
  if (profile && !profile.name) { try { console.warn("profile missing name", profile); } catch (e) {} }
  if (!profileComplete || !signedIn || editProfile)
    return <div className="root"><style>{CSS}</style><div className="phone">
      <Profile profile={profile} signedIn={signedIn} editing={editProfile}
        onDone={(p) => { setProfile(p); setSignedIn(true); setEditProfile(false); setTab("discover"); }}
        onCancel={editProfile ? () => setEditProfile(false) : null} constraints={constraints} />
    </div></div>;

  const TABS = [["discover", "Swipe", "🃏"], ["explore", "Browse", "🔎"], ["upnext", "Our List", "💛"], ["story", "Memories", "📖"]];
  const _unusedPlaceLabel = placeLabel;
  const outRows = plans.filter((p) => p.status === "out");
  const planRows = plans.filter((p) => p.status === "planned");

  return (
    <div className="root"><style>{CSS}</style>
      <div className="phone">
        <header className="hdr">
          <div className="brand"><span>〰️</span><b>Rambles</b><span className="ver">v3.2</span></div>
          <div className="hdrright">
            <button className="kidchip" onClick={() => setTab("profile")}>{profile.name} · {fmtAge(months)}</button>
            <button className="chip tiny" onClick={() => setTab("settings")}>⚙️</button>
          </div>
        </header>

        {!locOpen ? (
          <button className="locbar" onClick={() => { setLocText(""); setLocOpen(true); }}>
            <span className="locpin">📍</span>
            <span className="loctext">{placeLabel ? (spot ? "Today: " : "Home: ") + placeLabel : "Set your location"}</span>
            <span className="locedit">change</span>
          </button>
        ) : (
          <div className="locedit-box">
            <div className="locrow">
              <input className="inp flat" autoFocus placeholder={placeLabel ? "Currently: " + placeLabel + " — type an address" : "Type an address, place or city"} value={locText}
                onChange={(e) => {
                  const v = e.target.value; setLocText(v);
                  if (locTimer.current) clearTimeout(locTimer.current);
                  if (v.trim().length < 2) { setLocHits([]); setLocBusy(false); setLocErr(false); return; }
                  setLocBusy(true); setLocErr(false);
                  locTimer.current = setTimeout(async () => {
                    try { const hits = await geoSearch(v, activePlace); setLocHits(hits); setLocErr(false); }
                    catch (err) { setLocHits([]); setLocErr(true); }
                    setLocBusy(false);
                  }, 300);
                }} />
              <button className="mini x" onClick={() => setLocOpen(false)}>✕</button>
            </div>
            <div className="locsug">
              <button className="sug gps" onClick={() => useCurrent(false)}>📍 Use my current location</button>
              {locBusy && <p className="searching">Searching addresses…</p>}
              {locHits.map((h, i) => <div className="sugrow" key={i}>
                <button className="sug" onClick={() => { setSpot(h); setLocOpen(false); say(`Today's ideas are near ${h.label}.`); }}>
                  <b>{h.label}</b>{h.sub ? <small>{h.sub}</small> : null}</button>
                <button className="sughome" title="Save as home" onClick={() => { setProfile((p) => ({ ...p, home: h })); setSpot(null); setLocOpen(false); say(`Home saved: ${h.label}`); }}>🏠</button>
              </div>)}
              {!locBusy && locErr && <div className="warnbox">Address search couldn't be reached just now. You can still use exactly what you typed:
                <button className="sug" onClick={() => { setSpot({ label: locText.trim() }); setLocOpen(false); say("Using " + locText.trim() + "."); }}>Use "{locText.trim()}" anyway</button></div>}
              {!locBusy && !locErr && !locHits.length && locText.trim().length >= 2 && <div className="warnbox">No matches yet — keep typing, or
                <button className="sug" onClick={() => { setSpot({ label: locText.trim() }); setLocOpen(false); say("Using " + locText.trim() + "."); }}>use "{locText.trim()}" as typed</button></div>}
              {!locText.trim() && AREA_SUGGESTIONS.slice(0, 5).map((a) => <button className="sug" key={a} onClick={() => setLocText(a)}>{a}</button>)}
            </div>
            {spot && <button className="ghost full" onClick={() => { setSpot(null); setLocOpen(false); say("Back to home area."); }}>Back to home</button>}
            <p className="fine">🏠 Home: {profile.home ? profile.home.label : "not set yet"}{spot ? " · 📍 Today: " + spot.label : ""} · tap 🏠 beside a result to make it home.</p>
          </div>
        )}

        <nav className="topnav">
          {TABS.map(([k, l, ic]) => <button key={k} className={"tb" + (tab === k ? " on" : "")} onClick={() => setTab(k)}><span className="ti">{ic}</span><span className="tl">{l}</span>{k === "upnext" && plans.length ? <i className="dot">{plans.length}</i> : null}</button>)}
        </nav>

        <main className="scroll">
          {/* ---------------- DISCOVER ---------------- */}
          {tab === "discover" && <div className="pad">
            <p className="bandline">{band.theme}</p>
            {top ? <>
              {deck.reshuffled && <div className="nudge sm"><span>🔁</span><p>You've seen everything age-right for {profile.name} — reshuffling so there's always something next.</p></div>}
              <div className="deckwrap">
                {deck.list[1] && <div className="deckcard behind" aria-hidden="true"><Art a={deck.list[1].a} tall /><div className="deckbody"><h2 className="dtitle">{deck.list[1].a.name}</h2></div></div>}
                <div className={"deckcard" + (hintShown ? "" : " hint")}
                  style={{ transform: `translateX(${fling || dragX}px) rotate(${(fling || dragX) / 14}deg)`, opacity: fling ? 0 : 1,
                    transition: dragFrom.current == null ? "transform .32s cubic-bezier(.18,.9,.28,1), opacity .3s" : "none" }}
                  onPointerDown={(e) => { dragFrom.current = e.clientX; dragT.current = Date.now(); setHintShown(true); e.currentTarget.setPointerCapture(e.pointerId); }}
                  onPointerMove={(e) => { if (dragFrom.current != null) setDragX(e.clientX - dragFrom.current); }}
                  onPointerUp={() => {
                    const x = dragX, dt = Math.max(1, Date.now() - dragT.current), v = x / dt;
                    dragFrom.current = null;
                    if (x > 90 || v > 0.45) { setFling(520); setDragX(0); setTimeout(() => { doSwipe("yes"); setFling(0); }, 210); }
                    else if (x < -90 || v < -0.45) { setFling(-520); setDragX(0); setTimeout(() => { doSwipe("no"); setFling(0); }, 210); }
                    else setDragX(0);
                  }}
                  onPointerCancel={() => { dragFrom.current = null; setDragX(0); }}>
                  <Art a={top.a} tall />
                  {dragX > 25 && <span className="stamp yes" style={{ opacity: Math.min(1, dragX / 90) }}>SAVE</span>}
                  {dragX < -25 && <span className="stamp no" style={{ opacity: Math.min(1, -dragX / 90) }}>SKIP</span>}
                  {!hintShown && <span className="swipehint">← swipe →</span>}
                  <div className="deckbody">
                    <div className="rowtop"><span className={"badge b-" + fit(top.a).k}>{fit(top.a).l}</span><span className={"av a-" + top.avail.st}>{top.avail.label}</span></div>
                    <h2 className="dtitle">{featFor(top.a) ? featFor(top.a).name : top.a.name}</h2>
                    <p className="dsub">{top.a.emoji} {featFor(top.a) ? top.a.name + " · " + featFor(top.a).area : CAT_META[top.a.cat].label}</p>
                    <p className="why">{featFor(top.a) ? featFor(top.a).note : top.a.why}</p>
                    <div className="affs">{matched(top.a).map((f) => <span className="aff" key={f}>{AFF[f]}</span>)}</div>
                  </div>
                </div>
              </div>
              <div className="deckbtns">
                <button className="dbtn skip" onClick={() => doSwipe("no")}>👋<span>Skip</span></button>
                <button className="dbtn save" onClick={() => doSwipe("yes")}>💛<span>Save</span></button>
                <a className="dbtn go" href={featFor(top.a) ? venueQuery(featFor(top.a).name, featFor(top.a).area, activePlace) : nearQuery(top.a.mapsQuery, activePlace)} target="_blank" rel="noreferrer" onClick={() => goNow(top.a)}>🚗<span>Let's go</span></a>
              </div>
              <p className="fine center">Swipe left to skip, right to save. Saved ideas wait in <b>Our List</b>.</p>
            </> : <div className="card dash"><p className="why">Nothing is open right now — try Explore, or check back in the morning. 🌙</p></div>}
          </div>}

          {/* ---------------- EXPLORE ---------------- */}
          {tab === "explore" && <div className="pad">
            <button className="wide" onClick={() => setAddOpen(true)}>➕ Add your own activity or place</button>
            <div className="chips">
              {[["all", "All"], ["open", "Open now"], ["free", "Free"], ["rainy", "Indoor"], ["new", "New to us"]].map(([k, l]) =>
                <button key={k} className={"chip" + (exFilter === k ? " on" : "")} onClick={() => setExFilter(k)}>{l}</button>)}
            </div>
            <div className="chips">
              <button className={"chip" + (exCat === "all" ? " on" : "")} onClick={() => setExCat("all")}>All types</button>
              {Object.entries(CAT_META).map(([c, m]) => <button key={c} className={"chip" + (exCat === c ? " on" : "")} onClick={() => setExCat(c)}>{m.emoji} {m.label}</button>)}
            </div>
            {!inFeaturedCity && <div className="nudge sm"><span>🌍</span><p>Named picks are curated for Metro Vancouver so far. Everywhere else, cards search your area by type — works worldwide.</p></div>}
            {ranked.filter(({ a, avail }) => {
              if (months < a.ageMin && !showLater) return false;
              if (exCat !== "all" && a.cat !== exCat) return false;
              if (exFilter === "open") return avail.st === "open" || avail.st === "closing";
              if (exFilter === "free") return a.tags.includes("free");
              if (exFilter === "rainy") return a.tags.includes("indoor") || a.tags.includes("rainy");
              if (exFilter === "new") return !recentIdeas[a.id];
              return true;
            }).slice(0, 60).map(({ a, avail }) => <ActCard key={a.id} a={a} feat={featFor(a)} fit={fit(a)} avail={avail} affs={matched(a)} place={activePlace} onGo={goNow} onSave={saveLater} planned={plans.some((p) => p.ideaId === a.id)} />)}
            <button className="wide alt" onClick={() => setShowLater((v) => !v)}>
              {showLater ? "Hide activities she's not old enough for" : `Show what's coming later (${ranked.filter((r) => months < r.a.ageMin).length} for older kids)`}
            </button>
          </div>}

          {/* ---------------- UP NEXT ---------------- */}
          {tab === "upnext" && <div className="pad">
            <button className="wide" onClick={() => setAddOpen(true)}>➕ Add your own activity or place</button>
            {customActs.length > 0 && <>
              <div className="lbl">💜 Your own activities</div>
              {customActs.map((a) => <div className="card mine" key={a.id}>
                <div className="rowtop"><div><h3 className="ctitle">{a.emoji} {a.name}</h3>{a.place && <p className="dsub">{a.place}</p>}</div><span className="badge b-yours">Yours</span></div>
                <p className="why">{a.why}</p>
                <div className="pills">
                  <a className="pillbtn dark" href={nearQuery(a.place || a.mapsQuery, activePlace)} target="_blank" rel="noreferrer" onClick={() => goNow(a)}>🚗 Let's go</a>
                  <button className="pillbtn" onClick={() => openCheck({ id: Date.now(), ideaId: a.id, name: a.name, cat: a.cat, emoji: a.emoji, place: a.place || null })}>Log a memory here</button>
                  <button className="pillbtn" onClick={() => { setCustomActs((c) => c.filter((x) => x.id !== a.id)); say("Removed."); }}>Remove</button>
                </div>
              </div>)}
            </>}
            <div className="nudge sm"><span>💡</span><p><b>Our List is your shortlist.</b> Swipe right (or tap Save) to keep an idea here. Tap <b>Let's go</b> and it moves to "Out now" — then one tap logs it into the Story.</p></div>
            {!plans.length && <div className="card dash"><p className="why">Nothing saved yet. Swipe right in <b>Swipe</b>, or tap <b>Save</b> on anything in <b>Browse</b>.</p></div>}
            {outRows.length > 0 && <><div className="lbl">📍 Out now — tap to log afterwards</div>
              {outRows.map((p) => <div className="card out" key={p.id}>
                <div className="rowtop"><span className="eyebrow">Started {fmtDate(p.ts)}{p.times > 1 ? ` · ${p.times} trips` : ""}</span></div>
                <h3 className="ctitle">{p.emoji} {p.place || p.name}</h3>
                {p.place && <p className="dsub">{p.name}{p.area ? " · " + p.area : ""}</p>}
                <div className="pills">
                  <button className="pillbtn dark" onClick={() => openCheck(p)}>Log this outing</button>
                  <a className="pillbtn" href={p.place ? venueQuery(p.place, p.area, activePlace) : nearQuery(p.name, activePlace)} target="_blank" rel="noreferrer">🗺️ Directions</a>
                  <button className="pillbtn" onClick={() => removePlan(p.id)}>Didn't go</button>
                </div>
              </div>)}</>}
            {planRows.length > 0 && <><div className="lbl">💛 Saved for later</div>
              {planRows.map((p) => { const a = pool.find((x) => x.id === p.ideaId); const av = a ? availability(a) : null; return <div className="card" key={p.id}>
                <div className="rowtop"><h3 className="ctitle">{p.emoji} {p.place || p.name}</h3>{av && <span className={"av a-" + av.st}>{av.label}</span>}</div>
                {p.place && <p className="dsub">{p.name}{p.area ? " · " + p.area : ""}</p>}
                <div className="pills">
                  <a className="pillbtn dark" href={p.place ? venueQuery(p.place, p.area, activePlace) : nearQuery(a ? a.mapsQuery : p.name, activePlace)} target="_blank" rel="noreferrer" onClick={() => a && goNow(a)}>🚗 Let's go</a>
                  <button className="pillbtn" onClick={() => openCheck(p)}>Log it</button>
                  <button className="pillbtn" onClick={() => removePlan(p.id)}>Remove</button>
                </div>
              </div>; })}</>}
          </div>}

          {/* ---------------- STORY ---------------- */}
          {tab === "story" && <div className="pad">
            <div className="stats">
              <div className="st"><b>{visits.filter((v) => v.rating).length}</b><span>outings</span></div>
              <div className="st"><b>{new Set(memAll.map((v) => v.place || v.name)).size}</b><span>places</span></div>
              <div className="st"><b>{visits.reduce((n, v) => n + (v.mediaCount || 0), 0)}</b><span>photos</span></div>
              <div className="st"><b>{memAll.length ? fmtDate(memAll[memAll.length - 1].ts) : "—"}</b><span>since</span></div>
            </div>
            {memCatCounts.length > 0 && <><div className="lbl">By type</div><div className="catstats">
              {memCatCounts.map(([c, n]) => <span className="catstat" key={c}>{CAT_META[c] ? CAT_META[c].emoji + " " + CAT_META[c].label : c}<b>{n}</b></span>)}
            </div></>}
            <div className="btns2">
              <button className="wide" onClick={() => setJournalOpen(true)}>✍️ Write a moment</button>
              <button className="wide" onClick={() => setEditMem({ isNew: true })}>📍 Add an outing we did on our own</button>
            </div>
            <div className="chips">
              {[["story", "Story"], ["grid", "Photos"]].map(([k, l]) => <button key={k} className={"chip" + (memView === k ? " on" : "")} onClick={() => setMemView(k)}>{l}</button>)}
              <button className={"chip" + (memFilter === "loved" ? " on" : "")} onClick={() => setMemFilter(memFilter === "loved" ? "all" : "loved")}>😍 Loved</button>
              <button className={"chip" + (memFilter === "media" ? " on" : "")} onClick={() => setMemFilter(memFilter === "media" ? "all" : "media")}>📷 With photos</button>
            </div>
            <input className="inp" placeholder="Search places, notes, who took her…" value={memSearch} onChange={(e) => setMemSearch(e.target.value)} />
            {memView === "story" ? <>
              {rated.length >= 2 && <div className="ins">
                {lovedCats.map((c) => <div className="in up" key={c}><span>💛</span><p><b>Working well:</b> {CAT_META[c] ? CAT_META[c].label : c} — {catStats[c].loved} “loved it”.</p></div>)}
                {pausedCats.map((c) => <div className="in pa" key={c}><span>⏸️</span><p><b>Resting:</b> {CAT_META[c] ? CAT_META[c].label : c} — not landing lately.</p></div>)}
              </div>}
              <div className="lbl">{profile.name}'s memories</div>
              {!memList.length && <div className="card dash"><p className="why">{memAll.length ? "Nothing matches that filter." : "Nothing here yet — it fills itself from taps you barely notice."}</p></div>}
              {memList.map((v) => <div className={"mem" + (v.kind === "journal" ? " jr" : "") + (v.kind === "custom" ? " cu" : "")} key={v.id}>
                <div className="memhead"><span className="date">{fmtDate(v.ts)}</span><div className="hr">
                  {v.kind === "journal" ? <span className="pill jrp">✍️ Journal</span> : v.kind === "custom" ? <span className="pill cup">📍 Ours</span> : null}
                  {v.rating && <span className={"pill " + RATE[v.rating].c}>{RATE[v.rating].e} {RATE[v.rating].l}</span>}
                  <button className="mini" onClick={() => setEditMem(v)}>✏️</button></div></div>
                {v.kind !== "journal" && <div className="mtitle">{v.emoji} {v.place || v.name}{v.place && v.name !== v.place ? <span className="msub"> · {v.name}</span> : null}</div>}
                {v.by && <div className="msub">with {v.by}</div>}
                {v.note && <div className={v.kind === "journal" ? "jtext" : "mnote"}>{v.kind === "journal" ? v.note : "“" + v.note + "”"}</div>}
                {photosBy[v.id] && <div className="strip">{photosBy[v.id].map((m, i) => <button className="tb" key={i} onClick={() => setLightbox({ ...m, label: (v.place || v.name) + " · " + fmtDate(v.ts) })}>{m.t === "v" ? <span className="vid">🎥</span> : <img src={m.d} alt="" />}</button>)}</div>}
              </div>)}
            </> : <>
              <div className="lbl">Every photo, one place</div>
              {!gridMedia.length ? <div className="card dash"><p className="why">No media yet — snap a few on your next outing.</p></div> :
                <div className="grid">{gridMedia.map((m, i) => <button className="gc" key={i} onClick={() => setLightbox(m)}>{m.t === "v" ? <span className="vid">🎥</span> : <img src={m.d} alt="" />}</button>)}</div>}
            </>}
          </div>}

          {/* ---------------- PROFILE (its own place, not buried in settings) ---------------- */}
          {tab === "profile" && <div className="pad">
            <div className="lbl">Child profile</div>
            <div className="card hl">
              <h2 className="dtitle">{profile.name}</h2>
              <p className="dsub">{fmtAge(months)} · born {profile.birthdate}</p>
              <p className="why">{band.theme}</p>
              <div className="pills"><button className="pillbtn dark" onClick={() => setEditProfile(true)}>Edit name, age & preferences</button></div>
            </div>
            <div className="lbl">What we avoid & what she loves</div>
            <div className="card">
              {(constraints.avoid.length || constraints.love.length)
                ? <div className="chipline">{constraints.avoid.map((c) => <span className="badge b-paused" key={c}>avoiding {c}</span>)}{constraints.love.map((c) => <span className="badge b-loves" key={c}>likes {c}</span>)}</div>
                : <p className="why">Nothing set yet. Edit the profile and write a line like “hates water, loves trains, naps at 12:30”.</p>}
              <p className="fine">These come from the free-text line in the profile and change rankings immediately.</p>
            </div>
            <div className="lbl">Home & caregivers</div>
            <div className="card">
              <p className="why">🏠 Home: <b>{profile.home ? profile.home.label : "not set"}</b>{spot ? <> · 📍 Today: <b>{spot.label}</b></> : null}</p>
              <p className="why">Caregivers: {profile.caregivers && profile.caregivers.length ? profile.caregivers.join(", ") : "just you so far"}</p>
              <div className="pills"><button className="pillbtn" onClick={() => { setLocText(""); setLocOpen(true); setTab("discover"); }}>Change home address</button>
                <button className="pillbtn" onClick={() => setEditProfile(true)}>Edit caregivers</button></div>
            </div>
            <div className="lbl">Account</div>
            <div className="card">
              <p className="why">Free while in beta. Plans and family sharing will live here later.</p>
              <div className="pills"><button className="pillbtn" onClick={() => { setSignedIn(false); say("Signed out."); }}>Sign out</button>
                <button className="pillbtn" onClick={() => setTab("settings")}>Data, feedback & your activities →</button></div>
            </div>
          </div>}

          {/* ---------------- SETTINGS ---------------- */}
          {tab === "settings" && <div className="pad">

            <div className="lbl">Help build this</div>
            <div className="card hl">
              <p className="why">You're one of the first testers. Two minutes of honesty changes the product.</p>
              <div className="btns">
                <a className="primary sm" href={SURVEY_URL} target="_blank" rel="noreferrer">Take the 5-min survey</a>
                <a className="ghost sm" href={`mailto:${FEEDBACK_EMAIL}?subject=Little%20Rambles%20feedback&body=What%20I%20tried%3A%0A%0AWhat%20felt%20off%3A%0A%0AWhat%20I'd%20want%20instead%3A%0A`}>Email feedback</a>
              </div>
              <p className="fine">Goes straight to {FEEDBACK_EMAIL}.</p>
            </div>

            <div className="lbl">Your activities ({customActs.length})</div>
            <div className="card">
              {!customActs.length && <p className="why">Add a type of outing or a specific place we don't suggest — it joins your recommendations, marked “Yours”.</p>}
              {customActs.map((a) => <div className="uarow" key={a.id}><span>{a.emoji} {a.name}</span>
                <button className="mini" onClick={() => { setCustomActs((c) => c.filter((x) => x.id !== a.id)); say("Removed."); }}>✕</button></div>)}
              <button className="wide" onClick={() => setAddOpen(true)}>➕ Add activity or place</button>
            </div>

            <div className="lbl">Your data</div>
            <div className="card">
              <p className="why"><b>Where photos live:</b> inside this app on this device (not your iPhone camera roll). They survive app closing and phone restarts, but they are <b>not</b> backed up to iCloud and would be lost if you delete the app or clear site data.</p>
              <p className="why">Tap any photo → <b>Save</b> to copy it to your device. Use <b>Export</b> for a full backup file of memories and notes. Cloud accounts with real backup arrive in the next build.</p>
              <div className="btns"><button className="primary sm" onClick={exportData}>Export my data</button></div>
            </div>
            <p className="fine center">Little Rambles v2.0 · 155 activities · Dev-Map v1.2.0</p>
          </div>}
        </main>

        {/* ---------------- modals ---------------- */}
        {checkIn && <Sheet onClose={() => setCheckIn(null)}>
          <div className="eyebrow">Log this outing</div>
          <h3 className="ctitle">{checkIn.place || checkIn.name}</h3>
          <div className="lbl">How did it go?</div>
          <div className="rates">{Object.entries(RATE).map(([k, m]) => <button key={k} className={"rb " + m.c + (ciRating === k ? " on" : "")} onClick={() => setCiRating(k)}><span className="e">{m.e}</span><span>{m.l}</span></button>)}</div>
          <input className="inp" placeholder="Which place exactly? (optional)" value={ciPlace} onChange={(e) => setCiPlace(e.target.value)} />
          <textarea className="inp ta" placeholder="Notes or a reminder for next time — e.g. “bring water shoes”, “arrive before 10 or no parking”" value={ciNote} onChange={(e) => setCiNote(e.target.value)} />
          {profile.caregivers && profile.caregivers.length > 1 && <select className="inp" value={ciBy} onChange={(e) => setCiBy(e.target.value)}>
            <option value="">Who took her out?</option>{profile.caregivers.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
          <div className="btns">
            <label className="pick main">🖼️ Add photos <small>pick several at once</small><input type="file" accept="image/*" multiple hidden onChange={(e) => addMedia(e, setCiMedia)} /></label>
            <label className="pick">📸 Camera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => addMedia(e, setCiMedia)} /></label>
            <label className="pick">🎥 Video<input type="file" accept="video/*" hidden onChange={(e) => addMedia(e, setCiMedia)} /></label>
          </div>
          {ciMedia.length > 0 && <div className="strip">{ciMedia.map((m, i) => <button className="tb del" key={i} onClick={() => setCiMedia((p) => p.filter((_, j) => j !== i))}>{m.t === "v" ? <span className="vid">🎥</span> : <img src={m.d} alt="" />}<i>✕</i></button>)}</div>}
          <button className="primary full" onClick={saveCheck}>Save to {profile.name}'s story</button>
          <button className="ghost full mt" onClick={() => setCheckIn(null)}>Not now</button>
        </Sheet>}

        {journalOpen && <JournalSheet name={profile.name} onClose={() => setJournalOpen(false)} onSave={async (text, media) => {
          const id = Date.now();
          setVisits((vs) => [{ id, kind: "journal", ts: id, note: text, name: "Journal", emoji: "✍️", mediaCount: media.length }, ...vs]);
          if (media.length) { try { await store.set("lrm:" + id, JSON.stringify(media)); setPhotosBy((m) => ({ ...m, [id]: media })); } catch (e) {} }
          setJournalOpen(false); say("Saved to the story ✍️");
        }} addMedia={addMedia} />}

        {addOpen && <AddActivitySheet place={activePlace} onClose={() => setAddOpen(false)} onSave={(f) => { addCustomActivity(f); setAddOpen(false); }} />}

        {editMem && <EditMemSheet mem={editMem} media={photosBy[editMem.id] || []} caregivers={profile.caregivers || []} addMedia={addMedia}
          onClose={() => setEditMem(null)}
          onSaveNew={async (f, media) => { await addCustomMemory(f, media); setEditMem(null); }}
          onSave={async (patch, media) => {
            setVisits((vs) => vs.map((v) => (v.id === editMem.id ? { ...v, ...patch, mediaCount: media.length } : v)));
            try { if (media.length) await store.set("lrm:" + editMem.id, JSON.stringify(media)); else await store.del("lrm:" + editMem.id); } catch (e) {}
            setPhotosBy((m) => { const n = { ...m }; if (media.length) n[editMem.id] = media; else delete n[editMem.id]; return n; });
            setEditMem(null); say("Memory updated.");
          }}
          onDelete={async () => { setVisits((vs) => vs.filter((v) => v.id !== editMem.id)); try { await store.del("lrm:" + editMem.id); } catch (e) {} setEditMem(null); say("Deleted."); }} />}

        {lightbox && <div className="lb" onClick={() => setLightbox(null)}>
          <div className="lbin" onClick={(e) => e.stopPropagation()}>
            {lightbox.t === "v" ? <video src={lightbox.d} controls playsInline /> : <img src={lightbox.d} alt="" />}
            <p className="lbl2">{lightbox.label}</p>
            <a className="primary full" href={lightbox.d} download={"little-rambles-" + Date.now() + (lightbox.t === "v" ? ".mp4" : ".jpg")}>Save to my device</a>
            <button className="ghost full mt" onClick={() => setLightbox(null)}>Close</button>
          </div></div>}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

/* ============================ pieces ============================ */
function PlaceInput({ value, onChange, onPick, placeholder, allowGps, onGps }) {
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const t = useRef(null);
  const type = (v) => {
    onChange(v);
    if (t.current) clearTimeout(t.current);
    if (v.trim().length < 2) { setHits([]); setBusy(false); setErr(false); return; }
    setBusy(true); setErr(false);
    t.current = setTimeout(async () => {
      try { setHits(await geoSearch(v, null)); setErr(false); } catch (e) { setHits([]); setErr(true); }
      setBusy(false);
    }, 300);
  };
  const gps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const h = { label: "my current spot", lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) };
      onGps && onGps(h); setHits([]);
    }, () => {}, { enableHighAccuracy: true, timeout: 9000 });
  };
  return <div className="placewrap">
    <input className="inp" value={value} onChange={(e) => type(e.target.value)} placeholder={placeholder} />
    {allowGps && <button className="sug gps" onClick={gps}>📍 Use my current location</button>}
    {busy && <p className="searching">Searching addresses…</p>}
    {err && <p className="fine">Address search unreachable — what you typed will still be used.</p>}
    {hits.length > 0 && <div className="locsug">{hits.map((h, i) =>
      <button className="sug" key={i} onClick={() => { onPick(h); setHits([]); }}><b>{h.label}</b>{h.sub ? <small>{h.sub}</small> : null}</button>)}</div>}
  </div>;
}
function Sheet({ children, onClose }) {
  return <div className="sheetbg" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
}
/* Every activity gets its OWN picture: curated photo first; if it fails,
   a generated scene unique to that activity (pattern + palette from id hash). */
const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
function tint(hex, amt) {
  const n = parseInt(hex.slice(1), 16), cl = (x) => Math.max(0, Math.min(255, x));
  return "#" + ((1 << 24) + (cl((n >> 16) + amt) << 16) + (cl(((n >> 8) & 255) + amt) << 8) + cl((n & 255) + amt)).toString(16).slice(1);
}
function GenArt({ a, m, h }) {
  const v = h % 6, c1 = tint(m.c1, ((h >> 3) % 5) * -7), c2 = tint(m.c2, ((h >> 6) % 5) * 6);
  const acc = ["#E9A23B", "#8FB3C0", "#A14E33", "#2F5138", "#E5AFA3", "#33606F"][h % 6];
  const gid = "g" + a.id;
  const pats = [
    <g key="0"><path d="M0,64 Q40,50 80,64 T160,64 T240,64 T320,64 V120 H0 Z" fill="#fff" opacity=".38" /><path d="M0,80 Q40,68 80,80 T160,80 T240,80 T320,80 V120 H0 Z" fill="#fff" opacity=".55" /><circle cx={40 + (h % 200)} cy="26" r="15" fill={acc} opacity=".85" /></g>,
    <g key="1">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={20 + i * 40 + (h % 17)} cy={22 + ((h >> i) % 60)} r={4 + ((h >> i) % 9)} fill={i % 2 ? acc : "#fff"} opacity=".55" />)}</g>,
    <g key="2">{[0, 1, 2, 3, 4].map((i) => <polygon key={i} points={(30 + i * 60) + ",110 " + (58 + i * 60) + "," + (30 + ((h >> i) % 40)) + " " + (86 + i * 60) + ",110"} fill={i % 2 ? "#fff" : acc} opacity=".45" />)}</g>,
    <g key="3">{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 56 + (h % 20)} y="0" width="26" height="120" fill={i % 2 ? "#fff" : acc} opacity=".22" transform={"skewX(" + (-12 + (h % 20)) + ")"} />)}</g>,
    <g key="4"><circle cx={250 - (h % 90)} cy="34" r="26" fill={acc} opacity=".9" /><ellipse cx="160" cy="112" rx="200" ry="30" fill="#fff" opacity=".4" /><ellipse cx={90 + (h % 60)} cy="24" rx="26" ry="9" fill="#fff" opacity=".75" /></g>,
    <g key="5">{[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={"M" + i * 50 + ",120 Q" + (i * 50 + 25) + "," + (60 + ((h >> i) % 45)) + " " + (i * 50 + 50) + ",120 Z"} fill={i % 2 ? acc : "#fff"} opacity=".35" />)}</g>,
  ];
  return <svg className="genart" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
    <rect width="320" height="120" fill={"url(#" + gid + ")"} />{pats[v]}
  </svg>;
}
/* If the curated photo fails, look up a real, topical, openly-licensed photo
   by keyword (Wikimedia Commons — keyless, CORS-friendly) and cache the result. */
/* Pictures: a real, topical, openly-licensed photo per activity, looked up once by
   keyword from Wikimedia Commons and cached forever. A global claim-set guarantees
   no two activities ever end up with the same image. */
const photoCache = {};
const claimed = {};
async function findPhoto(a) {
  if (photoCache[a.id]) return photoCache[a.id];
  try { const r = await store.get("img:" + a.id); if (r.value) { photoCache[a.id] = r.value; claimed[r.value] = a.id; return r.value; } } catch (e) {}
  const q = (KIDQ[a.id] || ((a.mapsQuery || a.name) + " children kids")).replace(/[^a-zA-Z ]/g, " ").trim();
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=" +
    encodeURIComponent("filetype:bitmap " + q) + "&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=900";
  const r = await fetch(url);
  const j = await r.json();
  const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
  const urls = pages.map((p) => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl)
    .filter((u) => u && !/\.svg|logo|map|diagram|icon|coat_of_arms/i.test(u));
  const pick = urls.find((u) => !claimed[u]) || urls[0];
  if (pick) { claimed[pick] = a.id; photoCache[a.id] = pick; store.set("img:" + a.id, pick).catch(() => {}); }
  return pick || null;
}
function Art({ a, tall }) {
  const m = CAT_META[a.cat] || CAT_META.nature;
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const h = hash(a.id);
  useEffect(() => {
    let live = true;
    findPhoto(a)
      .then((u) => { if (!live) return; if (u) setSrc(u); else if (IMG[a.id]) setSrc("https://images.unsplash.com/photo-" + IMG[a.id] + "?w=800&q=72&auto=format&fit=crop"); else setFailed(true); })
      .catch(() => { if (!live) return; if (IMG[a.id]) setSrc("https://images.unsplash.com/photo-" + IMG[a.id] + "?w=800&q=72&auto=format&fit=crop"); else setFailed(true); });
    return () => { live = false; };
  }, [a.id]);
  return <div className={"art" + (tall ? " tall" : "")}>
    {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => { if (IMG[a.id] && src.indexOf("unsplash") < 0) setSrc("https://images.unsplash.com/photo-" + IMG[a.id] + "?w=800&q=72&auto=format&fit=crop"); else setFailed(true); }} /> : <GenArt a={a} m={m} h={h} />}
    <span className="ae">{a.emoji}</span>
  </div>;
}
function ActCard({ a, feat, fit, avail, affs, place, onGo, onSave, planned }) {
  const later = fit.k === "later", closed = avail.st === "closed";
  return <div className={"card" + (later || closed ? " dim" : "")}>
    <Art a={a} />
    <div className="rowtop">
      <div><h3 className="ctitle">{feat ? feat.name : a.name}</h3>
        <p className="dsub">{a.emoji} {feat ? a.name + " · " + feat.area : CAT_META[a.cat].label}</p></div>
      <span className={"badge b-" + fit.k}>{fit.l}</span>
    </div>
    <div className="chipline"><span className={"av a-" + avail.st}>{avail.label}</span>{affs.map((f) => <span className="aff" key={f}>{AFF[f]}</span>)}</div>
    <p className="why">{feat ? feat.note : a.why}</p>
    {later ? <p className="fine">On the timeline — it'll resurface when she's ready.</p> : <>
      <div className="btns">
        <a className="primary sm" href={feat ? venueQuery(feat.name, feat.area, place) : nearQuery(a.mapsQuery, place)} target="_blank" rel="noreferrer" onClick={() => onGo(a)}>Let's go</a>
        <button className="ghost sm" onClick={() => onSave(a)}>{planned ? "On our list ✓" : "💛 Save"}</button>
      </div>
      <a className="more" href={nearQuery(a.mapsQuery, place)} target="_blank" rel="noreferrer">See every {CAT_META[a.cat].label.toLowerCase()} option nearby →</a>
    </>}
  </div>;
}
function Profile({ profile, signedIn, editing, onDone, onCancel, constraints }) {
  const [name, setName] = useState((profile && profile.name) || "");
  const [bd, setBd] = useState((profile && profile.birthdate) || "");
  const [notes, setNotes] = useState((profile && profile.notes) || "");
  const [home, setHome] = useState((profile && profile.home && profile.home.label) || "");
  const [homeObj, setHomeObj] = useState(profile && profile.home ? profile.home : null);
  const [cg, setCg] = useState((profile && profile.caregivers ? profile.caregivers.join(", ") : ""));
  const complete = !!(profile && profile.name && profile.birthdate);
  const returning = complete && !editing && !signedIn;
  const ok = String(name || "").trim() && bd && new Date(bd) < new Date();
  if (returning) return <div className="pad ob">
    <p className="oblogo">〰️</p><h1 className="obt">Welcome back</h1>
    <p className="obs">{profile.name}'s story is waiting.</p>
    <button className="primary full" onClick={() => onDone(profile)}>Continue as {profile.name}'s family</button>
  </div>;
  return <div className="pad ob">
    <p className="oblogo">〰️</p><h1 className="obt">{editing ? "Profile & home" : "Little Rambles"}</h1>
    <p className="obs">{editing ? "Update anything — recommendations adjust immediately." : "Three quick things. No quiz — the app learns by rambling with you."}</p>
    <label className="flab">Child's name</label>
    <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mia" />
    <label className="flab">Birthdate</label>
    <input className="inp" type="date" value={bd} onChange={(e) => setBd(e.target.value)} />
    <label className="flab">Home address <span className="opt">— sets where ideas are searched</span></label>
    <PlaceInput value={home} onChange={setHome} onPick={(h) => { setHome(h.label); setHomeObj(h); }} placeholder="Start typing your address or neighbourhood" allowGps onGps={(h) => { setHome(h.label); setHomeObj(h); }} />
    <label className="flab">Who takes her out? <span className="opt">— comma separated</span></label>
    <input className="inp" value={cg} onChange={(e) => setCg(e.target.value)} placeholder="Mum, Dad, Grandma" />
    <label className="flab">Anything I should know? <span className="opt">— optional, free text</span></label>
    <textarea className="inp ta" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hates water. Loves trains. Naps at 12:30." />
    {(constraints.avoid.length || constraints.love.length) ? <div className="chipline mt">
      {constraints.avoid.map((c) => <span className="badge b-paused" key={c}>avoiding {c}</span>)}
      {constraints.love.map((c) => <span className="badge b-loves" key={c}>likes {c}</span>)}
    </div> : null}
    <p className="fine">I read that line and adjust rankings — you'll see the tags above update as you type.</p>
    <button className="primary full" disabled={!ok} onClick={() => onDone({ ...(profile || {}), name: String(name || "").trim(), birthdate: bd, notes,
      home: homeObj && homeObj.label === String(home || "").trim() ? homeObj : (String(home || "").trim() ? { label: String(home || "").trim() } : (profile && profile.home) || null),
      caregivers: String(cg || "").split(",").map((s) => s.trim()).filter(Boolean), cOff: (profile && profile.cOff) || [] })}>
      {editing ? "Save" : "Start rambling"}</button>
    {onCancel && <button className="ghost full mt" onClick={onCancel}>Cancel</button>}
  </div>;
}
function JournalSheet({ name, onClose, onSave, addMedia }) {
  const [t, setT] = useState(""); const [m, setM] = useState([]);
  return <Sheet onClose={onClose}>
    <div className="eyebrow">✍️ A moment for the story</div>
    <textarea className="inp ta tall2" placeholder="First words, tiny victories, hard days — it all counts." value={t} onChange={(e) => setT(e.target.value)} />
    <div className="btns">
      <label className="pick main">🖼️ Add photos <small>pick several</small><input type="file" accept="image/*" multiple hidden onChange={(e) => addMedia(e, setM)} /></label>
      <label className="pick">📸 Camera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => addMedia(e, setM)} /></label>
    </div>
    {m.length > 0 && <div className="strip">{m.map((x, i) => <button className="tb del" key={i} onClick={() => setM((p) => p.filter((_, j) => j !== i))}>{x.t === "v" ? <span className="vid">🎥</span> : <img src={x.d} alt="" />}<i>✕</i></button>)}</div>}
    <button className="primary full" disabled={!t.trim() && !m.length} onClick={() => onSave(t.trim(), m)}>Save to {name}'s story</button>
    <button className="ghost full mt" onClick={onClose}>Not now</button>
  </Sheet>;
}
function AddActivitySheet({ onClose, onSave, place }) {
  const [f, setF] = useState({ name: "", cat: "sensory", ageMin: 0, query: "", why: "", place: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return <Sheet onClose={onClose}>
    <div className="eyebrow">➕ Add your own</div>
    <p className="why">A type of outing we never suggest, or one specific place you love. It joins your recommendations marked “Yours”.</p>
    <label className="flab">Name</label>
    <input className="inp" value={f.name} onChange={set("name")} placeholder="e.g. Grandma's garden · Trampoline park on Main" />
    <label className="flab">Closest type</label>
    <select className="inp" value={f.cat} onChange={set("cat")}>{Object.entries(CAT_META).map(([c, m]) => <option key={c} value={c}>{m.emoji} {m.label}</option>)}</select>
    <label className="flab">Good from (months old)</label>
    <input className="inp" type="number" min="0" max="84" value={f.ageMin} onChange={set("ageMin")} />
    <label className="flab">Where is it? <span className="opt">— real address search</span></label>
    <PlaceInput value={f.place} onChange={(v) => setF({ ...f, place: v })} onPick={(h) => setF({ ...f, place: h.label, lat: h.lat, lng: h.lng })}
      placeholder="Start typing the place or address" allowGps onGps={(h) => setF({ ...f, place: h.label, lat: h.lat, lng: h.lng })} />
    <label className="flab">Why it's good <span className="opt">— optional</span></label>
    <input className="inp" value={f.why} onChange={set("why")} placeholder="Shade, low swings, never busy" />
    <button className="primary full" disabled={!f.name.trim()} onClick={() => onSave(f)}>Add to my recommendations</button>
    <button className="ghost full mt" onClick={onClose}>Cancel</button>
  </Sheet>;
}
function EditMemSheet({ mem, media, caregivers, onClose, onSave, onSaveNew, onDelete, addMedia }) {
  const isNew = mem.isNew;
  const [place, setPlace] = useState(mem.place || "");
  const [nm, setNm] = useState(isNew ? "" : mem.name || "");
  const [note, setNote] = useState(mem.note || "");
  const [rating, setRating] = useState(mem.rating || null);
  const [by, setBy] = useState(mem.by || "");
  const [date, setDate] = useState(new Date(mem.ts || Date.now()).toISOString().slice(0, 10));
  const [cat, setCat] = useState(mem.cat || "nature");
  const [m, setM] = useState(media);
  const [del, setDel] = useState(false);
  return <Sheet onClose={onClose}>
    <div className="eyebrow">{isNew ? "📍 An outing we did on our own" : "✏️ Edit memory"}</div>
    {isNew && <><label className="flab">What was it?</label><input className="inp" value={nm} onChange={(e) => setNm(e.target.value)} placeholder="Beach with cousins" />
      <label className="flab">Type</label><select className="inp" value={cat} onChange={(e) => setCat(e.target.value)}>{Object.entries(CAT_META).map(([c, x]) => <option key={c} value={c}>{x.emoji} {x.label}</option>)}</select>
      <label className="flab">When</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></>}
    <div className="lbl">How did it go?</div>
    <div className="rates">{Object.entries(RATE).map(([k, x]) => <button key={k} className={"rb " + x.c + (rating === k ? " on" : "")} onClick={() => setRating(k)}><span className="e">{x.e}</span><span>{x.l}</span></button>)}</div>
    {mem.kind !== "journal" && <><input className="inp" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Which place exactly? (name or address)" />
      {place.trim() && <a className="more" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place)} target="_blank" rel="noreferrer">Check this place on Maps ↗</a>}</>}
    <textarea className="inp ta" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes or a reminder for next time" />
    {caregivers.length > 1 && <select className="inp" value={by} onChange={(e) => setBy(e.target.value)}><option value="">Who was there?</option>{caregivers.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
    <div className="btns">
      <label className="pick main">🖼️ Add photos <small>pick several</small><input type="file" accept="image/*" multiple hidden onChange={(e) => addMedia(e, setM)} /></label>
      <label className="pick">📸 Camera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => addMedia(e, setM)} /></label>
      <label className="pick">🎥 Video<input type="file" accept="video/*" hidden onChange={(e) => addMedia(e, setM)} /></label>
    </div>
    {m.length > 0 && <div className="strip">{m.map((x, i) => <button className="tb del" key={i} onClick={() => setM((p) => p.filter((_, j) => j !== i))}>{x.t === "v" ? <span className="vid">🎥</span> : <img src={x.d} alt="" />}<i>✕</i></button>)}</div>}
    <button className="primary full" onClick={() => isNew ? onSaveNew({ name: nm || "Our own outing", cat, date, rating, note: note.trim(), place: place.trim(), by }, m) : onSave({ place: place.trim() || null, note: note.trim(), rating, by }, m)}>
      {isNew ? "Add to the story" : "Save changes"}</button>
    {!isNew && <button className="danger" onClick={() => (del ? onDelete() : setDel(true))}>{del ? "⚠️ Tap again to delete forever" : "Delete this memory"}</button>}
    <button className="ghost full mt" onClick={onClose}>Cancel</button>
  </Sheet>;
}

/* ============================== CSS ============================= */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;700&display=swap');
*{box-sizing:border-box}
.root{min-height:100vh;background:#E9EAE0;display:flex;justify-content:center;font-family:'Karla',system-ui,sans-serif;color:#29382F}
.phone{width:100%;max-width:460px;background:#F6F5EF;display:flex;flex-direction:column;min-height:100vh;position:relative;box-shadow:0 0 40px rgba(41,56,47,.12)}
.mid{align-items:center;justify-content:center}.big{font-size:40px}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px}
.brand{display:flex;align-items:center;gap:7px;font-family:'Fraunces',Georgia,serif;font-size:18px}
.ver{font-family:'Karla';font-size:10px;font-weight:700;color:#8A8875;background:#ECEAE0;border-radius:99px;padding:2px 6px}
.locedit-box{margin:0 16px 10px;padding:12px;background:#FFF;border:2px solid #29382F;border-radius:16px}
.locrow{display:flex;gap:8px;align-items:center}
.inp.flat{margin-bottom:0}
.mini.x{padding:8px 10px}
.locsug{display:flex;flex-direction:column;gap:4px;margin:8px 0}
.sug{text-align:left;background:#F6F5EF;border:1px solid #E3E1D6;border-radius:10px;padding:9px 11px;font-family:'Karla';font-size:13px;font-weight:700;color:#29382F;cursor:pointer}
.sug.gps{background:#DEEAEF;border-color:#8FB3C0;color:#33606F}
.hdrright{display:flex;gap:6px;align-items:center}
.kidchip{background:#29382F;color:#F6F5EF;border:none;border-radius:99px;padding:7px 12px;font-family:'Karla';font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.searching{font-size:12.5px;font-weight:700;color:#33606F;margin:6px 2px}
.warnbox{background:#FBEAC9;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.5;margin:6px 0}
.warnbox .sug{margin-top:8px;background:#FFF}
.locbar{display:flex;align-items:center;gap:8px;margin:0 16px 10px;padding:10px 13px;background:#FFF;border:1.5px solid #DDDACB;border-radius:14px;font-family:'Karla';font-size:13.5px;font-weight:700;color:#29382F;cursor:pointer;text-align:left}
.loctext{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.locedit{font-size:11.5px;color:#33606F;border-bottom:1.5px dotted #8FB3C0}
.topnav{display:flex;gap:8px;padding:6px 14px 14px;overflow:visible}
.tb{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:62px;background:#FFF;border:1.5px solid #E3E1D6;border-radius:16px;padding:10px 2px;font-family:'Karla';font-weight:700;color:#8A8875;cursor:pointer;line-height:1.1}
.ti{font-size:19px;line-height:1}
.tl{font-size:11.5px;letter-spacing:.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.tb.on{background:#29382F;color:#F6F5EF;border-color:#29382F}
.dot{position:absolute;top:-7px;right:-3px;min-width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:#E9A23B;color:#29382F;border-radius:99px;font-size:11px;font-style:normal;font-weight:700;padding:0 5px;box-shadow:0 1px 3px rgba(41,56,47,.25)}
.scroll{flex:1;overflow-y:auto;padding-bottom:26px}
.pad{padding:2px 16px 20px}
.bandline{font-family:'Fraunces',Georgia,serif;font-style:italic;font-size:14px;color:#5A6B60;margin:2px 0 12px;line-height:1.45}
.card{background:#FFF;border:1px solid #E3E1D6;border-radius:18px;padding:16px;margin-bottom:13px;overflow:hidden}
.card.dash{border-style:dashed}.card.out{border:2px solid #8FB3C0}.card.hl{border:2px solid #E9A23B}
.dim{opacity:.72}
.art{margin:-16px -16px 12px;height:96px;position:relative;overflow:hidden;background:#ECEAE0}
.art.tall{height:250px;margin:-18px -18px 14px}
.art img,.genart{width:100%;height:100%;object-fit:cover;display:block}
.ae{position:absolute;left:12px;bottom:8px;font-size:24px;background:rgba(246,245,239,.9);border-radius:99px;padding:3px 9px;line-height:1}
.ae.big2{font-size:40px;background:none;left:16px;bottom:10px}
.rowtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:4px}
.ctitle{font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:600;margin:0}
.dtitle{font-family:'Fraunces',Georgia,serif;font-size:23px;font-weight:600;margin:4px 0 2px;line-height:1.15}
.dsub{font-size:12.5px;font-weight:700;color:#8A8875;margin:0 0 6px}
.msub{font-size:12.5px;font-weight:400;color:#8A8875}
.why{font-size:14px;line-height:1.5;margin:0 0 8px;color:#3D4A42}
.eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#8A8875;margin-bottom:5px}
.lbl{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.3px;color:#8A8875;margin:16px 0 8px}
.fine{font-size:11.5px;color:#8A8875;line-height:1.5;margin:8px 0 0}.center{text-align:center}
.badge{font-size:10.5px;font-weight:700;border-radius:99px;padding:4px 8px;white-space:nowrap}
.b-loves{background:#FBEAC9;color:#9A6410}.b-great{background:#DDE8DC;color:#2F5138}.b-retry{background:#DEEAEF;color:#33606F}
.b-paused,.b-later{background:#ECEAE0;color:#7B7965}.b-yours{background:#E7DFF3;color:#5B4A7A}
.av{font-size:10.5px;font-weight:700;border-radius:99px;padding:4px 8px;white-space:nowrap}
.a-open{background:#DDE8DC;color:#2F5138}.a-soon,.a-closing{background:#FBEAC9;color:#9A6410}.a-closed{background:#ECEAE0;color:#8A8875}
.aff{font-size:10.5px;font-weight:700;border-radius:99px;padding:4px 8px;background:#F0EFE4;color:#5A6B60}
.chipline,.affs{display:flex;gap:5px;flex-wrap:wrap;margin:4px 0 8px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.btns2{display:flex;flex-direction:column;gap:8px;margin:10px 0}
.primary{background:#29382F;color:#F6F5EF;border:none;border-radius:12px;padding:12px 16px;font-family:'Karla';font-size:14.5px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;text-align:center}
.primary.sm{padding:9px 13px;font-size:13.5px}.primary.full{width:100%;margin-top:10px}
.primary:disabled{background:#B5B2A0}
.ghost{background:transparent;border:1.5px solid #C9C6B4;border-radius:12px;padding:12px 16px;font-family:'Karla';font-size:14.5px;font-weight:700;color:#29382F;cursor:pointer;text-decoration:none;display:inline-block;text-align:center}
.ghost.sm{padding:9px 13px;font-size:13.5px}.ghost.full{width:100%}.mt{margin-top:8px}
.wide.alt{background:#FFF;border-color:#C9C6B4;color:#4A554D;border-style:solid}
.wide{width:100%;background:#FBEAC9;border:1.5px dashed #E9A23B;border-radius:14px;padding:12px;font-family:'Karla';font-weight:700;font-size:13.5px;color:#9A6410;cursor:pointer;margin-top:6px}
.danger{width:100%;background:none;border:none;color:#A14E33;font-family:'Karla';font-weight:700;font-size:13px;margin-top:12px;cursor:pointer}
.more{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#33606F;text-decoration:none;border-bottom:1.5px dotted #8FB3C0}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px}
.chip{background:#FFF;border:1.5px solid #DDDACB;border-radius:99px;padding:7px 12px;font-family:'Karla';font-size:12.5px;font-weight:700;color:#4A554D;cursor:pointer}
.chip.on{background:#29382F;color:#F6F5EF;border-color:#29382F}.chip.tiny{padding:6px 9px}
.inp{width:100%;border:1.5px solid #DDDACB;border-radius:12px;padding:11px 13px;font-family:'Karla';font-size:14px;background:#FFF;margin-bottom:10px;color:#29382F}
.inp::placeholder{color:#A5A28E}.ta{min-height:70px;resize:vertical}.tall2{min-height:110px}
.flab{display:block;font-size:12.5px;font-weight:700;margin:10px 0 5px}.opt{font-weight:400;color:#8A8875}
.deckwrap{position:relative}
.deckcard.behind{position:absolute;left:0;right:0;top:0;bottom:0;transform:scale(.95) translateY(10px);opacity:.45;box-shadow:none;pointer-events:none;z-index:0;overflow:hidden}
.deckcard.hint{animation:nudge 2.6s ease-in-out 1.2s 2}
@keyframes nudge{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-22px) rotate(-1.6deg)}60%{transform:translateX(22px) rotate(1.6deg)}}
.swipehint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);background:rgba(41,56,47,.86);color:#F6F5EF;font-size:11.5px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:99px;z-index:4}
.deckcard{position:relative;z-index:1;background:#FFF;border:2px solid #29382F;box-shadow:5px 5px 0 #E9A23B;border-radius:20px;padding:18px;touch-action:pan-y;cursor:grab;user-select:none;position:relative;overflow:hidden}
.deckbody{position:relative}
.stamp{position:absolute;top:14px;font-size:15px;font-weight:700;padding:6px 12px;border-radius:8px;z-index:3;letter-spacing:1px}
.stamp.yes{right:14px;background:#DDE8DC;color:#2F5138;border:2px solid #2F5138}
.stamp.no{left:14px;background:#F6DDD5;color:#A14E33;border:2px solid #A14E33}
.deckbtns{display:flex;gap:8px;margin-top:12px}
.dbtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;border-radius:14px;padding:11px 4px;font-family:'Karla';font-size:11.5px;font-weight:700;cursor:pointer;text-decoration:none;border:1.5px solid #DDDACB;background:#FFF;color:#29382F}
.dbtn span{font-size:11.5px}.dbtn.skip{font-size:19px}.dbtn.save{font-size:19px}
.dbtn.go{background:#29382F;color:#F6F5EF;border-color:#29382F;font-size:19px}
.nudge{display:flex;gap:9px;background:#FBEAC9;border-radius:14px;padding:12px;margin:8px 0;align-items:flex-start}
.nudge p{margin:0;font-size:13px;line-height:1.5}.nudge.sm p{font-size:12.5px}
.stats{display:flex;gap:6px;margin:6px 0 4px}
.st{flex:1;background:#FFF;border:1px solid #E3E1D6;border-radius:13px;padding:9px 3px;text-align:center}
.st b{display:block;font-family:'Fraunces',Georgia,serif;font-size:15px}
.st span{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8A8875}
.catstats{display:flex;flex-wrap:wrap;gap:6px}
.catstat{display:inline-flex;align-items:center;gap:6px;background:#FFF;border:1px solid #E3E1D6;border-radius:99px;padding:6px 11px;font-size:12px;font-weight:700}
.catstat b{background:#29382F;color:#F6F5EF;border-radius:99px;padding:1px 7px;font-size:11px}
.ins{margin:8px 0}
.in{display:flex;gap:9px;border-radius:13px;padding:11px 12px;margin-bottom:7px;font-size:13px;line-height:1.45;align-items:flex-start}
.in p{margin:0}.in.up{background:#DEEAEF}.in.pa{background:#ECEAE0}
.mem{background:#FFF;border:1px solid #E3E1D6;border-radius:15px;padding:13px 14px;margin-bottom:9px}
.mem.jr{border-left:4px solid #E9A23B}.mem.cu{border-left:4px solid #8FB3C0}
.memhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px}
.hr{display:flex;align-items:center;gap:5px}
.date{font-size:11px;font-weight:700;color:#8A8875;text-transform:uppercase;letter-spacing:.9px}
.pill{font-size:11.5px;font-weight:700;border-radius:99px;padding:3px 8px}
.r-loved{background:#F6DDD5;color:#A14E33}.r-fine{background:#ECEAE0;color:#6B695A}.r-nope{background:#DEEAEF;color:#33606F}
.jrp{background:#FBEAC9;color:#9A6410}.cup{background:#DEEAEF;color:#33606F}
.mini{border:none;background:#F0EFE4;border-radius:8px;padding:4px 7px;cursor:pointer;font-size:12px}
.mtitle{font-family:'Fraunces',Georgia,serif;font-size:15.5px;font-weight:600;margin-bottom:3px}
.mnote{font-size:13px;font-style:italic;color:#5A6B60}
.jtext{font-family:'Fraunces',Georgia,serif;font-size:14.5px;line-height:1.55;color:#3D4A42}
.strip{display:flex;gap:9px;flex-wrap:wrap;margin:12px 4px 8px}
.tb{border:none;padding:0;background:none;cursor:pointer;position:relative;border-radius:10px;overflow:hidden}
.tb img{width:62px;height:62px;object-fit:cover;display:block;border:1px solid #E3E1D6;border-radius:10px}
.vid{display:flex;width:62px;height:62px;align-items:center;justify-content:center;background:#29382F;color:#F6F5EF;border-radius:10px;font-size:22px}
.tb.del{overflow:visible}
.tb.del i{position:absolute;top:-6px;right:-6px;z-index:3;box-shadow:0 1px 3px rgba(0,0,0,.3);background:#A14E33;color:#FFF;border-radius:99px;font-size:11px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.gc{border:none;padding:0;background:none;cursor:pointer;border-radius:11px;overflow:hidden;aspect-ratio:1}
.gc img{width:100%;height:100%;object-fit:cover;display:block}
.gc .vid{width:100%;height:100%;border-radius:0}
.uarow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #E3E1D6;font-size:13.5px;font-weight:700}
.sheetbg{position:absolute;inset:0;background:rgba(41,56,47,.45);display:flex;align-items:flex-end;z-index:30;overflow:auto}
.sheet{background:#F6F5EF;width:100%;border-radius:20px 20px 0 0;padding:18px 16px 24px;max-height:92vh;overflow-y:auto}
.rates{display:flex;gap:8px;margin-bottom:10px}
.rb{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;border:1.5px solid #DDDACB;border-radius:14px;padding:11px 4px;background:#FFF;font-family:'Karla';font-size:12px;font-weight:700;cursor:pointer;color:#29382F}
.rb.on{border-color:#29382F;border-width:2.5px;background:#F0EFE4}
.rb .e{font-size:24px}
.pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pillbtn{border:1.5px solid #DDDACB;background:#FFF;border-radius:99px;padding:10px 16px;font-family:'Karla';font-size:13.5px;font-weight:700;color:#29382F;cursor:pointer;text-decoration:none;display:inline-block}
.pillbtn.dark{background:#29382F;color:#F6F5EF;border-color:#29382F}
.sugrow{display:flex;gap:6px;align-items:stretch}
.sugrow .sug{flex:1}
.sug b{display:block;font-size:13px}
.sug small{display:block;font-size:11px;font-weight:400;color:#8A8875;margin-top:2px}
.sughome{border:1px solid #E3E1D6;background:#FBEAC9;border-radius:10px;padding:0 12px;cursor:pointer;font-size:15px}
.card.mine{border-left:4px solid #8B6FB0}
.placewrap{margin-bottom:6px}
.chip.prof{font-size:12px;white-space:nowrap}
.pick.main{background:#29382F;color:#F6F5EF;border-style:solid;border-color:#29382F;flex:1}
.pick.main small{display:block;font-size:10px;font-weight:400;opacity:.8}
.pick{display:inline-flex;align-items:center;border:1.5px dashed #C9C6B4;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700;color:#4A554D;cursor:pointer;background:#FFF}
.lb{position:absolute;inset:0;background:rgba(41,56,47,.9);display:flex;align-items:center;justify-content:center;z-index:40;padding:18px}
.lbin{width:100%}.lbin img,.lbin video{width:100%;border-radius:14px;display:block}
.lbl2{color:#F6F5EF;text-align:center;font-size:12.5px;font-weight:700;margin:10px 0}
.ob{padding-top:34px}
.oblogo{font-size:34px;text-align:center;margin:0}
.obt{font-family:'Fraunces',Georgia,serif;font-size:27px;font-weight:600;text-align:center;margin:5px 0 6px}
.obs{font-size:14px;color:#5A6B60;text-align:center;line-height:1.5;margin:0 0 18px}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);width:min(430px,92vw);z-index:50;background:#29382F;color:#F6F5EF;border-radius:14px;padding:12px 15px;font-size:13px;line-height:1.45;box-shadow:0 8px 24px rgba(41,56,47,.3)}
`;
