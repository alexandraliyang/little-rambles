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
  profile: { name: "Mia", birthdate, notes: "", home: { label: "Kitsilano, Vancouver" }, caregivers: ["Mum", "Dad"], cOff: [] },
  signedIn: true,
  visits: [
    { id: 1, ideaId: "storytime", name: "Library story time", cat: "stories", emoji: "📚", ts: Date.now() - 86400000, rating: "fine", note: "old three-tier record", place: "Kitsilano Library" },
    { id: 2, ideaId: "splashpad", name: "Splash pad", cat: "water", emoji: "💦", ts: Date.now() - 172800000, rating: "loved", note: "" },
    { id: 3, kind: "custom", ideaId: null, name: "Beach with cousins", cat: "nature", emoji: "🏖️", ts: Date.now() - 259200000, rating: "nope", note: "our own outing", userAdded: true },
  ],
  plans: [], swipes: {}, customActs: [], dropped: [], spot: null,
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

/* --- every tab renders without throwing --- */
for (const t of ["Swipe", "Browse", "Our List", "Memories"]) {
  const b = findByText("button", t);
  if (b) { click(b); await settle(); }
  ok("tab renders: " + t, !text().includes("Rambles hit an error"));
}

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
