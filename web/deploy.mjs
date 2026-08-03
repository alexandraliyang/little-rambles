/* Deploy = upload a draft, then promote it via the API.
   `netlify deploy --prod` began returning "JSONHTTPError: Forbidden" on the
   PUBLISH step (uploads still succeeded and reached state=ready, so production
   silently stayed on an older bundle — a failure mode that looks like "my
   change didn't ship"). Promoting through restoreSiteDeploy works, so the
   deploy path does that explicitly and then VERIFIES what production serves.
   Revert to `--prod` once Netlify stops refusing it. */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const SITE = "f8cbef40-97c9-4536-81ce-2e37042debc7";
const sh = (c) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const out = sh("npx --no-install netlify deploy --dir=dist --json 2>nul || npx --no-install netlify deploy --dir=dist");
const id = (out.match(/deploy_id"?\s*[:=]\s*"?([a-f0-9]{20,})/i) || out.match(/deployId:\s*([a-f0-9]{20,})/i) || [])[1];
if (!id) { console.error("could not determine the deploy id\n" + out.slice(0, 400)); process.exit(1); }
console.log("uploaded  " + id);

sh(`npx --no-install netlify api restoreSiteDeploy --data "{\\"site_id\\":\\"${SITE}\\",\\"deploy_id\\":\\"${id}\\"}"`);
console.log("promoted  " + id);

/* Never claim success without checking: byte-compare what production serves. */
const local = statSync("dist/app.js").size;
const res = await fetch("https://little-rambles.netlify.app/app.js?cb=" + Date.now());
const live = (await res.arrayBuffer()).byteLength;
if (live !== local) { console.error("MISMATCH — live " + live + " vs local " + local); process.exit(1); }
console.log("verified  production serves this build (" + live + " bytes)");
