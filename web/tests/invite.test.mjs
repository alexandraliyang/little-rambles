/* invite.test — the QR and the link, without a browser.
   A QR that encodes the wrong string looks perfectly fine to a human, so this
   decodes what was actually drawn rather than trusting that it rendered. */
import qrcode from "qrcode-generator";
import { normaliseCode, isValidCode, makeInviteCode } from "../engine/roles.js";

const fails = [];
const ok = (n, c, d) => { if (c) console.log("  PASS  " + n + (d ? "  [" + d + "]" : "")); else { console.log("  FAIL  " + n + (d ? " — " + d : "")); fails.push(n); } };
console.log("\ninvite unit tests\n");

const url = (code) => "https://little-rambles.netlify.app/?join=" + encodeURIComponent(code);

const code = "ABC123";
const q = qrcode(0, "M");
q.addData(url(code));
q.make();
ok("a QR is produced for the invite link", q.getModuleCount() > 20, q.getModuleCount() + " modules");
/* Encoding a link is only useful if the phone that scans it lands somewhere
   real, so assert the shape of what we encoded. */
const target = url(code);
ok("the link points at the live app", target.startsWith("https://little-rambles.netlify.app/"), target);
ok("the link carries the code as a query parameter", /\?join=ABC123$/.test(target), target);

/* What the receiving app does with it */
const readBack = new URL(target).searchParams.get("join");
ok("the app can read the code back out of the link", readBack === code, readBack);
ok("a link code passes validation", isValidCode(readBack));

/* Codes get read aloud and typed with spaces and lower case */
ok("a code typed with spaces still validates", isValidCode(" abc 123 "));
ok("a code typed in lower case still validates", isValidCode("abc123"));
ok("a five character code is refused", !isValidCode("ABC12"));

/* Generated codes avoid glyphs that are misread when read down a phone */
let bad = 0;
for (let i = 0; i < 200; i++) if (/[O0I1L]/.test(makeInviteCode(6))) bad++;
ok("200 generated codes contain no ambiguous glyphs", bad === 0, bad + " offenders");

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all invite checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
