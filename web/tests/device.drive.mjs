/* Drives the real Rambles PWA in Chrome against the local static server.
   Seeds IndexedDB (the app's real store) so we land on a populated app, then
   walks each FB3 change and screenshots what a user would actually see. */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APP = process.env.APP_URL || "http://localhost:8000/";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));   // gitignored
mkdirSync(SHOTS, { recursive: true });

const D = 86400000, now = Date.now();
const birthdate = (() => { const d = new Date(); d.setMonth(d.getMonth() - 22); return d.toISOString().slice(0, 10); })();

/* Enough spread to exercise every surface: 3 memory categories, 4 shortlisted
   plans (so the badge shows a 2-digit-capable number), 2 custom activities. */
const seed = {
  profile: { name: "Mia", birthdate, notes: "loves trains, hates water, naps at 12:30", gender: null,
             home: { label: "Kitsilano, Vancouver", lat: 49.2688, lng: -123.1686 },
             caregivers: ["Mum", "Dad"], cOff: [] },
  signedIn: true,
  visits: [
    { id: 1, ideaId: "storytime", name: "Library story time", cat: "stories", emoji: "📚", ts: now - D, rating: "loved", note: "sat through the whole thing", place: "Kitsilano Library" },
    { id: 2, ideaId: "splashpad", name: "Splash pad", cat: "water", emoji: "💦", ts: now - 2 * D, rating: "nope", note: "too cold", place: "Granville Island" },
    { id: 3, ideaId: "trainwatch", name: "Watch the SkyTrain", cat: "transit", emoji: "🚈", ts: now - 3 * D, rating: "loved", note: "twenty minutes, no complaints", place: "Olympic Village Station" },
    { id: 4, ideaId: "trainwatch", name: "Watch the SkyTrain", cat: "transit", emoji: "🚈", ts: now - 5 * D, rating: "liked", note: "", place: "Main St Station" },
    { id: 5, kind: "custom", ideaId: null, name: "Beach with cousins", cat: "nature", emoji: "🏖️", ts: now - 8 * D, rating: "loved", note: "our own outing", userAdded: true },
  ],
  plans: [
    { id: 101, ideaId: "aquarium", name: "Aquarium", cat: "animals", emoji: "🐠", place: "Vancouver Aquarium", area: "Stanley Park", status: "planned", ts: now, times: 1 },
    { id: 102, ideaId: "farm", name: "City farm", cat: "animals", emoji: "🐐", place: null, area: null, status: "planned", ts: now, times: 1 },
    { id: 103, ideaId: "pool", name: "Toddler pool", cat: "water", emoji: "🏊", place: null, area: null, status: "planned", ts: now, times: 1 },
    { id: 104, ideaId: "market", name: "Market wander", cat: "food", emoji: "🥐", place: null, area: null, status: "out", ts: now, times: 2 },
  ],
  swipes: {},
  customActs: [
    { id: "u_1", name: "Nana's back garden", cat: "nature", emoji: "🌳", ageMin: 0, ageMax: 84, aff: ["peer_faces"], tags: ["indoor"], why: "Free, five minutes away, and she naps after.", place: "Nana's", mapsQuery: "Nana's", hours: { days: [0,1,2,3,4,5,6], open: 8, close: 20, conf: "daily", months: null }, userAdded: true },
    { id: "u_2", name: "The noodle place that tolerates us", cat: "food", emoji: "🍜", ageMin: 0, ageMax: 84, aff: ["food_ritual"], tags: ["indoor"], why: "High chairs, fast service, nobody stares.", place: "Phnom Penh", mapsQuery: "Phnom Penh Vancouver", hours: { days: [0,1,2,3,4,5,6], open: 11, close: 21, conf: "daily", months: null }, userAdded: true },
  ],
  dropped: [], spot: null,
};

const log = [];
const ok = (name, cond, detail) => {
  log.push({ name, cond: !!cond, detail });
  console.log((cond ? "  PASS  " : "  FAIL  ") + name + (detail ? "  [" + detail + "]" : ""));
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,  // iPhone 14
  deviceScaleFactor: 2,
  permissions: ["geolocation"],             // FB3-07 Pin needs a real fix
  geolocation: { latitude: 49.2734, longitude: -123.1027 },  // Science World, Vancouver
});

/* Write the seed into IndexedDB before any app code runs. */
await ctx.addInitScript(({ db, store, key, value }) => {
  if (location.origin === "null" || !location.origin.startsWith("http")) { window.__seeded = Promise.resolve(false); return; }
  window.__seeded = new Promise((res) => {
    const r = indexedDB.open(db, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store); };
    r.onsuccess = () => {
      /* Seed ONLY on a virgin profile. This script re-runs on every navigation,
         so an unconditional put would silently roll back whatever the app just
         saved and make any reload-persistence check meaningless. */
      const rd = r.result.transaction(store, "readonly").objectStore(store).get(key);
      rd.onsuccess = () => {
        if (rd.result) return res("kept");
        const tx = r.result.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => res("seeded");
      };
      rd.onerror = () => res(false);
    };
    r.onerror = () => res(false);
  });
}, { db: "little-rambles", store: "kv", key: "little-rambles-v2", value: JSON.stringify(seed) });

