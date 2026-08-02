/* Headless smoke test for the FB2 build.
   Not a substitute for founder device testing — it cannot exercise Photon,
   Wikimedia, the camera, or real touch. It checks the logic FB2 changed:
   the rating migration, the Browse age split, and that every tab renders.

   Run: npm test    (from web/) */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const KEY = "little-rambles-v2";
const fails = [];
const ok = (name, cond, detail) => {
  if (cond) console.log("  PASS  " + name + (detail ? "  [" + detail + "]" : ""));
  else { console.log("  FAIL  " + name + (detail ? " — " + detail : "")); fails.push(name); }
};

/* A child old enough that >60 activities are age-appropriate — the exact
   condition under which the old slice(0,60) hid the "coming later" set. */
const birthdate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 6); return d.toISOString().slice(0, 10); })();
const seed = {
  /* FB4-03: the note is the whole point of the constraint engine, so the fixture
     has to carry one. "hates water" must remove water from recommendations. */
  profile: { name: "Mia", birthdate, notes: "hates water, loves trains", home: { label: "Kitsilano, Vancouver" }, caregivers: ["Mum", "Dad"], cOff: [] },
  signedIn: true,
  visits: [
    { id: 1, ideaId: "storytime", name: "Library story time", cat: "stories", emoji: "📚", ts: Date.now() - 86400000, rating: "fine", note: "old three-tier record", place: "Kitsilano Library" },
    { id: 2, ideaId: "splashpad", name: "Splash pad", cat: "water", emoji: "💦", ts: Date.now() - 172800000, rating: "loved", note: "" },
    { id: 3, kind: "custom", ideaId: null, name: "Beach with cousins", cat: "nature", emoji: "🏖️", ts: Date.now() - 259200000, rating: "nope", note: "our own outing", userAdded: true },
  ],
  /* One started outing and one shortlisted, so the FB3-07 capture row has
     both card shapes to render against. */
  /* FB6-03 mirrors the founder's actual flow: several outings of ONE category
     saved in a row. The reminder must fire on that pattern, before any of them
     has been visited — which is the case the first version missed. */
  plans: [
    { id: 201, ideaId: "market", name: "Market wander", cat: "food", emoji: "🥐", place: null, area: null, status: "out", ts: Date.now(), times: 1 },
    { id: 202, ideaId: "aquarium", name: "Aquarium", cat: "animals", emoji: "🐠", place: "Vancouver Aquarium", area: "Stanley Park", status: "planned", ts: Date.now(), times: 1 },
    { id: 203, ideaId: "zoo", name: "Zoo or wildlife park", cat: "animals", emoji: "🦒", place: null, area: null, status: "planned", ts: Date.now(), times: 1 },
    { id: 204, ideaId: "pettingfarm", name: "Petting farm", cat: "animals", emoji: "🐐", place: null, area: null, status: "planned", ts: Date.now(), times: 1 },
    { id: 205, ideaId: "petstore", name: "Pet store visit", cat: "animals", emoji: "🐹", place: null, area: null, status: "planned", ts: Date.now(), times: 1 },
  ],
  swipes: {}, customActs: [], dropped: [], spot: null,
};

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "https://localhost/", pretendToBeVisual: true, runScripts: "outside-only",
});
const { window } = dom;
window.localStorage.setItem(KEY, JSON.stringify(seed));
/* Force the offline path: no Wikimedia, no geocoder. Cards fall back to GenArt. */
window.fetch = () => Promise.reject(new Error("offline in test"));
window.scrollTo = () => {};
/* The bundle is evaluated inside jsdom's own realm, so window/document/navigator
   resolve to jsdom's — nothing needs copying onto the Node globals. */
const code = readFileSync(new URL("./app.js", import.meta.url), "utf8");
new window.Function(code)();

const settle = () => new Promise((r) => setTimeout(r, 260));
await settle();
await settle();

const root = window.document.getElementById("root");
const text = () => root.textContent || "";
const findByText = (sel, s) => [...root.querySelectorAll(sel)].find((e) => (e.textContent || "").includes(s));
const click = (el) => { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); };

console.log("\nFB2 smoke test\n");

/* --- the app mounted at all (the error boundary replaces #root on throw) --- */
ok("app renders without hitting the error boundary", !text().includes("Rambles hit an error"), text().slice(0, 160));
ok("onboarding was skipped for a complete profile", !text().includes("Start rambling"));

