/* lexicon — the words a caregiver actually types, mapped onto the taxonomy the
   ranking engine already uses.

   WHY THIS EXISTS. The old constraint list held eleven hand-picked concepts
   ("water", "animals", "loud/busy places", …) invented separately from the
   science layer. So the app understood "loves trains" and shrugged at "loves
   cheese", "loves slides", "loves other kids" — and shrugged silently.

   The fix is not a longer arbitrary list. Rambles ALREADY has a grounded
   taxonomy: 16 categories and 23 developmental affordances from
   app/developmental-map-v1.json, and every activity is tagged with them. That
   is what ranking runs on. This file maps natural language onto THAT, so a
   preference a caregiver expresses lands on the same vocabulary the recommender
   thinks in — 39 concepts instead of 11, and nothing invented for the purpose.

   HOW TO EXTEND. Add words to an existing concept, not new concepts. If a word
   genuinely has no home, the gap is in the developmental map, and that is a
   science decision (ADR territory), not a lexicon edit.

   Matching is whole-word and lowercase. Multi-word entries are matched as
   phrases, so "ice cream" does not depend on "ice". */

/* Each entry: the concept, its categories, its affordances, and the words.
   `label` is what the app says back to the caregiver, so it reads like English
   rather than like a database column. */
export const LEXICON = [
  /* ---------------------------------------------------------------- water */
  { label: "water play", cats: ["water"], affs: ["water_play"], k: [
    "water", "waterplay", "pool", "pools", "swim", "swims", "swimming", "swimmer", "wet",
    "splash", "splashes", "splashing", "splash pad", "paddling", "paddle", "wading",
    "bath", "baths", "bathtime", "beach", "beaches", "sea", "seaside", "ocean", "waves",
    "lake", "lakes", "river", "creek", "stream", "puddle", "puddles", "sprinkler",
    "fountain", "fountains", "hose", "boat", "boats", "tide", "tidepool", "rockpool" ] },

  /* --------------------------------------------------------------- animals */
  { label: "animals", cats: ["animals"], affs: ["animal_watch"], k: [
    "animal", "animals", "creature", "creatures", "zoo", "zoos", "aquarium", "aquariums",
    "dog", "dogs", "puppy", "puppies", "cat", "cats", "kitten", "kittens",
    "bird", "birds", "duck", "ducks", "swan", "chicken", "chickens", "owl",
    "fish", "fishes", "turtle", "frog", "frogs", "bug", "bugs", "insect", "insects",
    "butterfly", "butterflies", "worm", "worms", "snail", "snails", "bee", "bees",
    "farm", "farms", "cow", "cows", "sheep", "goat", "goats", "pig", "pigs",
    "horse", "horses", "pony", "ponies", "rabbit", "bunny", "bunnies", "lizard", "snake" ] },
  { label: "touching animals", cats: ["animals"], affs: ["animal_touch"], k: [
    "petting", "pet the", "stroke", "stroking", "feed the", "feeding the", "petting zoo", "touch animals" ] },

  /* ----------------------------------------------------------- moving body */
  { label: "climbing and running", cats: ["playground"], affs: ["climb_run"], k: [
    "climb", "climbs", "climbing", "clamber", "run", "runs", "running", "chase", "chasing",
    "slide", "slides", "sliding", "swing", "swings", "swinging", "playground", "playgrounds",
    "park", "parks", "monkey bars", "jump", "jumps", "jumping", "bounce", "bouncing",
    "trampoline", "scooter", "scooters", "bike", "bikes", "bicycle", "balance bike", "ride on" ] },
  { label: "crawling and cruising", cats: [], affs: ["gross_motor_low"], k: [
    "crawl", "crawls", "crawling", "cruise", "cruising", "pulling up", "tummy time", "rolling" ] },
  { label: "a big-kid challenge", cats: ["sports"], affs: ["big_kid_challenge"], k: [
    "challenge", "challenging", "adventurous", "daring", "brave", "risky", "obstacle", "ropes",
    "skate", "skating", "skateboard", "ski", "skiing", "gymnastics", "climbing wall" ] },

  /* -------------------------------------------------------- hands and mess */
  { label: "little hands", cats: [], affs: ["fine_motor"], k: [
    "fine motor", "little hands", "fiddly", "buttons", "knobs", "levers", "posting",
    "threading", "stacking", "puzzle", "puzzles", "lego", "duplo", "blocks", "beads" ] },
  { label: "messy art", cats: ["art"], affs: ["art_materials"], k: [
    "art", "arts", "craft", "crafts", "crafting", "paint", "paints", "painting", "draw", "draws",
    "drawing", "colouring", "coloring", "crayon", "crayons", "chalk", "glue", "sticker",
    "stickers", "playdough", "play dough", "clay", "pottery", "messy", "mess", "make things" ] },
  { label: "textures", cats: ["sensory"], affs: ["sensory_textures"], k: [
    "texture", "textures", "sensory", "sand", "sandpit", "sandbox", "mud", "muddy", "squishy",
    "slime", "grass", "leaves", "pebbles", "stones", "touch", "touching", "feel", "feeling things" ] },

  /* ------------------------------------------------------------- language */
  { label: "books and stories", cats: ["stories"], affs: ["story_language"], k: [
    "book", "books", "story", "stories", "storytime", "story time", "read", "reads", "reading",
    "library", "libraries", "rhyme", "rhymes", "nursery rhymes", "poem", "talking", "words" ] },
  { label: "naming things", cats: [], affs: ["naming_targets"], k: [
    "naming", "pointing", "points at", "what's that", "spotting", "spot", "identify", "labels" ] },

  /* ---------------------------------------------------------------- music */
  { label: "music and rhythm", cats: ["music"], affs: ["music_rhythm"], k: [
    "music", "musical", "song", "songs", "sing", "sings", "singing", "singalong", "dance",
    "dances", "dancing", "drum", "drums", "drumming", "piano", "guitar", "instrument",
    "instruments", "band", "concert", "rhythm", "clapping", "busker", "buskers" ] },

  /* ----------------------------------------------------------- other kids */
  { label: "other children", cats: ["community"], affs: ["peer_faces"], k: [
    "other kids", "other children", "kids", "children", "friends", "friend", "playdate",
    "playdates", "social", "sociable", "playgroup", "group", "toddler group", "peers", "babies" ] },
  { label: "organised programmes", cats: ["community"], affs: ["group_program"], k: [
    "class", "classes", "lesson", "lessons", "program", "programme", "session", "sessions",
    "club", "clubs", "structured", "organised", "organized", "signed up", "course" ] },
  { label: "taking turns", cats: [], affs: ["rule_games"], k: [
    "rules", "turn taking", "taking turns", "games", "board games", "sharing", "queue", "waiting" ] },

  /* ------------------------------------------------------------- machines */
  { label: "machines and rides", cats: ["transit"], affs: ["vehicle_watch"], k: [
    "train", "trains", "railway", "subway", "metro", "skytrain", "tram", "bus", "buses",
    "truck", "trucks", "lorry", "digger", "diggers", "excavator", "tractor", "crane",
    "car", "cars", "vehicle", "vehicles", "plane", "planes", "aeroplane", "airplane",
    "airport", "helicopter", "boat", "ferry", "ferries", "ship", "ships", "machines",
    "engine", "engines", "wheels", "construction", "roadworks", "fire engine", "carousel" ] },

  /* ---------------------------------------------------------------- calm */
  { label: "calm and cosy", cats: [], affs: ["calm_regulation"], k: [
    "calm", "quiet", "cosy", "cozy", "peaceful", "gentle", "slow", "still", "soothing",
    "overwhelmed", "overstimulated", "shy", "cautious", "sensitive", "needs quiet" ] },
  { label: "loud or busy places", cats: [], affs: ["peer_faces", "music_rhythm", "group_program"], k: [
    "loud", "noise", "noisy", "crowd", "crowds", "crowded", "busy", "chaos", "chaotic",
    "hectic", "packed", "bustle", "overstimulating", "too much going on" ] },

  /* -------------------------------------------------------------- pretend */
  { label: "pretend play", cats: ["culture"], affs: ["pretend_play"], k: [
    "pretend", "pretending", "imagination", "imaginative", "make believe", "dress up",
    "dressing up", "role play", "puppets", "puppet", "dolls", "doll", "toy kitchen", "theatre", "theater" ] },

  /* ----------------------------------------------------------------- food */
  { label: "food outings", cats: ["food"], affs: ["food_ritual"], k: [
    "food", "eat", "eats", "eating", "snack", "snacks", "restaurant", "restaurants", "cafe",
    "café", "coffee shop", "bakery", "bread", "cake", "cakes", "biscuit", "cookie", "cookies",
    "cheese", "fruit", "berries", "ice cream", "icecream", "gelato", "noodles", "noodle",
    "dumpling", "dumplings", "dim sum", "pizza", "pasta", "rice", "treat", "treats",
    "bubble tea", "picnic", "picnics", "market", "markets", "farmers market", "hungry" ] },

  /* --------------------------------------------------------------- nature */
  { label: "nature and outdoors", cats: ["nature"], affs: ["seasonal_wonder"], k: [
    "nature", "outdoors", "outdoor", "outside", "forest", "forests", "woods", "woodland",
    "tree", "trees", "garden", "gardens", "flower", "flowers", "plant", "plants",
    "walk", "walks", "walking", "hike", "hikes", "hiking", "trail", "trails", "fresh air",
    "green", "greenery", "botanical", "meadow", "field", "fields" ] },
  { label: "snow and cold", cats: ["winter"], affs: ["snow_play"], k: [
    "snow", "snowy", "snowman", "sledding", "sledging", "sled", "toboggan", "ice", "icy",
    "cold", "winter", "frost", "frosty", "skating", "snowball" ] },
  { label: "seasonal things", cats: ["seasonal"], affs: ["seasonal_wonder"], k: [
    "seasonal", "pumpkin", "pumpkins", "halloween", "christmas", "lights", "festival",
    "festivals", "blossom", "blossoms", "autumn", "fall leaves", "spring", "easter", "harvest" ] },

  /* ------------------------------------------------------- looking/learning */
  { label: "how things work", cats: ["science"], affs: ["cause_effect"], k: [
    "how things work", "cause and effect", "buttons", "switches", "science", "experiment",
    "experiments", "museum", "museums", "science centre", "science center", "curious",
    "figuring out", "taking apart", "mechanisms" ] },
  { label: "long, absorbing activities", cats: [], affs: ["attention_span_long"], k: [
    "focus", "focused", "concentrate", "concentration", "absorbed", "long attention",
    "sits still", "engrossed", "patient" ] },
  { label: "culture and heritage", cats: ["culture"], affs: ["naming_targets"], k: [
    "culture", "cultural", "heritage", "history", "historical", "art gallery", "gallery",
    "temple", "church", "mosque", "exhibition", "tradition", "traditional" ] },
];