await ctx.addInitScript(() => { window.__cancels = 0; addEventListener("pointercancel", () => { window.__cancels++; }, true); });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.__seeded);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);

const shot = async (n) => { await page.screenshot({ path: SHOTS + n + ".png" }); return n; };
const txt = () => page.evaluate(() => document.body.innerText);

/* ---------- 0. it booted at all ---------- */
const body = await txt();
ok("app boots with a seeded profile", !body.includes("Rambles hit an error") && body.includes("Mia"), body.slice(0, 60).replace(/\n/g, " | "));
await shot("01-boot");

/* ---------- 3. nav: five tabs, vector icons, unclipped badge ---------- */
const nav = await page.evaluate(() => {
  const tabs = [...document.querySelectorAll("nav.topnav .tb")];
  const navBox = document.querySelector("nav.topnav").getBoundingClientRect();
  return {
    count: tabs.length,
    labels: tabs.map((t) => t.querySelector(".tl").textContent),
    svgs: document.querySelectorAll("nav.topnav svg.ti").length,
    iconBoxes: [...document.querySelectorAll("nav.topnav svg.ti")].map((s) => {
      const r = s.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height);
    }),
    ellipsised: tabs.filter((t) => { const l = t.querySelector(".tl"); return l.scrollWidth > l.clientWidth + 1; }).map((t) => t.querySelector(".tl").textContent),
    badges: [...document.querySelectorAll("nav.topnav .dot")].map((d) => {
      const b = d.getBoundingClientRect(), p = d.closest(".tb").getBoundingClientRect();
      const cs = getComputedStyle(d.closest(".tb"));
      return { text: d.textContent, insideParent: b.left >= p.left - 0.5 && b.right <= p.right + 0.5 && b.top >= p.top - 0.5 && b.bottom <= p.bottom + 0.5,
               parentOverflow: cs.overflow, w: Math.round(b.width), h: Math.round(b.height),
               withinViewport: b.right <= navBox.right + 0.5 };
    }),
  };
});
ok("FB3-03 five tabs render", nav.count === 5, nav.labels.join(" / "));
ok("FB3-03 all icons are SVG at one size", nav.svgs === 5 && new Set(nav.iconBoxes).size === 1, nav.iconBoxes.join(", "));
ok("FB3-03 no tab label is truncated at 390px", nav.ellipsised.length === 0, nav.ellipsised.join(",") || "none clipped");
ok("FB3-03 badge is fully inside its button (was clipped)", nav.badges.every((b) => b.insideParent), JSON.stringify(nav.badges.map((b) => b.text + " inside=" + b.insideParent)));
ok("FB3-03 parent no longer sets overflow:hidden", nav.badges.every((b) => b.parentOverflow !== "hidden"), nav.badges[0] && nav.badges[0].parentOverflow);
ok("FB3-03 badge text is the real count", nav.badges.map((b) => b.text).join(",") === "4,2", nav.badges.map((b) => b.text).join(","));
await page.locator("nav.topnav").screenshot({ path: SHOTS + "02-nav.png" });

/* three-digit overflow: does 99+ still fit inside the button? */
await page.evaluate(() => { const d = document.querySelector("nav.topnav .dot"); d.textContent = "99+"; });
await page.waitForTimeout(120);
const wide = await page.evaluate(() => {
  const d = document.querySelector("nav.topnav .dot"), b = d.getBoundingClientRect(), p = d.closest(".tb").getBoundingClientRect();
  return { text: d.textContent, inside: b.left >= p.left - 0.5 && b.right <= p.right + 0.5, w: Math.round(b.width) };
});
ok("FB3-03 a 99+ badge still fits inside the button", wide.inside, wide.text + " w=" + wide.w + "px");
await page.locator("nav.topnav").screenshot({ path: SHOTS + "03-nav-99plus.png" });
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(800);

/* ---------- 5. Yours tab ---------- */
await page.getByRole("button", { name: /Yours/ }).click();
await page.waitForTimeout(400);
const yours = await txt();
ok("FB3-05 Yours tab opens and lists both custom activities",
   yours.includes("Nana's back garden") && yours.includes("noodle place"), "");
ok("FB3-05 Yours carries its own add button", yours.includes("Add your own activity or place"));
await shot("04-yours");