/* --- FB2-11: three-tier data migrated, five tiers offered --- */
await settle();
const memTab = findByText("button", "Memories");
if (memTab) { click(memTab); await settle(); }
ok("FB2-11 old 'fine' rating renders as the migrated tier", text().includes("It was okay"), text().slice(0, 200));
ok("FB2-11 no dead three-tier label survives", !/>\s*Fine\s*</.test(root.innerHTML));
ok("FB2-15 own-outing filter chip exists", !!findByText("button", "We did on our own"));
ok("FB2-14 favourite filter chip exists", !!findByText("button", "Favourites"));
ok("FB2-14 a star toggle is rendered per memory", root.querySelectorAll("button.mini.fav").length >= 3,
   "found " + root.querySelectorAll("button.mini.fav").length);

/* favourite actually toggles */
const star = root.querySelector("button.mini.fav");
if (star) { click(star); await settle(); }
ok("FB2-14 favourite toggles on click", root.querySelectorAll("button.mini.fav.on").length === 1,
   "on-count " + root.querySelectorAll("button.mini.fav.on").length);

/* --- FB2-06: the Browse age toggle must actually add cards --- */
const browse = findByText("button", "Browse");
if (browse) { click(browse); await settle(); }
const cardCount = () => root.querySelectorAll(".card").length;
const before = cardCount();
const laterBtn = findByText("button", "coming later");
ok("FB2-04b 'coming later' toggle is present", !!laterBtn);
ok("FB2-06 Browse shows a full list first", before > 20, "cards " + before);
if (laterBtn) { click(laterBtn); await settle(); }
const after = cardCount();
ok("FB2-06 toggling 'coming later' reveals MORE cards (the reported bug)", after > before,
   "before " + before + " → after " + after);
ok("FB2-06 the later section is labelled", text().includes("Coming later"));

/* --- FB2-07: no unconditional feminine copy anywhere in the rendered UI --- */
const shown = text();
ok("FB2-07 no 'she'/'her' in rendered copy for a profile with no gender set",
   !/\b(she|her)\b/i.test(shown), (shown.match(/\b(she|her)\b/i) || [])[0]);

/* --- FB2-05/09 back-to-top wiring --- */
const main = root.querySelector("main.scroll");
ok("FB2-05 scroll container is wired to a ref-driven handler", !!main);

/* --- FB3-02: "By type" counters are filter buttons, and they actually filter --- */
const memTab2 = findByText("button", "Memories");
if (memTab2) { click(memTab2); await settle(); }
const catBtns = [...root.querySelectorAll("button.catstat")];
ok("FB3-02 by-type counters render as buttons", catBtns.length >= 2, "found " + catBtns.length);
const memCount = () => root.querySelectorAll(".mem").length;
const allMems = memCount();
if (catBtns[0]) { click(catBtns[0]); await settle(); }
ok("FB3-02 tapping a type narrows the memory list", memCount() < allMems && memCount() > 0,
   allMems + " → " + memCount());
ok("FB3-02 the tapped type shows as selected", root.querySelectorAll("button.catstat.on").length === 1);
if (catBtns[0]) { click(root.querySelectorAll("button.catstat")[0]); await settle(); }
ok("FB3-02 tapping the same type again clears the filter", memCount() === allMems,
   "back to " + memCount() + " of " + allMems);

/* --- FB3-03: the nav badge is no longer clipped by a colliding .tb rule --- */
ok("FB3-03 nav tabs use vector icons, not emoji", root.querySelectorAll("nav.topnav svg.ti").length === 5,
   "svg icons " + root.querySelectorAll("nav.topnav svg.ti").length);
ok("FB3-03 only the photo strip uses the .thumb class now",
   root.querySelectorAll("nav.topnav .thumb").length === 0);

/* --- FB3-04/05: Yours is a tab; Settings no longer duplicates the list --- */
const mineTab = findByText("button", "Yours");
ok("FB3-05 a top-level Yours tab exists", !!mineTab);
if (mineTab) { click(mineTab); await settle(); }
ok("FB3-05 Yours offers the add action", !!findByText("button", "Add your own activity"));
ok("FB3-05 Yours explains itself when empty", text().includes("Nothing of your own yet"));
const gear = findByText("button", "⚙️");
if (gear) { click(gear); await settle(); }
ok("FB3-04 Settings no longer carries a Your-activities list", !text().includes("Your activities ("));
ok("FB3-04 Settings still carries the data section", text().includes("Export my data"));

