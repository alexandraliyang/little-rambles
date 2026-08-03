/* Candidate finder + contact sheet, for replacing rejected activity photos.
   Openverse is queried with category=photograph, but its labels are not
   trustworthy (it files 1896 lithographs as photographs), so the point of this
   script is only to ASSEMBLE candidates. Selection happens by eye, from the
   sheet it renders. Nothing is written to the manifest here. */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ACTIVITIES, KIDQ } from "../data.js";

const OUT = fileURLToPath(new URL("./cand/", import.meta.url));   // gitignored
mkdirSync(OUT, { recursive: true });
const IDS = process.argv.slice(2);
const PER = 4;

const REJECT_TITLE = /draw|illustrat|paint(ing)?\b|clip.?art|cartoon|sketch|engrav|litho|woodcut|poster|stamp|logo|icon|diagram|map\b|chart|vector|render|18\d\d|19[0-4]\d/i;

const verify = async (u) => {
  try { const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
    return r.status === 200 && /^image\//.test(r.headers.get("content-type") || ""); } catch { return false; }
};

const found = {};
for (const id of IDS) {
  const act = ACTIVITIES.find((a) => a.id === id);
  const queries = [KIDQ[id], act && act.name + " children", act && act.name].filter(Boolean);
  const picks = [];
  for (const q of queries) {
    if (picks.length >= PER) break;
    const api = "https://api.openverse.org/v1/images/?q=" + encodeURIComponent(q.replace(/[^a-zA-Z ]/g, " ").trim()) +
      "&page_size=16&category=photograph&license_type=commercial&mature=false";
    let j; try { const r = await fetch(api, { headers: { "User-Agent": "little-rambles/1.0" } }); if (!r.ok) continue; j = await r.json(); } catch { continue; }
    for (const it of (j.results || [])) {
      if (picks.length >= PER) break;
      if (REJECT_TITLE.test(it.title || "")) continue;
      const url = "https://api.openverse.org/v1/images/" + it.id + "/thumb/";
      if (picks.some((p) => p.url === url)) continue;
      if (!(await verify(url))) continue;
      picks.push({ url, title: it.title || "(untitled)", q });
    }
  }
  found[id] = picks;
  console.log(id.padEnd(22) + picks.length + " candidates");
}
writeFileSync(OUT + "candidates.json", JSON.stringify(found, null, 1));

const rows = IDS.map((id) => {
  const act = ACTIVITIES.find((a) => a.id === id);
  const cells = (found[id] || []).map((c, i) =>
    `<figure><img src="${c.url}"/><figcaption>${id}#${i + 1}<br/><span>${(c.title || "").slice(0, 40).replace(/</g, "&lt;")}</span></figcaption></figure>`).join("");
  return `<section><h3>${id} — ${act ? act.name : ""}</h3><div class="row">${cells || "<em>no candidates found</em>"}</div></section>`;
}).join("");

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#fff;font:12px system-ui;padding:10px}
h3{margin:12px 0 6px;font-size:13px;color:#a14e33}
.row{display:flex;gap:8px}
figure{margin:0;width:190px}
img{width:190px;height:130px;object-fit:cover;display:block;background:#f0eee6;border:1px solid #ddd}
figcaption{font-size:10px;line-height:1.25;padding:2px 0}
span{color:#666}
</style>${rows}`;

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 840, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: OUT + "sheet.png", fullPage: true });
console.log("\n" + OUT + "sheet.png");
await browser.close();