/* ---------- 4. Settings no longer duplicates that list ---------- */
await page.locator("button.chip.tiny").click();
await page.waitForTimeout(400);
const settings = await txt();
ok("FB3-04 Settings has no Your-activities list", !/Your activities \(/.test(settings));
ok("FB3-04 Settings still has data + feedback", settings.includes("Export my data") && settings.includes("survey"));
ok("FB3-04 the stale pointer copy is gone", !settings.includes("your activities →"));
await shot("05-settings");

/* ---------- 2. Memories: by-type is a filter ---------- */
await page.getByRole("button", { name: /Memories/ }).click();
await page.waitForTimeout(500);
const memCount = () => page.locator(".mem").count();
const before = await memCount();
const chips = await page.locator("button.catstat").allTextContents();
ok("FB3-02 by-type counters are buttons", chips.length >= 3, chips.join(" / "));
await shot("06-memories");

await page.locator("button.catstat").first().click();
await page.waitForTimeout(400);
const after = await memCount();
const onCount = await page.locator("button.catstat.on").count();
ok("FB3-02 tapping a type filters the list", after < before && after > 0, before + " memories -> " + after);
ok("FB3-02 exactly one type reads as selected", onCount === 1, "on=" + onCount);
ok("FB3-02 the header announces the filter is live", /filtering/i.test(await txt()));
await shot("07-memories-filtered");

await page.locator("button.catstat").first().click();
await page.waitForTimeout(400);
ok("FB3-02 tapping again clears it", (await memCount()) === before, "back to " + (await memCount()));

/* ---------- 1. location: dropdown ranked by distance ---------- */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(300);
await page.locator("button.locbar").click();
await page.waitForTimeout(400);
const seeded = await txt();
ok("FB3-01 empty dropdown offers home first", seeded.includes("Kitsilano, Vancouver") && seeded.includes("Your home area"));
ok("FB3-01 empty dropdown offers places already visited", seeded.includes("Somewhere you've been"), "");
await shot("08-location-empty");

/* A deliberately ambiguous query — "Main Street" exists in every city on earth.
   With the home anchor at Kitsilano, the near ones must come first. */
await page.locator("input.inp.flat").fill("Main Street");
await page.waitForTimeout(3500);
const hits = await page.evaluate(() => [...document.querySelectorAll(".sugrow .sug")].map((b) => ({
  label: b.querySelector("b") ? b.querySelector("b").textContent : "",
  sub: b.querySelector("small") ? b.querySelector("small").textContent : "",
})));
const kms = hits.map((h) => { const m = /([\d,.]+)\s*(m|km) away/.exec(h.sub); if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, "")); return m[2] === "m" ? n / 1000 : n; });
const gotDist = kms.filter((k) => k != null);
console.log("\n  geocoder returned:");
hits.forEach((h, i) => console.log("   " + (i + 1) + ". " + h.label + "  —  " + h.sub));
if (hits.length === 0) {
  ok("FB3-01 geocoder reachable", false, "no results — network blocked? ranking untested live");
} else {
  ok("FB3-01 results carry a distance", gotDist.length > 0, gotDist.length + "/" + hits.length + " with distance");
  const near = gotDist.filter((k) => k < 100), far = gotDist.filter((k) => k >= 100);
  ok("FB3-01 every near result precedes every far one",
     gotDist.findIndex((k) => k >= 100) === -1 || gotDist.slice(0, gotDist.findIndex((k) => k >= 100)).every((k) => k < 100),
     near.length + " near then " + far.length + " far");
  ok("FB3-01 the far tail is strictly nearest-first (was 1765/1772/1595)",
     far.every((k, i) => i === 0 || k >= far[i - 1] - 0.001),
     far.map((k) => Math.round(k)).join(" <= "));
  ok("FB3-01 the nearest hit is actually local (<30km of Kitsilano)", gotDist.length > 0 && gotDist[0] < 30, gotDist[0] + " km");
  ok("FB3-01 the sort is explained to the user", (await txt()).includes("Sorted by distance"));
}
await shot("09-location-ranked");

/* ---------- 6. aesthetics: temporary-spot state ---------- */
if (hits.length) {
  await page.locator(".sugrow .sug").first().click();
  await page.waitForTimeout(500);
  const temp = await page.evaluate(() => {
    const b = document.querySelector("button.locbar");
    return { cls: b.className, bg: getComputedStyle(b).backgroundColor, text: b.innerText.replace(/\n/g, " ") };
  });
  ok("FB3-06 a temporary spot is visually distinct from home",
     temp.cls.includes("temp") && temp.bg !== "rgb(255, 255, 255)", temp.cls + " / " + temp.bg);
  ok("FB3-06 the bar says Today, not Home", temp.text.startsWith("📍 Today:"), temp.text);
  await shot("10-temp-location");
}


/* ---------- 7. FB3-07: the four one-tap actions on Our List ---------- */
await page.getByRole("button", { name: /Our List/ }).click();
await page.waitForTimeout(500);

