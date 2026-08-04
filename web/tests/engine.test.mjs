/* engine.test — the pure layer, in Node, with no DOM and no browser.
   Every case here is a bug that actually shipped and was caught late in a
   founder device round. That is the argument for this file existing: these
   cost days to find through a phone, and milliseconds to find here.

   Run: npm run test:engine */
import { availability } from "../engine/availability.js";
import { parseConstraints, cmapFor, UNDERSTOOD } from "../engine/constraints.js";
import { haversine, fmtKm, directionsTo, venueQuery } from "../lib/geo.js";
import { fmtHour, fmtAge, monthsOld } from "../lib/format.js";

const fails = [];
const ok = (name, cond, detail) => {
  if (cond) console.log("  PASS  " + name + (detail ? "  [" + detail + "]" : ""));
  else { console.log("  FAIL  " + name + (detail ? " — " + detail : "")); fails.push(name); }
};
const eq = (name, got, want) => ok(name, got === want, "got " + JSON.stringify(got) + ", want " + JSON.stringify(want));

console.log("\nengine unit tests\n");

/* ---------- availability: season is not the same as closed (FB4-02) ---------- */
const daily = { days: [0,1,2,3,4,5,6], open: 9, close: 17, conf: "daily", months: null };
const winter = { ...daily, months: [12, 2] };          // Dec–Feb, wraps the year
const summer = { ...daily, months: [6, 8] };

const at = (mo, d, h) => new Date(2026, mo - 1, d, h, 0, 0);
eq("winter activity in August is offseason",
   availability({ hours: winter }, at(8, 2, 12)).st, "offseason");
eq("winter activity in January is open",
   availability({ hours: winter }, at(1, 15, 12)).st, "open");
eq("wrapping season includes December",
   availability({ hours: winter }, at(12, 20, 12)).st, "open");
eq("summer activity in January is offseason",
   availability({ hours: summer }, at(1, 15, 12)).st, "offseason");
eq("shut for the night is 'closed', NOT 'offseason'",
   availability({ hours: daily }, at(8, 2, 22)).st, "closed");
ok("offseason ranks below closed, so it can be excluded separately",
   availability({ hours: winter }, at(8, 2, 12)).rank < availability({ hours: daily }, at(8, 2, 22)).rank,
   "offseason " + availability({ hours: winter }, at(8, 2, 12)).rank + " < closed " + availability({ hours: daily }, at(8, 2, 22)).rank);
eq("an hour before close reads as closing",
   availability({ hours: daily }, at(8, 2, 16.5)).st, "closing");
eq("out-of-season label names the months",
   availability({ hours: winter }, at(8, 2, 12)).label, "In season Dec–Feb");

/* ---------- constraints: avoid must be usable as a HARD gate (FB4-03) ---------- */
const c1 = parseConstraints("hates water, loves trains");
ok("'hates water' is parsed as an avoidance", c1.avoid.includes("water"), JSON.stringify(c1.avoid));
ok("'loves trains' is parsed as a preference", c1.love.includes("machines & rides"), JSON.stringify(c1.love));
ok("water maps to both a category and an affordance",
   cmapFor("water").cats.includes("water") && cmapFor("water").affs.includes("water_play"),
   JSON.stringify(cmapFor("water")));
const c2 = parseConstraints("scared of dogs");
ok("'scared of' counts as avoidance, not preference", c2.avoid.includes("animals"), JSON.stringify(c2));
const c3 = parseConstraints("loves water but hates water");
ok("a conflict resolves to avoid — the cautious reading wins",
   c3.avoid.includes("water") && !c3.love.includes("water"), JSON.stringify(c3));
const c4 = parseConstraints("");
ok("an empty note produces no constraints", c4.avoid.length === 0 && c4.love.length === 0);
const c5 = parseConstraints("naps at 12:30");
ok("an unrelated note produces no constraints", c5.avoid.length === 0 && c5.love.length === 0, JSON.stringify(c5));

