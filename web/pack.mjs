/* Builds web/dist — exactly the files the PWA needs at runtime, and nothing else.
   Deploying web/ directly would ship 38MB of node_modules plus the .jsx sources;
   this keeps the upload to the ~290KB that actually serves the app.

   Run: npm run dist    (from web/) */
import { copyFileSync, mkdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("./", import.meta.url));
const dist = here + "dist/";

/* The runtime set. app.js is the built bundle — main/app/data .jsx are sources
   and deliberately excluded, as are smoke.mjs, pack.mjs and the package files. */
const FILES = [
  "index.html",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

let total = 0;
for (const f of FILES) {
  copyFileSync(here + f, dist + f);
  total += statSync(dist + f).size;
}

/* Netlify/Cloudflare header rules. The shell must revalidate on every load or a
   cached index.html/sw.js pins testers to an old build after a redeploy — which
   is exactly the failure mode that makes "did you get the new version?" a
   recurring question in a founder testing round. */
writeFileSync(dist + "_headers", [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "",
  "/sw.js",
  "  Cache-Control: no-cache",
  "",
  "/index.html",
  "  Cache-Control: no-cache",
  "",
  "/app.js",
  "  Cache-Control: no-cache",
  "",
  /* Netlify guesses octet-stream for .webmanifest. Safari shrugs, but Chrome
     refuses to treat the app as installable unless the type is right, so this
     is what keeps Add-to-Home-Screen working on Android too. */
  "/manifest.webmanifest",
  "  Content-Type: application/manifest+json; charset=utf-8",
  "  Cache-Control: no-cache",
  "",
].join("\n"));

console.log("web/dist ready — " + FILES.length + " files, " + Math.round(total / 1024) + " KB");
for (const f of FILES) console.log("  " + f);