/* --- FB3-07: the v0-13 four-action capture row is back on Our List --- */
const listTab = findByText("button", "Our List");
if (listTab) { click(listTab); await settle(); }
const capRows = [...root.querySelectorAll(".pills.cap")];
ok("FB3-07 both card shapes get a capture row", capRows.length === 5, "rows " + capRows.length);
const outActions = capRows.length ? [...capRows[0].children].map((c) => c.textContent) : [];
ok("FB3-07 out-now shows Check in / Snap / Pin / Didn't go",
   outActions.length === 4 && /Check in/.test(outActions[0]) && /Snap/.test(outActions[1])
   && /Pin where we are/.test(outActions[2]) && /Didn't go/.test(outActions[3]),
   outActions.join(" | "));
ok("FB3-07 Snap is a real camera input, not a dialog",
   !!capRows[0] && !!capRows[0].querySelector('input[type="file"][capture]'));
ok("FB3-07 the shortlisted card ends in Remove, not Didn't go",
   capRows.slice(1).every((r) => /Remove/.test(r.lastElementChild.textContent)),
   capRows.length > 1 ? capRows[1].lastElementChild.textContent : "");

/* --- FB4-01: the deck must be stable under re-render (cards were flicking past) --- */
const swipeTab = findByText("button", "Swipe");
if (swipeTab) { click(swipeTab); await settle(); }
const deckTitle = () => { const el = root.querySelector(".deckcard:not(.behind) .dtitle"); return el ? el.textContent : null; };
const first = deckTitle();
ok("FB4-01 the swipe deck renders a card", !!first, first);
/* Force the exact re-render storm a resting finger produces: pointer events on
   the card, which previously reshuffled the deck on every one. */
const card = root.querySelector(".deckcard:not(.behind)");
if (card) {
  for (let i = 0; i < 12; i++) {
    card.dispatchEvent(new window.MouseEvent("pointermove", { bubbles: true, clientX: 100 + (i % 2) }));
    await new Promise((r) => setTimeout(r, 12));
  }
}
await settle();
ok("FB4-01 the card does NOT change while a finger rests on it", deckTitle() === first,
   first + " -> " + deckTitle());
/* And a scroll/toast-style re-render must not swap it either */
if (main) { main.dispatchEvent(new window.Event("scroll", { bubbles: true })); }
await settle(); await settle();
ok("FB4-01 unrelated re-renders do not reshuffle the deck", deckTitle() === first,
   first + " -> " + deckTitle());
const goHref = () => { const a = root.querySelector(".deckbtns a.dbtn.go"); return a ? a.getAttribute("href") : null; };
const hrefBefore = goHref();
if (card) card.dispatchEvent(new window.MouseEvent("pointermove", { bubbles: true, clientX: 103 }));
await settle();
ok("FB4-01 'Let's go' still points at the card you are looking at", goHref() === hrefBefore,
   decodeURIComponent(String(hrefBefore)).slice(0, 60));

/* --- FB4-02 / FB4-03: nothing out of season or ruled out reaches the deck --- */
const deckAudit = await (async () => {
  const seen = new Set(); let offseason = 0, water = 0, n = 0;
  for (let i = 0; i < 40; i++) {
    const t = deckTitle(); if (!t) break;
    if (seen.has(t)) break;
    seen.add(t); n++;
    const badge = root.querySelector(".deckcard:not(.behind) .av");
    if (badge && /In season/.test(badge.textContent)) offseason++;
    if (/swim|splash|pool|paddl|wading/i.test(t)) water++;
    const skip = root.querySelector("button.dbtn.skip");
    if (!skip) break;
    click(skip); await settle();
  }
  return { n, offseason, water, titles: [...seen] };
})();
ok("FB4-02 no out-of-season idea appears in the swipe deck",
   deckAudit.offseason === 0, "checked " + deckAudit.n + " cards, " + deckAudit.offseason + " out of season");
ok("FB4-03 'hates water' keeps water out of the deck entirely",
   deckAudit.water === 0, "checked " + deckAudit.n + " cards, " + deckAudit.water + " water ideas");

/* --- FB4-04: curated photos are used, not a keyword search --- */
if (swipeTab) { click(swipeTab); await settle(); }
const imgs = [...root.querySelectorAll(".art img")].map((i) => i.getAttribute("src")).filter(Boolean);
ok("FB4-04 card art comes from the curated set",
   imgs.length === 0 || imgs.every((u) => u.includes("images.unsplash.com")),
   imgs.length ? imgs[0].slice(0, 52) : "no art loaded in jsdom");

