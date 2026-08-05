/* engine.test — the pure layer, in Node, with no DOM and no browser.
   Every case here is a bug that actually shipped and was caught late in a
   founder device round. That is the argument for this file existing: these
   cost days to find through a phone, and milliseconds to find here.

   Run: npm run test:engine */
import { availability } from "../engine/availability.js";
import { parseConstraints, cmapFor, UNDERSTOOD } from "../engine/constraints.js";
import { buildCorpus, variants, withinOneEdit } from "../engine/match.js";
import { ACTIVITIES, KIDQ } from "../data.js";
buildCorpus(ACTIVITIES, KIDQ);
import { haversine, fmtKm, directionsTo, venueQuery } from "../lib/geo.js";
import { fmtHour, fmtAge, monthsOld } from "../lib/format.js";
import { snapshot, freshSince, newsLine } from "../lib/sync.js";

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
ok("'hates water' is parsed as an avoidance", c1.avoid.includes("water play"), JSON.stringify(c1.avoid));
ok("'loves trains' is parsed as a preference", c1.love.includes("machines and rides"), JSON.stringify(c1.love));
ok("a concept maps onto the SAME categories and affordances the ranker uses",
   cmapFor("water play").cats.includes("water") && cmapFor("water play").affs.includes("water_play"),
   JSON.stringify(cmapFor("water play")));
const c2 = parseConstraints("scared of dogs");
ok("'scared of' counts as avoidance, not preference", c2.avoid.includes("animals"), JSON.stringify(c2));
const c3 = parseConstraints("loves water but hates water");
ok("a conflict resolves to avoid — the cautious reading wins",
   c3.avoid.includes("water play") && !c3.love.includes("water play"), JSON.stringify(c3));
const c4 = parseConstraints("");
ok("an empty note produces no constraints", c4.avoid.length === 0 && c4.love.length === 0);
const c5 = parseConstraints("naps at 12:30");
ok("an unrelated note produces no constraints", c5.avoid.length === 0 && c5.love.length === 0, JSON.stringify(c5));

/* FB22-03. The founder wrote "love cheese" and nothing happened: the word was
   not in the vocabulary, and the app said so in no way at all. Two fixes —
   a wider vocabulary, and reporting whatever still does not land. */
ok("'loves cheese' is now understood as food",
   parseConstraints("loves cheese").love.includes("food outings"), JSON.stringify(parseConstraints("loves cheese")));

/* FB24. The vocabulary is no longer a hand-picked list beside the science
   layer — it maps onto the same 16 categories and 23 affordances the ranker
   runs on. These are phrases a caregiver would plausibly write, and the old
   eleven-concept version understood none of them. */
[
  ["loves slides and swings", "climbing and running"],
  ["loves other kids", "other children"],
  ["obsessed with diggers", "machines and rides"],
  ["loves painting", "messy art"],
  ["she loves the library", "books and stories"],
  ["loves ice cream", "food outings"],
  ["loves music class", "music and rhythm"],
  ["loves the aquarium", "animals"],
  ["enjoys pretend play", "pretend play"],
].forEach(([phrase, concept]) =>
  ok("understands: " + phrase, parseConstraints(phrase).love.includes(concept),
     JSON.stringify(parseConstraints(phrase).love)));
[
  ["hates sand", "textures"],
  ["scared of dogs", "animals"],
  ["hates loud places", "loud or busy places"],
  ["not keen on climbing", "climbing and running"],
].forEach(([phrase, concept]) =>
  ok("understands: " + phrase, parseConstraints(phrase).avoid.includes(concept),
     JSON.stringify(parseConstraints(phrase).avoid)));

/* FB25. A fixed list can never be finished, so unknown words fall through a
   ladder before we give up. Each rung is asserted separately, because a silent
   fallback that "works" is impossible to reason about later. */
ok("morphology: 'sliding' resolves without being listed",
   parseConstraints("loves sliding").love.includes("climbing and running"));
ok("morphology: 'gardening' resolves to nature",
   parseConstraints("loves gardening").love.includes("nature and outdoors"));
/* "swiming" is caught one rung earlier, by morphology — worth asserting, since
   the ladder is meant to resolve as early and as cheaply as it can. */
const near = parseConstraints("loves swiming");
ok("a near-miss is caught by morphology before the typo rung",
   near.love.includes("water play") && near.inferred[0].how === "variant", JSON.stringify(near.inferred));
const typo = parseConstraints("loves anmals");
ok("a genuine typo is corrected", typo.love.includes("animals"), JSON.stringify(typo.love));
ok("and the correction is disclosed, not applied silently",
   typo.inferred.length === 1 && typo.inferred[0].how === "typo" && typo.inferred[0].corrected === "animals",
   JSON.stringify(typo.inferred));
const corpus = parseConstraints("loves bubbles");
ok("a word absent from the lexicon is answered from the activity library",
   corpus.love.length === 1 && corpus.inferred[0].how === "corpus", JSON.stringify(corpus.love));
ok("a corpus answer still carries real categories/affordances",
   Object.values(corpus.extra)[0].cats.length > 0 || Object.values(corpus.extra)[0].affs.length > 0,
   JSON.stringify(corpus.extra));