/* FB22-03. The founder wrote "love cheese" and nothing happened: the word was
   not in the vocabulary, and the app said so in no way at all. Two fixes —
   a wider vocabulary, and reporting whatever still does not land. */
ok("'loves cheese' is now understood as food",
   parseConstraints("loves cheese").love.includes("food outings"), JSON.stringify(parseConstraints("loves cheese")));
ok("'loves the aquarium' is understood as animals",
   parseConstraints("loves the aquarium").love.includes("animals"));
ok("'hates puddles' is understood as water",
   parseConstraints("hates puddles").avoid.includes("water"));
const unk = parseConstraints("loves quantum physics");
ok("a preference we cannot model is REPORTED, not silently dropped",
   unk.unknown.length === 1 && /quantum/.test(unk.unknown[0]), JSON.stringify(unk.unknown));
const mixed = parseConstraints("hates water, loves knitting");
ok("the understood half still works when the other half does not",
   mixed.avoid.includes("water") && mixed.unknown.length === 1, JSON.stringify(mixed));
ok("a note with no preference at all is not reported as misunderstood",
   parseConstraints("naps at 12:30").unknown.length === 0);
ok("the app can say what it does understand", UNDERSTOOD.length >= 10, UNDERSTOOD.length + " concepts");

/* ---------- geo: nearest-first, and real distances (FB3-01) ---------- */
const van = { lat: 49.2827, lng: -123.1207 }, bby = { lat: 49.2488, lng: -122.9805 };
const tor = { lat: 43.6532, lng: -79.3832 };
ok("Vancouver→Burnaby is about 11km", Math.abs(haversine(van, bby) - 10.8) < 1, haversine(van, bby).toFixed(1));
ok("Vancouver→Toronto is about 3360km", Math.abs(haversine(van, tor) - 3359) < 20, Math.round(haversine(van, tor)));
eq("distance is null when a point is missing", haversine(van, { lat: null }), null);
eq("sub-kilometre reads in metres", fmtKm(0.4), "400 m away");
eq("thousands are grouped", fmtKm(3359), "3,359 km away");

/* ---------- geo: Directions means directions (FB8-01) ---------- */
ok("a pin wins over a name, and uses raw coordinates",
   directionsTo("Somewhere", { lat: 49.1, lng: -123.2 }).includes("destination=49.1,-123.2"),
   directionsTo("Somewhere", { lat: 49.1, lng: -123.2 }));
ok("an exact address becomes the destination, not a search",
   directionsTo("1399 Main St, Vancouver", null).startsWith("https://www.google.com/maps/dir/?api=1&destination="),
   directionsTo("1399 Main St, Vancouver", null));
ok("directions never append a 'near home' bias",
   !/near/.test(directionsTo("1399 Main St, Vancouver", null)));
eq("no place and no pin yields no link", directionsTo("", null), null);
ok("a venue search still centres on the active place",
   venueQuery("Aquarium", "Stanley Park", van).includes("@49.2827,-123.1207"),
   venueQuery("Aquarium", "Stanley Park", van));

/* ---------- format ---------- */
eq("noon", fmtHour(12), "12pm");
eq("half past", fmtHour(12.5), "12:30pm");
eq("midnight", fmtHour(0), "12am");
eq("months under two years", fmtAge(22), "22 mo");
eq("years and months above two", fmtAge(30), "2y 6m");
eq("whole years read cleanly", fmtAge(24), "2y");
/* Built from components, not setMonth(): subtracting months from a 31st rolls
   into the next month and makes the expectation drift by one. */
const now = new Date();
const bMonth = now.getMonth() - 22, bY = now.getFullYear() + Math.floor(bMonth / 12);
const bM = ((bMonth % 12) + 12) % 12;
const pad = (n) => String(n).padStart(2, "0");
const bd = bY + "-" + pad(bM + 1) + "-01";
eq("age is derived from the birthdate", monthsOld(bd), now.getDate() >= 1 ? 22 : 21);
eq("a birthdate today reads as 0 months",
   monthsOld(now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate())), 0);

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all " + "engine" + " checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
