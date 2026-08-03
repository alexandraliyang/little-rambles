/* Record a photo verdict without hand-editing JSON.
   Hand-editing a 155-row file is how notes get lost and commas get dropped, so
   the manifest is written by this instead.

     npm run images:reject splashpad "shows a child painting, not a splash pad"
     npm run images:ok     duckpond   "a duck on water"
     npm run images:show   splashpad
     npm run images:todo                 (what is still outstanding)

   `reject` requires a reason: "wrong" six months from now tells nobody what was
   wrong, and the reason is what makes the replacement findable. */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../content/images.json", import.meta.url);
const m = JSON.parse(readFileSync(FILE, "utf8"));
const [cmd, id, ...rest] = process.argv.slice(2);
const reason = rest.join(" ").trim();
const save = () => { m._updated = new Date().toISOString().slice(0, 10); writeFileSync(FILE, JSON.stringify(m, null, 1) + "\n"); };
const row = (i) => m.images.find((r) => r.id === i);

if (cmd === "todo") {
  const bad = m.images.filter((r) => r.verified !== "human");
  console.log("\n" + bad.length + " of " + m.images.length + " still need a picture\n");
  bad.forEach((r) => console.log("  " + r.id.padEnd(22) + (r.note || "not yet reviewed")));
  console.log("");
  process.exit(0);
}

if (!id) { console.error("usage: images:<ok|reject|show|todo> <activity-id> [reason]"); process.exit(1); }
const r = row(id);
if (!r) {
  const near = m.images.filter((x) => x.id.includes(id) || (x.name || "").toLowerCase().includes(id.toLowerCase())).slice(0, 6);
  console.error("no activity '" + id + "'" + (near.length ? "\ndid you mean: " + near.map((n) => n.id).join(", ") : ""));
  process.exit(1);
}

if (cmd === "show") {
  console.log("\n  " + r.id + " — " + r.name + "\n  verified : " + (r.verified || "not reviewed") +
              "\n  note     : " + (r.note || "-") + "\n  url      : " + r.url + "\n");
  process.exit(0);
}
if (cmd === "reject") {
  if (!reason) { console.error("a reason is required: what is actually in the picture?"); process.exit(1); }
  r.verified = "rejected"; r.note = "wrong subject: " + reason;
} else if (cmd === "ok") {
  r.verified = "human"; r.note = "confirmed by eye: " + (reason || "correct subject");
} else { console.error("unknown command '" + cmd + "'"); process.exit(1); }

r.reviewedOn = new Date().toISOString().slice(0, 10);
save();
const left = m.images.filter((x) => x.verified !== "human").length;
console.log(r.id + " -> " + r.verified + "  (" + left + " of " + m.images.length + " still outstanding)");