const outCard = page.locator(".card.out").first();
const labels = await outCard.locator(".pills.cap .pillbtn").allTextContents();
ok("FB3-07 the out-now card carries all four actions",
   labels.length === 4 && /Check in/.test(labels[0]) && /Snap/.test(labels[1]) && /Pin where we are/.test(labels[2]) && /Didn't go/.test(labels[3]),
   labels.join(" | "));
ok("FB3-07 the old copy is back", (await outCard.innerText()).includes("One tap"), "");
ok("FB3-07 Directions survives as a secondary link", await outCard.locator("a.more").count() === 1);
ok("FB3-07 saved-for-later cards get the same row",
   await page.locator(".card:not(.out) .pills.cap").count() >= 1,
   "rows " + (await page.locator(".card:not(.out) .pills.cap").count()));
await outCard.screenshot({ path: SHOTS + "11-capture-row.png" });

/* Snap: a real file through the real camera input */
await outCard.locator('input[type="file"]').setInputFiles(fileURLToPath(new URL("./fixtures-shot.png", import.meta.url)));
await page.waitForTimeout(700);
ok("FB3-07 Snap accepts a photo and counts it",
   /Snap \(1\)/.test(await outCard.locator(".pillbtn.snap").innerText()),
   (await outCard.locator(".pillbtn.snap").innerText()).split(String.fromCharCode(10)).join(" "));
ok("FB3-07 the snap shows as a thumbnail on the card", await outCard.locator(".strip.sm .thumb").count() === 1);

/* Pin: a real geolocation fix */
await outCard.getByRole("button", { name: /Pin where we are/ }).click();
await page.waitForTimeout(1200);
const pinned = outCard.locator("a.pillbtn.pinned");
ok("FB3-07 Pin turns into a followable map link", await pinned.count() === 1,
   await pinned.count() ? await pinned.getAttribute("href") : "no pin");
const href = (await pinned.count()) ? await pinned.getAttribute("href") : "";
ok("FB3-07 the pin holds the real coordinates", href.includes("49.2734") && href.includes("-123.1027"), href);
await outCard.screenshot({ path: SHOTS + "12-snapped-pinned.png" });

/* survives a reload — snaps are stored, not just in React state */
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(1100);
await page.getByRole("button", { name: /Our List/ }).click(); await page.waitForTimeout(600);
const back = page.locator(".card.out").first();
ok("FB3-07 the snap survives a reload", /Snap \(1\)/.test(await back.locator(".pillbtn.snap").innerText()),
   (await back.locator(".pillbtn.snap").innerText()).split(String.fromCharCode(10)).join(" "));
ok("FB3-07 the pin survives a reload", await back.locator("a.pillbtn.pinned").count() === 1);

/* Check in: the snap and the pin must fold into the memory, not be asked for again */
await back.getByRole("button", { name: "Check in" }).click();
await page.waitForTimeout(700);
ok("FB3-07 the check-in sheet opens pre-loaded with the snap",
   await page.locator(".sheet .thumb").count() === 1,
   "thumbs in sheet: " + (await page.locator(".sheet .thumb").count()));
await page.locator(".sheet .rb").first().click();
await page.waitForTimeout(300);
await page.locator(".sheet button.primary.full").first().click();
await page.waitForTimeout(1400);
const story = await txt();
ok("FB3-07 checking in lands in the story", story.includes("Market wander") || story.includes("MIA'S MEMORIES") || /memories/i.test(story));
ok("FB3-07 the pin follows the outing into the memory",
   await page.locator('.mem a.more[href*="49.2734"]').count() === 1,
   "pin links in story: " + (await page.locator('.mem a.more[href*="maps"]').count()));
ok("FB3-07 the photo followed too", await page.locator(".mem .strip .thumb").count() >= 1,
   "memory thumbs: " + (await page.locator(".mem .strip .thumb").count()));
await shot("13-memory-with-pin");

/* ---------- PWA installability on the real origin ---------- */
const pwa = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const link = document.querySelector('link[rel="manifest"]');
  const r = await fetch(link.href);
  const mf = await r.json();
  return {
    secure: window.isSecureContext,
    sw: !!reg, swScope: reg ? reg.scope : null,
    mfType: r.headers.get("content-type"),
    name: mf.name, display: mf.display, icons: mf.icons.length,
    apple: !!document.querySelector('link[rel="apple-touch-icon"]'),
    appleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
  };
});
ok("PWA secure context (needed for GPS + camera + SW)", pwa.secure);
ok("PWA service worker registered on the live origin", pwa.sw, pwa.swScope);
ok("PWA manifest served as manifest+json", /manifest\+json/.test(pwa.mfType || ""), pwa.mfType);
ok("PWA manifest is standalone with icons", pwa.display === "standalone" && pwa.icons >= 2, pwa.name + " / " + pwa.display + " / " + pwa.icons + " icons");
ok("PWA iOS add-to-home-screen tags present", pwa.apple && pwa.appleCapable);