/* Words that flip a clause negative or positive. Order matters only in that a
   negation anywhere in the clause wins — "loves water but hates the pool" is a
   sentence we deliberately do not try to parse, and treating it as avoidance is
   the cautious reading. */
export const NEG_WORDS = [
  "hate", "hates", "hated", "dislike", "dislikes", "avoid", "avoids", "avoiding",
  "scared", "scares", "afraid", "fear", "fears", "frightened", "terrified", "nervous",
  "not ", "no ", "never", "won't", "wont", "doesn't like", "does not like", "doesnt like",
  "can't stand", "cant stand", "refuses", "refuse", "cries at", "hates it", "too much",
];
export const POS_WORDS = [
  "love", "loves", "loved", "like", "likes", "liked", "enjoy", "enjoys", "enjoyed",
  "obsessed", "adore", "adores", "favourite", "favorite", "keen on", "into ",
  "asks for", "always wants", "happy at", "happiest", "calms down", "good at",
];

/* Longest-first so a phrase wins over a word inside it ("ice cream" over "ice"). */
const ALL = LEXICON.flatMap((c) => c.k.map((w) => ({ w: w.toLowerCase(), c })))
  .sort((a, b) => b.w.length - a.w.length);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Returns the concepts a clause mentions, longest match first, without letting
   two entries claim the same span of text. */
export function conceptsIn(clause) {
  let text = " " + String(clause || "").toLowerCase().replace(/\s+/g, " ") + " ";
  const hits = [];
  for (const { w, c } of ALL) {
    const re = new RegExp("(?<![a-z])" + esc(w) + "(?![a-z])", "i");
    if (re.test(text)) {
      if (!hits.includes(c)) hits.push(c);
      text = text.replace(re, " ".repeat(w.length));   // consume, so "ice" can't re-match inside "ice cream"
    }
  }
  return hits;
}

export const CONCEPT_LABELS = LEXICON.map((c) => c.label);
export const conceptByLabel = (label) => LEXICON.find((c) => c.label === label) || { cats: [], affs: [] };
export const WORD_COUNT = ALL.length;