/* The ladder must not invent meaning. A passing mention in one description is
   not evidence, or "quantum physics" becomes a toddler activity. */
ok("a word with no real support is still reported as not understood",
   parseConstraints("loves quantum physics").unknown.length === 1,
   JSON.stringify(parseConstraints("loves quantum physics")));
ok("an unrelated everyday word is not force-fitted",
   parseConstraints("hates the dentist").unknown.length === 1);

ok("typo distance is bounded", withinOneEdit("swim", "swin") && !withinOneEdit("swim", "walk"));
ok("doubled consonants are undone: swimming -> swim", variants("swimming").includes("swim"), variants("swimming").join(","));
ok("variants stay conservative on short words", !variants("is").includes(""), variants("is").join(","));

/* A phrase must not be claimed by a word hiding inside it. */
ok("'ice cream' is food, not snow", parseConstraints("loves ice cream").love.includes("food outings")
   && !parseConstraints("loves ice cream").love.includes("snow and cold"),
   JSON.stringify(parseConstraints("loves ice cream").love));
ok("'loves the aquarium' is understood as animals",
   parseConstraints("loves the aquarium").love.includes("animals"));
ok("'hates puddles' is understood as water",
   parseConstraints("hates puddles").avoid.includes("water play"));
const unk = parseConstraints("loves quantum physics");
ok("a preference we cannot model is REPORTED, not silently dropped",
   unk.unknown.length === 1 && /quantum/.test(unk.unknown[0]), JSON.stringify(unk.unknown));
const mixed = parseConstraints("hates water, loves knitting");
ok("the understood half still works when the other half does not",
   mixed.avoid.includes("water play") && mixed.unknown.length === 1, JSON.stringify(mixed));
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


/* ---------- FB31-04: what counts as news ----------
   The bug this replaces was that nothing ever counted, because the journal was
   pulled once and never again. These cases are the ways the fix can be wrong. */
const ME = "me-1", DAD = "dad-2";
const mem = (rid, authorId, place, author) => ({ rid, authorId, author, place, name: place, ts: 1 });
const M1 = mem("r1", ME, "Stanley Park", "Mum");
const M2 = mem("r2", DAD, "The library", "Dad");
const cmt = (id, authorId, author, body) => ({ id, authorId, author, body, at: "" });

ok("the first look is never news — you are not notified of a journal you just opened",
   freshSince(null, [M1, M2], {}, ME).length === 0);

const snap0 = snapshot([M1], { r1: [cmt("c1", ME, "Mum")] });
ok("a comment from someone else, on an outing you already had, is news",
   freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c2", DAD, "Dad")] }, ME).length === 1,
   JSON.stringify(freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c2", DAD, "Dad")] }, ME)));
ok("and it says who wrote it and where",
   newsLine(freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c2", DAD, "Dad")] }, ME)) === "Dad commented on Stanley Park.",
   newsLine(freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c2", DAD, "Dad")] }, ME)));

ok("YOUR OWN comment is never reported back to you as news",
   freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c9", ME, "Mum")] }, ME).length === 0);
ok("your own outing is not news either",
   freshSince(snapshot([M1], {}), [M1, mem("r3", ME, "The pool", "Mum")], {}, ME).length === 0);

ok("an outing added by someone else IS news",
   freshSince(snapshot([M1], {}), [M1, M2], {}, ME).length === 1);
ok("and reads as a sentence", newsLine(freshSince(snapshot([M1], {}), [M1, M2], {}, ME)) === "Dad added The library.",
   newsLine(freshSince(snapshot([M1], {}), [M1, M2], {}, ME)));

/* An outing you are hearing about for the first time carries its comments with
   it. Announcing the outing AND each of its comments is five notices for one
   thing that happened. */
ok("comments on a brand-new outing do not each become their own notice",
   freshSince(snapshot([M1], {}), [M1, M2], { r2: [cmt("c5", DAD, "Dad"), cmt("c6", DAD, "Dad")] }, ME).length === 1);

ok("nothing changed means nothing to say",
   freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum")] }, ME).length === 0);
eq("and no line is offered for it", newsLine([]), "");

const many = freshSince(snapshot([M1], {}), [M1, M2],
  { r1: [cmt("c2", DAD, "Dad"), cmt("c3", DAD, "Dad")] }, ME);
ok("several things collapse into one countable line",
   newsLine(many) === "2 new comments and 1 new outing from Dad.", newsLine(many));
ok("mixed authors are not falsely attributed to one person",
   !newsLine([{ kind: "comment", who: "Dad", what: "x" }, { kind: "comment", who: "Nana", what: "x" }]).includes("from"),
   newsLine([{ kind: "comment", who: "Dad", what: "x" }, { kind: "comment", who: "Nana", what: "x" }]));

/* Two people can both be called "Mum" on different pages, so identity has to be
   the account, not the label. */
ok("whose entry it is, is decided by account and not by display name",
   freshSince(snap0, [M1], { r1: [cmt("c1", ME, "Mum"), cmt("c7", DAD, "Mum")] }, ME).length === 1);

ok("an entry the server has not seen yet carries no rid and is skipped",
   freshSince(snapshot([M1], {}), [M1, { rid: null, authorId: DAD, place: "local" }], {}, ME).length === 0);

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all " + "engine" + " checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