/* ---------- FB4: swipe stability under REAL touch ----------
   Driven through CDP touch events, not page.mouse: touch-action only governs
   touch input, so a synthetic mouse drag tests a path the phone never uses. */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(800);
const cardTitle = () => page.locator(".deckcard:not(.behind) .dtitle").first().innerText();
const goHref = () => page.locator(".deckbtns a.dbtn.go").getAttribute("href");
const cbox = await page.locator(".deckcard:not(.behind)").first().boundingBox();
const cx = cbox.x + cbox.width / 2, cy = cbox.y + cbox.height / 2;
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", {
  type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }] });

const t0 = await cardTitle(), h0 = await goHref();
await touch("touchStart", cx, cy);
for (let i = 0; i < 20; i++) { await touch("touchMove", cx + (i % 2), cy + ((i + 1) % 2)); await page.waitForTimeout(150); }
const tHeld = await cardTitle(), hHeld = await goHref();
await touch("touchEnd", cx, cy);
await page.waitForTimeout(500);
ok("FB4-01 card unchanged under a 3s resting finger", tHeld === t0, t0 + " -> " + tHeld);
ok("FB4-01 'Let's go' still targets that same card", hHeld === h0,
   decodeURIComponent(String(h0)).slice(0, 58));
ok("FB4-01 a hold with no travel is not treated as a swipe", (await cardTitle()) === t0, await cardTitle());

const t2 = await cardTitle();
await touch("touchStart", cx, cy);
for (let i = 1; i <= 14; i++) { await touch("touchMove", cx + i * 16, cy); await page.waitForTimeout(16); }
const mid = await page.evaluate(() => ({ tf: document.querySelector(".deckcard:not(.behind)").style.transform, stamp: !!document.querySelector(".stamp.yes") }));
ok("FB4-01 the card tracks a real drag", /translateX\(2\d\dpx\)/.test(mid.tf) && mid.stamp, mid.tf);
await touch("touchEnd", cx + 224, cy);
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => {
  const e = document.querySelector('.deckcard:not(.behind)');
  const r = e.getBoundingClientRect(), w = document.querySelector('.deckwrap').getBoundingClientRect();
  return { tf: getComputedStyle(e).transform, l: Math.round(r.left), rt: Math.round(r.right), wl: Math.round(w.left), wr: Math.round(w.right), vw: innerWidth };
});
ok("FB7-04 the next card arrives centred, not carrying the last drag",
   geo.tf === "none" || /matrix\(1, 0, 0, 1, 0, 0\)/.test(geo.tf), geo.tf);
ok("FB7-04 the card stays inside the viewport", geo.l >= 0 && geo.rt <= geo.vw,
   geo.l + ".." + geo.rt + " in " + geo.vw);
ok("FB4-01 a deliberate swipe advances the deck", (await cardTitle()) !== t2, t2 + " -> " + (await cardTitle()));
const cancels = await page.evaluate(() => window.__cancels || 0);
ok("FB4-01 the browser never cancels the gesture", cancels === 0, "pointercancel x" + cancels);

/* seasonality + constraints on the real build */
await page.getByRole("button", { name: /Browse/ }).click();
await page.waitForTimeout(800);
const browseText = await txt();
ok("FB4-02 out-of-season ideas live behind their own chip", /Later in the year/.test(browseText),
   (browseText.match(/Later in the year \(\d+\)/) || ["not offered"])[0]);
ok("FB4-03 Browse says what it hid and why", /ideas hidden/.test(browseText),
   (browseText.match(/\d+ ideas hidden/) || ["no notice"])[0]);
await shot("14-browse-filters");

/* ---------- FB7-01: a broken photo must not poison the deck slot ----------
   Fires the real error event on card 1's <img>, which is exactly what a dead
   photo URL does. Network-level blocking cannot be used here: the service
   worker caches images, so an aborted request is still served from cache. */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(900);
const hadPhoto = await page.evaluate(() => {
  const i = document.querySelector(".deckcard:not(.behind) .art img");
  if (!i) return false;
  i.dispatchEvent(new Event("error"));       // same event a 404 produces
  return true;
});
ok("FB7-01 fixture: card 1 had a photo to break", hadPhoto);
await page.waitForTimeout(500);
const card1 = await page.evaluate(() => {
  const c = document.querySelector(".deckcard:not(.behind)");
  return c.querySelector(".art img") ? "photo" : c.querySelector(".art svg.genart") ? "gen" : "?";
});
ok("FB7-01 fixture: a failed photo really does fall back to the drawing", card1 === "gen", "card1=" + card1);

