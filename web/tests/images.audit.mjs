/* images.audit — turns "is every picture good?" into a query.
   Three gates, in increasing strength:
     1. coverage  — every activity has an entry
     2. liveness  — every URL resolves as an actual image (catches 404 rot)
     3. review    — nothing is verified:null
   Gate 3 fails today by design: it is the open debt (docs/DEBT.md T1) and the
   audit is what will tell us when it is closed. Pass --strict in a release
   check to make gate 3 fatal; by default it reports and exits 0 so the gap is
   visible without blocking day-to-day work.

   Run: npm run audit:images */
import { readFileSync } from "node:fs";
import { ACTIVITIES } from "../data.js";

const strict = process.argv.includes("--strict");
const manifest = JSON.parse(readFileSync(new URL("../content/images.json", import.meta.url), "utf8"));
const rows = manifest.images;
const byId = new Map(rows.map((r) => [r.id, r]));

console.log("\nimage audit — " + rows.length + " entries for " + ACTIVITIES.length + " activities\n");
let hard = 0;

/* --- 1. coverage --- */
const missing = ACTIVITIES.filter((a) => !byId.has(a.id));
if (missing.length) { hard++; console.log("  FAIL  coverage — " + missing.length + " activities have no image: " + missing.slice(0, 8).map((a) => a.id).join(", ")); }
else console.log("  PASS  coverage — every activity has an image entry");

/* --- 2. liveness (network) --- */
const dead = [];
let i = 0;
const worker = async () => {
  while (i < rows.length) {
    const r = rows[i++];
    try {
      const res = await fetch(r.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const ct = res.headers.get("content-type") || "";
      if (res.status !== 200 || !/^image\//.test(ct)) dead.push({ id: r.id, name: r.name, status: res.status });
    } catch (e) { dead.push({ id: r.id, name: r.name, status: "ERR" }); }
  }
};
await Promise.all(Array.from({ length: 12 }, worker));

if (dead.length) {
  hard++;
  console.log("  FAIL  liveness — " + dead.length + "/" + rows.length + " URLs do not resolve as an image:");
  dead.sort((a, b) => a.id.localeCompare(b.id)).forEach((d) => console.log("          " + d.id.padEnd(22) + String(d.status).padEnd(6) + d.name));
} else console.log("  PASS  liveness — all " + rows.length + " URLs resolve as images");

/* --- 3. human review --- */
const good = rows.filter((r) => r.verified === "human");
const bad = rows.filter((r) => r.verified === "rejected");
const unseen = rows.filter((r) => r.verified == null);
console.log("  ----  review — " + good.length + " confirmed · " + bad.length + " rejected · " + unseen.length + " not yet looked at");
if (bad.length || unseen.length) {
  const msg = "  " + (strict ? "FAIL" : "TODO") + "  " + (bad.length + unseen.length) + "/" + rows.length +
              " still need a replacement image (docs/DEBT.md T1)";
  console.log(msg);
  if (strict) hard++;
  /* Show what is wrong, grouped, so the work is legible rather than a number. */
  const byReason = {};
  bad.forEach((r) => { const k = r.note.startsWith("404") ? "dead URL" : "wrong subject"; (byReason[k] = byReason[k] || []).push(r.id); });
  Object.entries(byReason).forEach(([k, ids]) => console.log("          " + k + " (" + ids.length + "): " + ids.slice(0, 6).join(", ") + (ids.length > 6 ? " …" : "")));
} else console.log("  PASS  review — every image has been looked at and confirmed");

console.log("\n" + (hard ? hard + " gate(s) FAILED" : "image audit clean" + (unreviewed.length ? " (review still outstanding)" : "")) + "\n");
process.exit(hard ? 1 : 0);
