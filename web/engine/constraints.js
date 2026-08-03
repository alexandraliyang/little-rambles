/* constraints — read the free-text profile line ("hates water, loves trains")
   into things to avoid and things to favour. Pure.
   The avoid list must be applied as a HARD exclusion by the caller, not a
   ranking penalty: it was -14 against a -50 cutoff, so swimming still surfaced
   for a child who is frightened of water (FB4-03). */
/* -------- constraints parsed from the free-text profile note ---- */
export const CMAP = [
  { k: ["water", "pool", "swim", "wet"], cats: ["water"], affs: ["water_play"], label: "water" },
  { k: ["animal", "animals", "dog", "dogs", "zoo"], cats: ["animals"], affs: ["animal_watch", "animal_touch"], label: "animals" },
  { k: ["loud", "noise", "noisy", "crowd", "crowds", "busy", "chaos"], cats: [], affs: ["peer_faces", "music_rhythm", "group_program"], label: "loud/busy places" },
  { k: ["snow", "cold", "winter"], cats: ["winter"], affs: ["snow_play"], label: "snow & cold" },
  { k: ["sand", "mess", "messy", "paint"], cats: [], affs: ["sensory_textures", "art_materials"], label: "messy play" },
  { k: ["climb", "climbing", "height", "heights"], cats: [], affs: ["climb_run", "big_kid_challenge"], label: "climbing" },
  { k: ["car", "driving", "drive"], cats: [], affs: [], label: "long drives" },
  { k: ["music", "singing"], cats: ["music"], affs: ["music_rhythm"], label: "music" },
  { k: ["book", "books", "story", "stories", "reading"], cats: ["stories"], affs: ["story_language"], label: "books & stories" },
  { k: ["food", "eating", "restaurant", "snack"], cats: ["food"], affs: ["food_ritual"], label: "food outings" },
  { k: ["train", "trains", "bus", "plane", "planes", "truck", "trucks", "digger", "boat"], cats: ["transit"], affs: ["vehicle_watch"], label: "machines & rides" },
];
const NEG = ["hate", "hates", "dislike", "dislikes", "avoid", "avoids", "scared", "afraid", "fear", "not ", "no ", "won't", "doesn't like", "does not like"];
const POS = ["love", "loves", "like", "likes", "obsessed", "adore", "enjoys", "favourite", "favorite"];
export function parseConstraints(notes) {
  const out = { avoid: [], love: [] };
  if (!notes) return out;
  String(notes).toLowerCase().split(/[,;.\n·]+/).forEach((cl) => {
    const c = cl.trim(); if (!c) return;
    const neg = NEG.some((w) => c.includes(w)), pos = POS.some((w) => c.includes(w));
    if (!neg && !pos) return;
    CMAP.forEach((m) => { if (m.k.some((w) => new RegExp("\\b" + w).test(c))) (neg ? out.avoid : out.love).push(m.label); });
  });
  out.avoid = [...new Set(out.avoid)]; out.love = [...new Set(out.love.filter((l) => !out.avoid.includes(l)))];
  return out;
}
export const cmapFor = (label) => CMAP.find((m) => m.label === label) || { cats: [], affs: [] };