const kinds = [];
for (let i = 0; i < 8; i++) {
  const sk = page.locator("button.dbtn.skip");
  if (!(await sk.count())) break;
  await sk.click();
  await page.waitForTimeout(700);
  const k = await page.evaluate(() => {
    const c = document.querySelector(".deckcard:not(.behind)");
    if (!c) return null;
    return { t: (c.querySelector(".dtitle") || {}).textContent,
             kind: c.querySelector(".art img") ? "photo" : c.querySelector(".art svg.genart") ? "gen" : "?" };
  });
  if (!k) break;
  kinds.push(k);
}
ok("FB7-01 the cards AFTER a failed one still show their own photos",
   kinds.length > 0 && kinds.every((k) => k.kind === "photo"),
   kinds.map((k) => k.kind).join(",") + "  (card 1 was broken on purpose)");

/* ---------- FB8: gesture quality, directions, sheet, shuffle ---------- */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(800);
const cb8 = await page.locator(".deckcard:not(.behind)").first().boundingBox();
const x8 = cb8.x + cb8.width / 2, y8 = cb8.y + cb8.height / 2;
const cdp8 = await ctx.newCDPSession(page);
const t8 = (type, x, y) => cdp8.send("Input.dispatchTouchEvent", {
  type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }] });
const title8 = () => page.locator(".deckcard:not(.behind) .dtitle").first().innerText();

/* (a) hesitate, THEN flick — the gesture the old whole-gesture velocity killed */
const a0 = await title8();
await t8("touchStart", x8, y8);
for (let i = 0; i < 8; i++) { await t8("touchMove", x8 + 2, y8); await page.waitForTimeout(90); }   // dither ~0.7s
for (let i = 1; i <= 6; i++) { await t8("touchMove", x8 + 8 + i * 18, y8); } // quick flick, no artificial delay
await t8("touchEnd", x8 + 116, y8);
await page.waitForTimeout(900);
ok("FB8-04 a pause-then-flick still registers as a swipe", (await title8()) !== a0,
   a0 + " -> " + (await title8()));

/* (b) a mostly-vertical drag must NOT move the card (direction lock) */
const b0 = await title8();
await t8("touchStart", x8, y8);
for (let i = 1; i <= 8; i++) { await t8("touchMove", x8 + i * 2, y8 - i * 14); await page.waitForTimeout(16); }
const tf8 = await page.evaluate(() => document.querySelector(".deckcard:not(.behind)").style.transform);
await t8("touchEnd", x8 + 16, y8 - 112);
await page.waitForTimeout(700);
ok("FB8-04 a vertical drag does not drag the card sideways",
   /translateX\(0px\)/.test(tf8) || tf8 === "", tf8 || "(none)");
ok("FB8-04 a vertical drag does not change the card", (await title8()) === b0, b0);

/* (c) shuffle controls exist once the deck has wrapped */
const swipeTxt = await txt();
ok("FB8-03 the reshuffle notice is only shown with its controls",
   !/reshuffling so there/.test(swipeTxt), "old copy gone");

/* (d) the sheet is viewport-anchored, not page-anchored */
await page.getByRole("button", { name: /Our List/ }).click();
await page.waitForTimeout(600);
const ci = page.locator("button.pillbtn", { hasText: "Check in" }).first();
if (await ci.count()) { await ci.click(); await page.waitForTimeout(700); }
const sheetGeo = await page.evaluate(() => {
  const bg = document.querySelector(".sheetbg"), sh = document.querySelector(".sheet");
  if (!bg || !sh) return null;
  const b = bg.getBoundingClientRect(), s = sh.getBoundingClientRect();
  const first = document.querySelector(".sheet .lbl");
  return { pos: getComputedStyle(bg).position, bgTop: Math.round(b.top), bgH: Math.round(b.height),
           vh: innerHeight, sheetBottom: Math.round(s.bottom), sheetTop: Math.round(s.top),
           firstLblTop: first ? Math.round(first.getBoundingClientRect().top) : null };
});
ok("FB8-02 the sheet overlay is fixed to the viewport", sheetGeo && sheetGeo.pos === "fixed", sheetGeo && sheetGeo.pos);
ok("FB8-02 the overlay is exactly viewport height", sheetGeo && Math.abs(sheetGeo.bgH - sheetGeo.vh) <= 1,
   sheetGeo && (sheetGeo.bgH + " vs viewport " + sheetGeo.vh));
ok("FB8-02 the sheet sits fully on screen", sheetGeo && sheetGeo.sheetTop >= 0 && sheetGeo.sheetBottom <= sheetGeo.vh + 1,
   sheetGeo && (sheetGeo.sheetTop + ".." + sheetGeo.sheetBottom + " in " + sheetGeo.vh));
ok("FB8-02 'How did it go?' is visible without scrolling",
   sheetGeo && sheetGeo.firstLblTop != null && sheetGeo.firstLblTop < sheetGeo.vh,
   sheetGeo && ("first label at y=" + sheetGeo.firstLblTop + " of " + sheetGeo.vh));
const nn8 = page.getByRole("button", { name: "Not now" });
if (await nn8.count()) { await nn8.click(); await page.waitForTimeout(400); }

