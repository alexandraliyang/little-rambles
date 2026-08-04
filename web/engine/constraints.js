/* constraints — read the free-text profile line into things to avoid and things
   to favour. Pure.

   FB24. This used to carry its own eleven hand-picked concepts, invented apart
   from the science layer, so it understood "loves trains" and shrugged at
   "loves cheese" or "loves slides". The vocabulary now lives in lexicon.js and
   maps onto the SAME 16 categories and 23 affordances the ranking engine runs
   on — nothing invented for the purpose, and a gap here is a gap in the
   developmental map rather than a missing keyword.

   The avoid list must be applied as a HARD exclusion by the caller, not a
   ranking penalty: it was -14 against a -50 cutoff, so swimming still surfaced
   for a child who is frightened of water (FB4-03). */
import { LEXICON, NEG_WORDS, POS_WORDS, conceptsIn, conceptByLabel, CONCEPT_LABELS } from "./lexicon.js";

/* Kept for callers that still ask for cats/affs by label. */
export const CMAP = LEXICON;
export const UNDERSTOOD = CONCEPT_LABELS;
export const cmapFor = (label) => conceptByLabel(label);

export function parseConstraints(notes) {
  const out = { avoid: [], love: [], unknown: [] };
  if (!notes) return out;
  String(notes).toLowerCase().split(/[,;.\n·]+|\band\b/).forEach((cl) => {
    const c = cl.trim();
    if (!c) return;
    const neg = NEG_WORDS.some((w) => c.includes(w));
    const pos = !neg && POS_WORDS.some((w) => c.includes(w));
    if (!neg && !pos) return;
    const hits = conceptsIn(c);
    if (!hits.length) { out.unknown.push(c); return; }
    hits.forEach((h) => (neg ? out.avoid : out.love).push(h.label));
  });
  out.avoid = [...new Set(out.avoid)];
  out.love = [...new Set(out.love.filter((l) => !out.avoid.includes(l)))];
  out.unknown = [...new Set(out.unknown)];
  return out;
}
