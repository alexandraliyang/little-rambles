/* css.audit — every class the app puts on an element has a rule behind it.

   THE BUG THIS EXISTS FOR (FB31-01). The settings menu and the family cards
   shipped with their markup complete and their CSS entirely absent. Nothing
   threw, nothing warned, every other suite passed — 104 device checks included,
   because a `.setrow` with no rule is still a button with the right text in the
   right order. It only showed up on the founder's phone, as rows collapsed into
   run-together text and a member's avatar rendered at the full width of the
   page. A screenshot found it. A test should have.

   A class with no rule is not always a bug — but it is never intentional here,
   because this app has no utility framework and no external stylesheet: if a
   name is in the markup, a rule for it is meant to be in CSS. So the bar is
   zero, and the failure message names the class.

   Static class names only. A name assembled at runtime ("badge b-" + kind)
   cannot be resolved by reading the source, and pretending otherwise would make
   this suite lie about its own coverage.

   Run: npm run audit:css */
import fs from "fs";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL("../", import.meta.url));
const FILES = ["app.jsx", "components/Family.jsx", "components/Invite.jsx",
               "components/Join.jsx", "components/Sheet.jsx"];

const src = FILES.map((f) => fs.readFileSync(dir + f, "utf8")).join("\n");
const app = fs.readFileSync(dir + "app.jsx", "utf8");
const m = app.match(/const CSS = `([\s\S]*?)`;/);
if (!m) { console.error("could not find the CSS block in app.jsx"); process.exit(1); }
const sheet = m[1];

const used = new Map();                      // class -> where we saw it
const note = (raw, where) => raw.split(/\s+/).filter(Boolean).forEach((t) => {
  /* Trailing hyphen means we caught a prefix mid-concatenation, not a class. */
  if (!t.endsWith("-")) used.set(t, where);
});
for (const mm of src.matchAll(/className=["`]([^"`{}]+)["`]/g)) note(mm[1], "literal");
for (const mm of src.matchAll(/className=\{"([^"]+)"/g)) note(mm[1], "conditional");

const styled = (c) => new RegExp("\\." + c.replace(/-/g, "\\-") + "(?![a-zA-Z0-9_-])").test(sheet);
const missing = [...used.keys()].filter((c) => !styled(c)).sort();

console.log("\ncss audit\n");
console.log("  " + used.size + " static class names in markup, " + sheet.length + " bytes of CSS");
if (missing.length) {
  missing.forEach((c) => console.log("  FAIL  ." + c + " is used in the markup and has no rule"));
  console.log("\n" + missing.length + " FAILED — unstyled markup renders as run-together text and full-width images\n");
  process.exit(1);
}
console.log("  PASS  every class in the markup has a rule behind it\n");
console.log("all css checks passed\n");