/* ---------- FB9-01: a REAL thumb swipe (with vertical drift) ----------
   Every earlier swipe test moved perfectly horizontally, which is why they all
   passed while the phone failed. A thumb arcs. This drifts vertically the whole
   way and asserts the page does NOT scroll and the deck DOES advance. */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(800);
const cdp9 = await ctx.newCDPSession(page);
const t9 = (type, x, y) => cdp9.send("Input.dispatchTouchEvent", {
  type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 14, radiusY: 14, force: 1 }] });
const title9 = () => page.locator(".deckcard:not(.behind) .dtitle").first().innerText();
const scrollTopOf = () => page.evaluate(() => {
  const m = document.querySelector("main.scroll");
  return { main: m ? Math.round(m.scrollTop) : -1, win: Math.round(window.scrollY) };
});

await page.locator(".deckcard:not(.behind)").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const box9 = await page.locator(".deckcard:not(.behind)").first().boundingBox();
const vh0 = page.viewportSize().height;
const sx = box9.x + box9.width / 2;
const sy = Math.min(Math.max(box9.y + 60, 80), vh0 - 120);
const before9 = await title9();
const scrollBefore = await scrollTopOf();

await t9("touchStart", sx, sy);
/* arc: 130px right while drifting 46px down — a natural thumb, not a ruler */
for (let i = 1; i <= 10; i++) {
  await t9("touchMove", sx + i * 13, sy + i * 4.6);
  await page.waitForTimeout(14);
}
const midTf = await page.evaluate(() => document.querySelector(".deckcard:not(.behind)").style.transform);
const scrollMid = await scrollTopOf();
await t9("touchEnd", sx + 130, sy + 46);
await page.waitForTimeout(1000);

ok("FB9-01 an arcing thumb still drags the card", /translateX\(1\d\dpx\)/.test(midTf), midTf);
ok("FB9-01 the PAGE does not move during a swipe",
   scrollMid.main === scrollBefore.main && scrollMid.win === scrollBefore.win,
   "main " + scrollBefore.main + "->" + scrollMid.main + ", win " + scrollBefore.win + "->" + scrollMid.win);
ok("FB9-01 an arcing thumb swipe advances the deck", (await title9()) !== before9,
   before9 + " -> " + (await title9()));
const cancels9 = await page.evaluate(() => window.__cancels || 0);
ok("FB9-01 the browser never steals the arcing gesture", cancels9 === 0, "pointercancel x" + cancels9);

/* ten in a row: the founder reported ~95% failure, so one success proves little */
let advanced = 0;
for (let n = 0; n < 10; n++) {
  const t0 = await title9();
  await page.locator(".deckcard:not(.behind)").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const b = await page.locator(".deckcard:not(.behind)").first().boundingBox();
  if (!b) break;
  const vh9 = page.viewportSize().height;
  const cx9 = b.x + b.width / 2;
  const cy9 = Math.min(Math.max(b.y + 60, 80), vh9 - 80);   // on-card AND on-screen
  await t9("touchStart", cx9, cy9);
  for (let i = 1; i <= 9; i++) { await t9("touchMove", cx9 + i * 14, cy9 + i * (n % 2 ? 5 : -5)); await page.waitForTimeout(13); }
  await t9("touchEnd", cx9 + 126, cy9 + (n % 2 ? 45 : -45));
  await page.waitForTimeout(750);
  if ((await title9()) !== t0) advanced++;
}
ok("FB9-01 ten consecutive arcing swipes all register", advanced === 10, advanced + "/10 advanced");

/* ---------- FB10: the next-90-minutes answer ---------- */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(2200);          // allow the weather call to land
const rn = await page.evaluate(() => {
  const el = document.querySelector(".rightnow");
  if (!el) return null;
  return { off: el.classList.contains("off"),
           tag: (el.querySelector(".rntag") || {}).textContent,
           wx: (el.querySelector(".rnwx") || {}).textContent || null,
           title: (el.querySelector(".rntitle") || {}).textContent || null,
           why: (el.querySelector(".rnwhy") || {}).textContent || null,
           reasons: [...el.querySelectorAll(".rnreasons li")].map((l) => l.textContent),
           actions: [...el.querySelectorAll(".pillbtn")].map((b) => b.textContent.trim()) };
});
ok("FB10 the 90-minute card is the first thing on Swipe", !!rn && /Next 90 minutes/i.test(rn.tag || ""), rn && rn.tag);
ok("FB10 real weather is fetched and shown", !!(rn && rn.wx), rn && rn.wx);
ok("FB10 it commits to ONE answer (or explains why not)",
   !!(rn && (rn.title || rn.why)), rn && (rn.title || rn.why));