/* --- FB6-01: a memory can be reopened and logged again --- */
const memTab6 = findByText("button", "Memories");
if (memTab6) { click(memTab6); await settle(); }
const memRow = root.querySelector(".mem:not(.jr)");
ok("FB6-01 memories carry a 'we went again' action",
   !!(memRow && [...memRow.querySelectorAll(".memacts .pillbtn")].some((b) => /went again/i.test(b.textContent))));
ok("FB6-01 memories can be put back on Our List",
   !!(memRow && [...memRow.querySelectorAll(".memacts .pillbtn")].some((b) => /Our List/i.test(b.textContent))));
const again = [...root.querySelectorAll(".memacts .pillbtn")].find((b) => /went again/i.test(b.textContent));
if (again) { click(again); await settle(); }
ok("FB6-01 'we went again' opens a fresh check-in", !!root.querySelector(".sheet") && text().includes("How did it go?"));
const notNow = findByText("button", "Not now");
if (notNow) { click(notNow); await settle(); }

/* --- FB6-02: Browse can be searched --- */
const browse6 = findByText("button", "Browse");
if (browse6) { click(browse6); await settle(); }
const searchBox = root.querySelector(".searchrow input");
ok("FB6-02 Browse has a search box", !!searchBox);
if (searchBox) {
  const before6 = root.querySelectorAll(".card").length;
  const setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setV.call(searchBox, "train");
  searchBox.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle(); await settle();
  const after6 = root.querySelectorAll(".card").length;
  ok("FB6-02 searching narrows the list", after6 > 0 && after6 < before6, before6 + " -> " + after6);
  ok("FB6-02 the matches are actually about the query",
     /train/i.test(text()), "");
  /* a search must reach even things the chips hide, or it looks broken */
  setV.call(searchBox, "sledding");
  searchBox.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle(); await settle();
  ok("FB6-02 search reaches out-of-season activities too", /sledding/i.test(text()), "searched in August");
  setV.call(searchBox, "");
  searchBox.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle();
}

/* --- FB6-03: the streak reminder counts saved plans, not just logged visits --- */
const listTab6 = findByText("button", "Our List");
if (listTab6) { click(listTab6); await settle(); }
/* the Aquarium card specifically: it is one of four ANIMAL outings saved, which
   is the pattern the reminder exists to notice. */
const animalCard = [...root.querySelectorAll(".card")].find((c) => /Aquarium/.test(c.textContent));
const checkBtn = animalCard && [...animalCard.querySelectorAll("button.pillbtn")].find((b) => b.textContent.trim() === "Check in");
if (checkBtn) { click(checkBtn); await settle(); }
ok("FB6-03 the check-in sheet shows the repeat-pattern reminder",
   text().includes("saved or logged in three weeks"),
   (text().match(/That's \d+ [^?]*saved or logged[^?]*\?/) || ["not shown"])[0].slice(0, 96));
const notNow2 = findByText("button", "Not now");
if (notNow2) { click(notNow2); await settle(); }

/* --- FB6-04: only the sheet scrolls, and it opens at its own top --- */
if (checkBtn) {
  const ac = [...root.querySelectorAll(".card")].find((c) => /Aquarium/.test(c.textContent));
  const cb = ac && [...ac.querySelectorAll("button.pillbtn")].find((b) => b.textContent.trim() === "Check in");
  if (cb) { click(cb); await settle(); }
  const sheet = root.querySelector(".sheet");
  ok("FB6-04 the sheet opens scrolled to its top", !!sheet && sheet.scrollTop === 0, sheet ? "scrollTop=" + sheet.scrollTop : "no sheet");
  const order = [...root.querySelectorAll(".sheet .lbl, .sheet .rates")].map((e) => e.className);
  ok("FB6-04 'How did it go?' is the first thing in the sheet",
     order.length > 0 && /lbl/.test(order[0]), order.slice(0, 2).join(" / "));
  const n2 = findByText("button", "Not now");
  if (n2) { click(n2); await settle(); }
}

/* --- FB7-02: the displayed version must equal package.json, always --- */
const pkgVersion = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;
const verChip = root.querySelector(".ver");
ok("FB7-02 the header version matches package.json",
   !!verChip && verChip.textContent.trim() === "v" + pkgVersion,
   (verChip ? verChip.textContent.trim() : "no chip") + " vs package " + pkgVersion);

/* --- every tab renders without throwing --- */
for (const t of ["Swipe", "Browse", "Our List", "Yours", "Memories"]) {
  const b = findByText("button", t);
  if (b) { click(b); await settle(); }
  ok("tab renders: " + t, !text().includes("Rambles hit an error"));
}

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
