/* match — what to do with words the lexicon does not know.

   A fixed list can never be finished. "Loves dinosaurs" is a perfectly ordinary
   thing to write and no keyword list will ever contain every child's obsession.
   So instead of one lookup, this tries four things in order, each cheaper and
   more certain than the next, and only gives up when all of them fail:

     1. EXACT      the lexicon, whole-word (engine/lexicon.js)
     2. MORPHOLOGY "swimming" -> "swim", "puddles" -> "puddle"
     3. TYPO       one edit away from a known word, for words long enough that a
                   single edit is unlikely to be a different real word
     4. CORPUS     search the activity library itself — names, descriptions,
                   search terms — and take the categories and affordances of
                   whatever it finds. "Dinosaurs" is not in the lexicon, but
                   "dinosaur" appears in a museum activity, and the museum's own
                   tags are a better answer than a shrug.

   Step 4 is the interesting one: it means the vocabulary grows automatically as
   the activity library grows, which is the only version of this that scales.
   Nothing here is a language model — it is retrieval over data we already hold,
   so it works offline, costs nothing, and never sends a word a caregiver wrote
   about their child to a third party. */

import { conceptsIn, LEXICON } from "./lexicon.js";

/* -------------------------------------------------------- morphology ----- */
/* Deliberately small. Aggressive stemming turns "eating" and "eaten" into
   "eat" but also "universities" into "univers", and a wrong match is worse
   than a miss because it silently changes recommendations. */
const SUFFIXES = [
  ["ies", "y"], ["ves", "f"], ["ing", ""], ["ies", ""], ["es", ""], ["s", ""],
  ["ed", ""], ["er", ""], ["ers", ""],
];
export function variants(word) {
  const out = new Set([word]);
  for (const [suf, rep] of SUFFIXES) {
    if (word.length > suf.length + 2 && word.endsWith(suf)) {
      const stem = word.slice(0, -suf.length);
      out.add(stem + rep);
      if (rep === "") {
        out.add(stem + "e");                       // "sliding" -> "slide"
        /* English doubles the final consonant before -ing/-ed: swimming ->
           swimm -> swim. Without this the commonest verbs in this domain
           (swimming, running, digging) all miss. */
        /* Written without a regex backreference deliberately: an earlier
           version used one, a shell-escaping slip replaced it with a control
           character, and the pattern then silently never matched. */
        const last = stem[stem.length - 1];
        if (last && last === stem[stem.length - 2] && "bdfglmnprt".indexOf(last) >= 0) {
          out.add(stem.slice(0, -1));
        }
      }
    }
  }
  return [...out];
}

/* ------------------------------------------------------------- typos ----- */
/* Bounded Levenshtein: returns true as soon as a second edit is needed, so it
   is cheap on the long words this is used for. */
export function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const LEX_WORDS = LEXICON.flatMap((c) => c.k.filter((w) => !w.includes(" ")).map((w) => ({ w, c })));

/* ------------------------------------------------------------ corpus ----- */
/* Built once from the activity library. Words are weighted by where they occur:
   a word in an activity's NAME is a far stronger signal than one buried in its
   description. */
let CORPUS = null;
export function buildCorpus(activities, kidq = {}) {
  const idx = new Map();
  const add = (word, act, weight) => {
    const w = word.toLowerCase();
    if (w.length < 4) return;                      // "the", "a", "of" carry nothing
    if (!idx.has(w)) idx.set(w, new Map());
    const m = idx.get(w);
    m.set(act.id, (m.get(act.id) || 0) + weight);
  };
  const words = (s) => String(s || "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  activities.forEach((a) => {
    words(a.name).forEach((w) => add(w, a, 3));
    words(a.mapsQuery).forEach((w) => add(w, a, 2));
    words(kidq[a.id]).forEach((w) => add(w, a, 2));
    words(a.why).forEach((w) => add(w, a, 1));
    (a.tags || []).forEach((t) => add(t, a, 1));
  });
  CORPUS = { idx, byId: new Map(activities.map((a) => [a.id, a])) };
  return CORPUS;
}

/* Look a word up in the activity library and return the categories and
   affordances of the activities that mention it, strongest first. */
/* A word appearing once in one description is not evidence. Requiring a strong
   occurrence — in a NAME or a search term, not merely prose — is what stops
   "quantum physics" resolving to "things like physics" because some activity
   mentions it in passing. */
export function conceptsFromCorpus(word, minScore = 4, minStrong = 2) {
  if (!CORPUS) return null;
  let best = null;
  for (const v of variants(word)) {
    const hit = CORPUS.idx.get(v);
    if (hit && (!best || hit.size > best.size)) best = hit;
  }
  if (!best) return null;
  if (Math.max(...best.values()) < minStrong) return null;
  const cats = new Map(), affs = new Map();
  let total = 0;
  for (const [id, score] of best) {
    if (score < 1) continue;
    const a = CORPUS.byId.get(id);
    if (!a) continue;
    total += score;
    cats.set(a.cat, (cats.get(a.cat) || 0) + score);
    (a.aff || []).forEach((f) => affs.set(f, (affs.get(f) || 0) + score));
  }
  if (total < minScore) return null;
  const top = (m, n) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => k);
  return { cats: top(cats, 2), affs: top(affs, 3), matches: best.size, word };
}

/* ------------------------------------------------------------ resolve ---- */
/* The whole ladder, for one clause. Returns concepts plus HOW they were found,
   because "we guessed from your library" and "this is a known word" should not
   be presented to a caregiver as the same thing. */
export function resolveClause(clause) {
  const exact = conceptsIn(clause);
  if (exact.length) return { how: "exact", concepts: exact.map((c) => ({ label: c.label, cats: c.cats, affs: c.affs })) };

  const words = String(clause || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);

  /* 2 + 3: morphology, then a single typo, against the lexicon */
  for (const w of words) {
    for (const v of variants(w)) {
      const hit = LEX_WORDS.find((L) => L.w === v);
      if (hit) return { how: "variant", concepts: [{ label: hit.c.label, cats: hit.c.cats, affs: hit.c.affs }] };
    }
  }
  for (const w of words) {
    if (w.length < 5) continue;                    // too short to correct safely
    const hit = LEX_WORDS.find((L) => L.w.length >= 5 && withinOneEdit(w, L.w));
    if (hit) return { how: "typo", corrected: hit.w, concepts: [{ label: hit.c.label, cats: hit.c.cats, affs: hit.c.affs }] };
  }

  /* 4: the activity library itself */
  for (const w of words) {
    const c = conceptsFromCorpus(w);
    if (c) return { how: "corpus", word: w, concepts: [{ label: "things like " + w, cats: c.cats, affs: c.affs }], matches: c.matches };
  }

  return { how: "none", concepts: [] };
}