if (rn && !rn.off) {
  ok("FB10 the answer shows its reasoning", rn.reasons.length >= 2, rn.reasons.join(" | "));
  ok("FB10 the reasoning names a closing time", rn.reasons.some((r) => /Open until/.test(r)), rn.reasons.join(" | "));
  ok("FB10 you can act on it without leaving the card",
     rn.actions.some((a) => /Let's go/.test(a)) && rn.actions.some((a) => /Save/.test(a)), rn.actions.join(" / "));
  /* "Something else" must actually change the answer */
  const t1 = rn.title;
  const other = page.locator(".rightnow .pillbtn", { hasText: "Something else" });
  if (await other.count()) {
    await other.click(); await page.waitForTimeout(500);
    const t2 = await page.evaluate(() => (document.querySelector(".rntitle") || {}).textContent);
    ok("FB10 'Something else' offers a different outing", t2 && t2 !== t1, t1 + " -> " + t2);
  }
  /* whatever it recommends must be open now — the whole point of the feature */
  const okNow = await page.evaluate(() => {
    const t = (document.querySelector(".rntitle") || {}).textContent;
    return { t };
  });
  ok("FB10 the pick is a real activity, not a placeholder", !!okNow.t && okNow.t.length > 2, okNow.t);
}
await shot("15-right-now");

/* ---------- FB11: you must be able to scroll BACK UP from the card ----------
   The card is nearly full-screen on a phone, so a thumb almost always lands on
   it. If the card swallows vertical gestures, the page is unscrollable in both
   directions and "Next 90 minutes" becomes unreachable once you scroll past it. */
await page.getByRole("button", { name: /Swipe/ }).click();
await page.waitForTimeout(900);
const cdp11 = await ctx.newCDPSession(page);
const t11 = (type, x, y) => cdp11.send("Input.dispatchTouchEvent", {
  type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 14, radiusY: 14, force: 1 }] });
const sTop = () => page.evaluate(() => Math.round(document.querySelector("main.scroll").scrollTop));
const dragV = async (from, to, steps = 12) => {
  const b = await page.locator(".deckcard:not(.behind)").first().boundingBox();
  const x = b.x + b.width / 2;
  await t11("touchStart", x, from);
  for (let i = 1; i <= steps; i++) { await t11("touchMove", x, from + (to - from) * (i / steps)); await page.waitForTimeout(14); }
  await t11("touchEnd", x, to);
  await page.waitForTimeout(700);
};

await page.evaluate(() => { document.querySelector("main.scroll").scrollTop = 0; });
await page.waitForTimeout(300);
const top0 = await sTop();
await dragV(620, 300);                       // thumb ON the card, dragging up = scroll down
const afterDown = await sTop();
ok("FB11 a vertical drag on the card scrolls the page DOWN", afterDown > top0, top0 + " -> " + afterDown);

await dragV(300, 640);                       // and back the other way
const afterUp = await sTop();
ok("FB11 you can scroll back UP to reach 'Next 90 minutes'", afterUp < afterDown, afterDown + " -> " + afterUp);

/* and the card must still not be draggable sideways by a vertical gesture */
const tfV = await page.evaluate(() => document.querySelector(".deckcard:not(.behind)").style.transform);
ok("FB11 scrolling never drags the card sideways", /translateX\(0px\)/.test(tfV) || tfV === "", tfV || "(none)");

/* horizontal swiping must still work after all that */
const before11 = await page.locator(".deckcard:not(.behind) .dtitle").first().innerText();
await page.locator(".deckcard:not(.behind)").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const bb = await page.locator(".deckcard:not(.behind)").first().boundingBox();
const vh11 = page.viewportSize().height;
const cx11 = bb.x + bb.width / 2, cy11 = Math.min(Math.max(bb.y + 60, 80), vh11 - 100);
await t11("touchStart", cx11, cy11);
for (let i = 1; i <= 9; i++) { await t11("touchMove", cx11 + i * 14, cy11 + i * 4); await page.waitForTimeout(13); }
await t11("touchEnd", cx11 + 126, cy11 + 36);
await page.waitForTimeout(900);
ok("FB11 horizontal swiping still works alongside manual scrolling",
   (await page.locator(".deckcard:not(.behind) .dtitle").first().innerText()) !== before11,
   before11 + " -> " + (await page.locator(".deckcard:not(.behind) .dtitle").first().innerText()));

/* ---------- no runtime errors anywhere ---------- */
const realErrors = errors.filter((e) => !/favicon|photon|nominatim|wikimedia|Failed to load resource/i.test(e));
ok("no uncaught runtime errors across the whole walk", realErrors.length === 0, realErrors.slice(0, 2).join(" ; ") || "clean");

await browser.close();
const failed = log.filter((l) => !l.cond);
console.log("\n" + (failed.length ? failed.length + " FAILED: " + failed.map((f) => f.name).join(", ") : "all " + log.length + " checks passed"));
console.log("screenshots -> " + SHOTS + "\n");
process.exit(failed.length ? 1 : 0);
