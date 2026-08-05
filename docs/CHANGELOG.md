# Changelog
Format: [Keep a Changelog](https://keepachangelog.com). Versioning: SemVer. Two tracks: **App** and **Dev-Map** (science layer, independent cycle). Docs events recorded here too.

## App — 3.5.1-beta — 2026-08-04
Founder round FB31, on a phone, against the previous day's build.

### Fixed
- **The settings menu and the family cards had no CSS at all.** Not a wrong rule — an absent one. Markup was complete and correct, so nothing threw, nothing warned, and all four suites plus 104 device checks passed: a `.setrow` with no rule is still a button with the right text in the right order. On the founder's phone the rows collapsed into run-together text and a member's avatar, having no width, rendered at the full width of the page. Found by a screenshot; now guarded by `tests/css.audit.mjs`, which fails if any class in the markup has no rule behind it. It caught four other dead classes on the way in, including the unstyled brand on the invited person's very first screen.
- **Comments and likes never arrived.** The journal was pulled once, when the family resolved, and never again — so a comment written on one phone did not exist on the other until the app was killed and relaunched, and there was nothing to pull or press to force it. Now: a pull when the app returns to the foreground, a pull on a timer while it is open, a Refresh you can press, and a line saying when we last heard anything, because "nothing new" and "not checking" look identical otherwise.
- **What arrived is said out loud.** A banner on Memories names it — "Dad commented on Stanley Park" — and the tab carries an unread count. It never clears itself: something you did not see is not something you have read.

### Changed
- **Member faces are faces.** A round 48px photo, the name a family actually uses underneath it, and what that person can do under that; your own is ringed amber. "You" is a marker on your own row rather than a replacement for your name, which was hiding it.
- **Home moved under Child profile.** It is where we search from, so it belongs with who we are ranking for, not on a settings page of its own.
- **The build stamp folded into "Help build this."** A tester quoting a build is giving feedback; it was never a screen of its own. Six settings rows became four.

### Added
- `snapshot()` / `freshSince()` / `newsLine()` in `lib/sync.js` — pure, and separate from the pull that feeds them, because that is where the interesting mistakes are: announcing your own writing back to you, announcing a whole journal the first time it loads, or announcing nothing at all. 14 unit cases, including two people who are both called "Mum".
- `npm run audit:css`, wired into `test:engine`.

## App — 3.4.0-beta — 2026-08-02
Founder device rounds FB3–FB11, then a structural change so future rounds cost less.

### Added
- **"Next 90 minutes"** — one decisive outing, gated hard on real weather (Open-Meteo, keyless), the nap time read from the existing profile note, and whether the place is still open when you *leave*. It is allowed to say "not now" rather than suggest something unusable.
- **Yours** promoted to a top-level tab; custom activities have one home instead of a strip in Our List and a dead list in Settings.
- **Capture row** on Our List — Check in · 📸 Snap · 📍 Pin where we are · Didn't go. Snaps and pins attach to the plan and fold into the memory at check-in.
- **Reminders** — repeat-pattern ("4 'Animals' outings saved or logged in three weeks") and been-a-while, both in-app and dismissible.
- **Memories are reopenable** — "We went again", "Add to Our List", and Directions that use the recorded address or GPS pin.
- **Search in Browse**, deliberately overriding the hide-rules so a searched-for item is always findable.
- **Shuffle controls** on the wrapped deck, replacing copy that announced a reshuffle and offered no way to do one.
- **Brand mark** — a wandering path, chosen from four drafts by legibility at 28px; new PWA icon set.

### Fixed
- **Swipe (three separate causes).** The deck reshuffled on every render, so cards changed under a resting finger and "Let's go" opened the wrong card. Velocity was measured across the whole gesture, so a pause before a flick averaged the flick away. `touch-action: pan-y` handed vertical panning to the browser, which then claimed the gesture and fired `pointercancel` — the card moved, the page moved, nothing committed. Now: seeded shuffle, last-sample velocity, direction lock, and `touch-action: none` with the app driving vertical scrolling itself.
- **Photos turned into drawings.** `Art` never reset its `failed` state between activities, so one broken photo poisoned the card slot and every later card rendered the generated fallback.
- **Out-of-season ideas were recommended** — season and closing-time shared one status, putting Christmas tree farms in the August deck.
- **"Hates water" still suggested swimming** — the profile note was a −14 ranking penalty against a −50 cutoff. It is now a hard exclusion, with Browse explaining what it hid.
- **Address search ignored location** — results are ranked nearest-first with distances shown; `PlaceInput` had no bias threaded in at all.
- **Check-in sheet opened off-screen** on iOS: the overlay was `position:absolute` inside a `100vh` container, which is taller than the visible viewport.
- Nav badge clipped by a duplicate `.tb` CSS rule; negative SVG radius from a signed shift on a uint32 hash; version chip drifted from `package.json` for five rounds.

### Changed
- **Version has one source.** The header reads `package.json`; a test asserts they match.
- **Curated photos are used first**, with Wikimedia keyword search demoted to a fallback — the search was overriding 155 hand-picked images on every card.

## Docs / Architecture — 2026-08-02
### Added
- **ADR-0014** — layered source layout (`engine/` · `lib/` · views · `theme`/`content`) and feedback routing. Pure logic extracted first because that is where the shipped bugs lived and it needs no state refactor.
- **`docs/MAP.md`** — routes founder-language symptoms to files and test groups, so feedback opens one layer instead of a 1,968-line file.
- **`docs/DEBT.md`** — build-debt register T1–T8, replacing "things we remember are wrong".
- **`web/tests/`** — three suites: `engine.test` (33 pure checks, Node, no DOM), `ui.smoke` (jsdom), `device.drive` (80 checks in real Chrome with **real touch**). Plus `images.audit`, which makes photo quality a query.
- **`web/content/images.json`** — image manifest with a `verified` field; 0/155 human-verified, tracked as debt T1.

### Changed
- `web/app.jsx` 1,968 → 1,820 lines; `availability`, `constraints`, `geo`, `format`, `media` moved out and unit-tested. No behaviour change — all suites pass unchanged across the refactor.

## Docs — 2026-07-27 (parallel-tracks amendment)
### Changed
- **ADR-0009:** Phase 1 and Phase 2 now run in parallel per founder decision; founder vision recorded as explicit assumption set A1 (pain real / dev-fit valued / logging used / WTP ~$6–8/mo); Phase 1 gate converted to a binding merge checkpoint, blocking before Phase 3. Kill/pivot thresholds unchanged and frozen. ROADMAP amended same-sitting per Rule 7.

## Docs — 2026-07-27 (Phase 1 method amendment)
### Changed
- **ADR-0008:** Phase 1 shifts to survey-first mixed method (public survey for breadth + ≥5 funneled stranger interviews for depth) — founder network too thin for 10 warm interviews. ROADMAP Track B and gate math amended same-sitting per Rule 7.
### Added
- `docs/research/survey-v1-spec.md` — pre-registered survey (Q1 "last Saturday" precedes all pain content; frozen coding rubric; amended gate thresholds; platform etiquette).
- `docs/research/recruiting-posts.md` — Reddit/FB/DM recruiting copy with posting log; neutral language, contented-parents invitation mandatory.
- **Tool decision:** Google Forms (free, unlimited responses, CSV export, no respondent login). MS Forms rejected: personal free tier caps ~200 responses and export is clunkier; Typeform rejected: 10 responses/mo free cap. Tally noted as acceptable prettier alternative.

## Docs — 2026-07-27 (correction release)
### Fixed
- **Drift correction (found by founder audit):** Phase 0 gate review had *declared* roadmap amendments (D2 scheduling, D3 as Phase 2 entry gate) without applying them to ROADMAP.md; review was also missing from the kit; dev-map carried no verification flag. All three now applied. Root cause: "declared but not applied" — amendments written in a review doc, target files never edited. New rule adopted in docs/README: **a review's amendments are applied to their target files in the same sitting, or the review is not filed.**
### Added
- `docs/reviews/2026-07-27-phase-0-gate-review.md` filed; Phase 0 formally closed with debts D1–D4.
- `docs/research/2026-07-27-competitive-scan.md` — D4 CLOSED: condensed archive of the deep-research competitive landscape report (whitespace confirmed; graveyard causes named; pricing benchmarks).
- `app/developmental-map-v1.json` meta now carries `verificationStatus` (D2 embedded in the artifact itself, not only in review prose).
- Risk register updated with scan evidence; new risk added: whitespace closure by incumbent (Tinybeans, AI-family players).
- Repository restructure: single canonical bundle `little-rambles/` (docs/ + app/ + INDEX.md manifest with provenance labels).

## [Unreleased]
Candidates for App 0.4.0 (selection driven by Phase 1 field notes, per ROADMAP): logistics/nap layer (design doc §8) · time-budget input · photo attach · expanded archetype library · journal export.

## App 0.13.0 + Dev-Map 1.1.0 — 2026-07-27 [ADR-0012]
### Added
- **Age range 0–7y:** bands 42–60 ("preschool leap") and 60–84 ("big kid, wide world" — flagged lower-evidence, beyond CDC checklist coverage; D2 reviewer scope extended); affordances `rule_games`, `big_kid_challenge`.
- **Six big-kid ideas:** bike/pump track 🚲 · bowling 🎳 · kids climbing gym 🧗 · family skate ⛸️ · u-pick berry farm 🍓 (seasonal Jun–Sep) · library LEGO/maker club 🧱 (after-school weekday hours modeled).
- Age display grows up: "3y 2m" instead of "38 mo" across header, badges, copy.
### Consequences
- Customer lifetime ~2.3× per child; sibling households now core → multi-child support elevated in Phase 2 scope.

## App 0.12.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **Edit any memory** (✏️ on every entry): notes/journal text; place name (visits); add photos (cap 6) and remove photos (✕ on thumbnail); rating correction on visits — flows into the engine as a corrected child-response record (legitimate, unlike swipes); two-tap delete with photo-storage cleanup on both delete and photo-empty saves. PRD: `docs/prds/2026-07-27-v0-12-edit-memories.md`.

## App 0.11.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **Memories as the hook:** stats header (outings/places/photos/since) · Story/Photos view toggle · 3-column photo grid · full-screen lightbox with captions (grid + story thumbnails) · 😍 Loved and 📷 Photos filters · free-text search over places/names/notes · **✍️ Write a moment** freeform journal entries (text/photos, marigold-spine styling). PRD: `docs/prds/2026-07-27-v0-11-memories.md`.
### Signal discipline
- Journal entries are the parent's voice: excluded from the recommendation engine, insights, and pending-check-in logic entirely — same hierarchy as swipes (child's rated reactions remain the only heavy signal).

## App 0.10.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Changed
- **Rich illustration pack:** all nine category scenes rebuilt with atmosphere and depth (sun-glow + layered waves + sparkles; lamplit book stack; sound-rings; meadow with fence and flowers; sunbeamed layered forest with birds; market awning + bokeh; splats with drips and brushstroke; full playground scene; nebula + ringed planet + shooting star). Photo-attempt + fallback retained, dormant in sandbox (QA-19), auto-activates Phase 2.
### Image ladder amended (founder request: "AI pictures that look real")
- Photorealistic AI generation: not available in this environment, and flagged by Design as a brand risk (fake-real venues/children vs. our honesty moat). Adopted path: hand-crafted rich illustration now → optional AI-STYLIZED art with consistent direction at Phase 2 → real venue photography via Places at Phase 4. Photoreal is reserved for photos of real places only.

## App 0.9.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **Real photo banners (experimental):** per-category Unsplash-licensed photographs on all cards, with automatic fallback to the v0.8 illustrations on load failure (sandbox CSP or link rot) — progressive enhancement, no broken images possible. Emoji identity badge overlays photos. Licensing: Unsplash License (free commercial use, no attribution required; noted with thanks).
### Resolved 2026-07-27 (founder QA-19)
- **VERIFIED: sandbox blocks external images** — all categories rendered illustrations; fallback flawless (no broken UI). Photo banners auto-activate at Phase 2 (PWA has no such wall; code already shipped and waiting). Whether the artifact sandbox permits images.unsplash.com was previously untested — QA check 19 (founder) reports photo-vs-illustration per category; individual photo IDs are best-effort and may 404 (fallback covers). End state unchanged: Phase 4 = actual venue photos via Places.

## App 0.8.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **Illustrated card banners:** per-category SVG scenes (design-system palette; waves/sun, storybooks, notes, hills, forest, confetti, paint blobs, slide, starfield) on hero, Explore, compact, and deck cards, with each idea's emoji as focal character. Inline SVG → always renders in-sandbox, zero licensing exposure. PRD: `docs/prds/2026-07-27-v0-8-card-art.md`.
### Documented
- Image ladder: Phase 2 licensed photography per category; Phase 4 real venue photos via Places API (with attribution) — actual-place imagery as the end-state motivator. Memories deliberately excluded: the family's own photos stay the visual star there.

## App 0.7.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **📸 Snap** on the pending-visit card: shooting through the app attaches the photo at the capture moment — no evening picking; snaps accumulate live on the card (cap raised to 6/visit). PRD: `docs/prds/2026-07-27-v0-7-snap.md`.
- Check-in modal now preloads already-snapped photos and prior place/note drafts (no data loss on reopen).
### Documented trade-offs
- iOS: through-app photos may not save to the camera roll — pattern is "snap journal moments in-app, shoot keepers in the real camera"; retroactive library harvest (time + pin matching, zero behavior change) remains the Phase 5 native opt-in per ADR-0011; Android share-target arrives Phase 2.

## App 0.6.1 — 2026-07-27 (patch)
### Fixed
- **Defect #2 (Manual Test Lead):** pin untestable — the chat-artifact sandbox blocks the geolocation API outright (no prompt possible). Error message corrected from implied user error to honest environment limit; feature remains built, verification deferred to Phase 2 PWA. Root cause: QA checked syntax, not sandbox permissions → new standing QA rule + `docs/qa/environment-capability-matrix.md` created (device-API features are matrix-checked before build).

## App 0.6.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **📍 Pin where we are** (ADR-0011 rung 1): one tap on the pending-visit card while on-site stores coordinates — no typing; journal entries with a pin get a "· 📍 map" link opening Google Maps at the exact spot (forgot-the-name recovery without re-search); pins persist and will resolve to venue names retroactively when the Phase 4 pipeline lands.
### Decided
- **ADR-0011:** hybrid photo architecture (originals stay in user's camera roll; app hosts compressed journal copies from Phase 2 — infra cost is pennies/user/yr, the real weight is children's-photo custody → folded into D3 scope) + the four-rung auto-capture ladder (pin now → share-target/reverse-geocode Phase 2 → in-app venue selection Phase 4 → opt-in native visit detection + photo time-window auto-suggest Phase 5).

## App 0.5.1 — 2026-07-27 (patch)
### Fixed
- **Founder defect report (first Manual Test Lead catch):** check-in fields (place, photos, note) sat BELOW the rating buttons, but tapping a rating submits and closes — fields after the submit action were effectively undiscoverable. Modal reordered: place → photos → note → labeled "tapping saves everything above" → ratings.
- No visible version indicator → version badge added to header. Root cause of confusion: multiple look-alike artifact builds in chat with no way to distinguish them.

## App 0.5.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **"Which place?"** optional field at check-in; journal now leads with the actual venue name, category + location as subtitle. Origin: founder-identified defect — category-only logging stored the question, not the answer. PRD: `docs/prds/2026-07-27-v0-5-place-names-photos.md`.
- **Photo journal:** up to 3 photos per visit, compressed on-device (~900px JPEG), persisted per-visit with graceful storage-failure handling, thumbnail strip in Memories.
- `docs/STATUS.md` — the PM board (externalized parallel-stream state, read at session open, updated at every touch).
### Deferred (logged)
- Video capture → Phase 2 (requires real cloud storage). Place autocomplete → Phase 4 Places pipeline, now re-framed in ROADMAP scope as a MEMORY feature (venue-level tap-to-go restores zero-friction specificity).

## App 3.3.0-beta — 2026-07-30 — founder feedback FB2 (round 3)
Triage with per-item root causes: `docs/qa/2026-07-30-founder-feedback-fb2.md`. FB2 was written against **v3.0**; 3.1 and 3.2 had already closed five of its items, so each was re-checked against source before any work — see "Already fixed" below.

### Infrastructure — the build became reproducible (this was blocking)
- **`web/` could not be rebuilt from its own source.** The esbuild entry file (React mount + error boundary + global error handlers) existed *only inside the minified `app.js`* — it had never been committed. Recovered from the bundle and committed as **`web/main.jsx`**, alongside **`web/package.json`** pinning React 18.3.1 + esbuild.
- **Verified faithful, not assumed:** rebuilding from the reconstructed source reproduces the previously committed `app.js` **byte-for-byte** (modulo `core.autocrlf` line endings). That proof was taken *before* any feature edit, so the baseline is trustworthy.
- Node.js 24.18.0 installed on the founder's machine (none was present; `app.js` is minified and was not hand-patchable). `npm run build` regenerates the bundle; `npm test` builds and runs the smoke suite.
- **`web/smoke.mjs`** added: 18 headless jsdom checks covering the FB2 logic. All pass.

### Fixed
- **The age toggle never revealed anything (FB2-06) — root cause found.** Not a state bug: under-age activities score `-100` and sort to the bottom of `ranked`, and the list was then cut with `.slice(0, 60)`. With a big-kid-band child, over 60 age-appropriate activities already saturated the cap, so the toggle changed its own label and *nothing else*. Browse now builds the two age groups as **separate lists**, with "coming later" rendered as its own labelled section that no cap can swallow. Smoke-verified: 60 cards → 61 with the toggle on (was 60 → 60).
- **Log-outing action below the fold (FB2-08):** the save button now sticks to the bottom of the sheet. Chosen over centring the sheet so the v0.5.1 ordering fix — fields before the submit control — stays intact.
- Duplicate `place:` key in the custom-activity object literal (last-wins, harmless, but esbuild flagged it).
- Switching tabs no longer drops you at the previous tab's scroll offset — all four tabs share one scroll container.

### Added
- **Five-tier ratings (FB2-11):** 😍 Loved it · 🙂 Liked it · 😐 It was okay · 😕 Not great · 😵 Not today. Ratings are the engine's only heavy signal, so the scale and its weights (+2/+1/0/−1/−2) are one decision. Categories are now scored by **summed weight** rather than per-key counts, with thresholds set to preserve the old behaviour at the anchors (two "loved" still makes a loved category; two "nope" still rests one).
  - **Migration is lossless at the anchors:** `loved→loved`, `fine→okay` (both were the neutral middle), `nope→nope` — run once on load, then persisted. Nothing is guessed up or down. `rateKey()` means stored data is never used to index `RATE` directly, so an unknown value can no longer throw.
- **Gender field (FB2-07):** Girl / Boy / Prefer not to say, driving she/he/they. **Unset — including every profile created before this build — gets they/them.** All gendered copy swept from both `app.jsx` and the 155 activity blurbs in `data.js` (8 occurrences, e.g. "a physics lab she can sit in" → "you can sit in"). Birthdate is now labelled as required, which 3.2 already enforced.
- **Back to top (FB2-05, FB2-09):** floating button on every list past ~700px.
- **Real place search when logging (FB2-10, FB2-12):** check-in and "an outing we did on our own" both use the same `PlaceInput` geocoder as the rest of the app, seeded with **places you've already logged** so a repeat venue is one tap and needs no network call.
- **Favourites (FB2-14):** ⭐ on any memory, with a filter. Deliberately **excluded from the engine** — a favourite is the parent's keepsake mark, not the child's reaction. Same signal discipline as journal entries and swipes.
- **Memories filters (FB2-15):** filter by any of the five rating tiers, plus ⭐ Favourites, 📷 Photos, and 📍 We did on our own as its own category. (User-added activities already fed Browse/Swipe via the `userAdded` +3 boost — only the Memories-side filter was missing.)
- **One shared marked picture for your own places (FB2-16):** the single deliberate exception to "every activity has its own picture". Places you add skip the Wikimedia lookup entirely — a keyword search for a private place name returns something irrelevant, and a shared mark reads as intentional where a wrong photo reads as broken.

### Already fixed in 3.1/3.2 — re-test, no work done
FB2-01 unique kid-relevant pictures · FB2-02 edit-profile/sign-out crash · FB2-03 clipped nav badge · FB2-04a "add your own" at top · FB2-18 address bar doing nothing. Each was verified present in source. **FB2-01 and FB2-18 depend on live Wikimedia/Photon calls that no sandbox here can exercise — on-device testing is the only real check.**

### Not built — stated plainly
- **FB2-17 multi-parent accounts: not possible in this architecture.** The app is device-local (IndexedDB, no server, no auth); the existing "caregivers" list is a label on a memory, not access control. Real shared accounts need the Phase 2 Supabase stack and are gated by **D3 compliance** — child data on a server is exactly what that baseline covers. A fake accounts screen backed by local storage would be worse than nothing.
- **Venue-level place accuracy** is still address-level: the geocoder finds addresses, not "the good playground". Unchanged Phase 4 Places dependency.
- Smoke tests cannot exercise Photon, Wikimedia, camera, video, or real touch. Founder device testing remains the gate.

## App 3.2.0-beta — 2026-07-30 — founder feedback FB1 (round 2)
### Fixed — root cause of the long-standing crash found
- **The "no birthday entered" state and the iOS Edit-profile/Sign-out crash were the same bug.** Tapping "Use my current location" during onboarding wrote a *partial* profile (home only, no name or birthdate). The app then treated that as an existing profile, offered "Welcome back → Continue", and signed in with no birthdate — producing `NaN` ages ("Great at NaNy") and, on the profile screen, `name.trim()` on an undefined value, which threw. Fixed three ways: (1) onboarding now captures home into local form state instead of writing a profile, (2) a profile only counts as valid with name + birthdate + a parseable age, otherwise onboarding is shown, (3) every profile form field is defaulted so undefined can never reach `.trim()`. Verified headlessly: a partial profile now recovers to onboarding, and Edit profile no longer errors.
### Added
- **Kid-oriented photo queries for all 155 activities:** each activity now carries its own child-specific search phrase (e.g. toddler yoga → "children yoga class kids", not adult yoga; swim → "toddler swimming lesson child"), so Wikimedia lookups return kid-relevant, non-duplicated photos in both Swipe and Browse.
- **Address autocomplete everywhere (FB1 #3):** the geocoder is now a reusable `PlaceInput` used in onboarding home, the location bar, custom activities, and custom memories — with live suggestions, GPS option, and graceful failure text.
- **Custom activities are visible and usable (FB1 #5, #6):** "➕ Add your own" now sits at the **top** of both Browse and Our List; adding one immediately creates an entry under **💜 Your own activities** in Our List with 🚗 Let's go, **Log a memory here**, and Remove — so anything you add can be logged into Memories straight away while also joining your recommendation library.

## App 3.1.0-beta — 2026-07-30 — founder feedback FB1.docx
### Fixed
- **Address dropdown genuinely working (FB1 #1):** the single geocoder was failing silently on-device, leaving the list empty. Now **two independent providers** — Photon (OpenStreetMap) with Nominatim as automatic fallback — search from **2 characters**, with explicit on-screen states: "Searching addresses…", a warning box if both providers are unreachable, and an always-available **"use what I typed anyway"** escape so the user is never stuck. Verified by simulating a blocked primary provider: results still returned, each with a 🏠 save-as-home button and real coordinates.
- **Top navigation (FB1 #2):** min-height 62px, larger touch targets, icon above label, ellipsis instead of overlap — labels no longer collide.
- **Duplicate pictures (FB1 #3):** image strategy inverted. **Wikimedia Commons keyword lookup is now primary** (topical, openly licensed, keyless, cached per activity in IndexedDB) with a global claim-set that guarantees no two activities can resolve to the same image; SVG/logo/map/diagram results are filtered out; curated Unsplash IDs demoted to fallback; generated art last.
- **Profile moved out of Settings (FB1 #4):** the child's name and age now sit in the **header as a tappable chip** opening a dedicated **Profile screen** — age, developmental stage, avoid/love tags, home address, caregivers, sign-out. Settings keeps only data, feedback and custom activities.
### Note
- Pill-button styling from the founder's preferred design was applied to Our List cards in 3.0 and remains.

## App 3.0.0-beta — 2026-07-30 — founder test round #4 · renamed **Rambles**
### Changed
- **Product renamed "Rambles"** (one word, per founder preference) across app, PWA manifest, install title and error screens. "Little Rambles" retained as the project/repo name for now.
- **"Story" → "Memories"** tab label.
### Added
- **Real worldwide address autocomplete (item 3):** typing in the location bar now queries **Photon (OpenStreetMap)** — keyless, CORS-friendly, global — returning UberEats-style ranked address suggestions with street + city + country, each carrying real coordinates. A 🏠 button beside every result saves it as the home address. Search is debounced 320ms and biased toward the current location.
- **Photo resolver (item 2):** if a curated photo fails to load, the app now looks up a real, topical, openly-licensed photo by keyword from **Wikimedia Commons** (keyless) and caches the result per activity in IndexedDB; generated art remains the last resort. Goal: every activity shows a real, distinct, relevant photo.
- **Profile management (item 7):** ⚙️ button now reads "⚙️ Profile"; the Settings screen leads with a Child profile card showing birthdate, computed age, and parsed preference tags, with Edit profile & home beneath.
- **Pill action rows (item 1):** Our List cards adopt the rounded pill button style the founder liked, and gained a 🗺️ Directions action.
### Fixed
- **Our List badge (item 4)** was clipping — resized to a proper 20px circle with overflow allowed on the nav.
- **Swipe deck (item 5):** the "weird frame" was the empty stacked card behind — it now renders real content, scaled and faded; hero image grew 190→250px; the fixed min-height that caused the empty box was removed.
- Remaining `placeLabel` string arguments replaced with the full location object so **every** Maps link (hero, Our List, saved ideas) centres on coordinates when available — verified: links contain `@49.27,-123.16`.
### Known limits
- Photon and Wikimedia calls cannot be exercised from the build sandbox (network-restricted); they are verified by code path and graceful-fallback tests only. Founder testing on-device is the real check.

## App 2.2.0-beta — 2026-07-30 — founder test round #3
### Added
- **A unique picture for every single activity (item 10):** 155 activities → 155 distinct curated photos, verified programmatically (zero duplicates across the whole library). Previously all activities in a category shared one image.
- **Unique generated fallback art:** if a photo fails to load, the card falls back to a scene generated from a hash of the activity's own id — six pattern families × palette shifts — so even offline or on a dead URL, no two cards look alike.
### Changed
- **"Up Next" renamed "Our List" 💛 (item 11)** with an always-visible explainer: it is the shortlist (swipe right / Save) *and* the logging queue ("📍 Out now — tap to log afterwards" / "💛 Saved for later"). Save actions now confirm with a toast so the destination is obvious.
### Verification
- Headless render: 60 Browse cards → 60 distinct image URLs.

## App 2.1.0-beta — 2026-07-30 — founder test round #2
### Fixed
- **Location system rebuilt (item 5):** editing now happens **inline in the same bar** (no modal); a **custom suggestion dropdown** replaces `<datalist>`, which is unreliable on iOS Safari — that's why no addresses appeared; **home vs today's spot** are explicit and both shown ("Home: Kitsilano · Today: Downtown"); "🏠 Save as home" is available from the bar and onboarding. Maps links now **centre on GPS coordinates** (`/@lat,lng,14z`) when the location came from "use my current location" — previously a GPS spot passed the meaningless text "Current location" to Google, which is why results stayed at the phone's default area.
- **Photos (item 3):** primary control is now **🖼️ Add photos → multi-select from the library** (iOS forces one-shot-at-a-time for in-app camera, so camera is secondary); delete ✕ badge repositioned and enlarged (was clipped by `overflow:hidden`).
- **Age strictness (item 9):** Browse now hides activities below the child's age band by default, behind an explicit "Show what's coming later (N for older kids)" toggle — a 13-month-old no longer sees ski hills.
- **Tab names (item 8):** Discover/Explore → **Swipe · Browse · Up Next · Story**, each with an icon; nav bar widened and taller (item 1).
- **Swipe physics (item 2):** 1:1 pointer tracking (was 0.85), rotation ÷14, threshold 90px **or velocity >0.45px/ms** (fling), 520px fling-out animation, opacity-scaled SAVE/SKIP stamps from 25px, a **second card stacked behind** for depth, and a first-run "← swipe →" hint with a two-cycle nudge animation.
- **Custom entries use real places (items 4, 7):** custom activities and custom memories take a place/address and offer a "Check it on Google Maps ↗" verification link; the stored place becomes the Maps query for that activity thereafter.
### Diagnostics (item 6 — could not reproduce)
- Edit-profile and sign-out were driven headlessly across four profile shapes and both passed, so the crash is iOS-specific. Shipped an **error reporter**: any crash now shows the message with a **Copy error text** button and a Reload option, and global `error`/`unhandledrejection` handlers catch non-render failures. Build target lowered to **es2017** in case older Safari choked on modern syntax. Founder action: reproduce, tap Copy, send the text.

## App 2.0.0-beta — 2026-07-30 — founder test round #1 (18 findings)
### Architecture
- **New navigation (item 6):** four tabs at the TOP — **Discover · Explore · Up Next · Story** (+ ⚙️ Settings). Discover is the default landing tab. "Today" is gone; its job is split between Discover (inspiration) and Up Next (things you chose).
- **Up Next / Plan Room (item 6):** every "Let's go" or right-swipe creates ONE deduplicated row per activity (fixes the six-identical-cards bug) with status `out` (ready to log) or `planned` (saved idea). Logging happens from here.
- **Location system (items 1, 2, 4):** persistent location bar at the top of every screen; "📍 Use my current location"; neighbourhood/city datalist dropdown; separate **home** vs **today's spot**; label always visible; every change re-ranks and re-targets Maps queries. Home is asked for during onboarding.
- **Login behaviour (item 18):** returning users land on Discover, not the profile form; explicit "Welcome back → Continue" only after sign-out. Settings holds profile/account.
### Added
- **155 activities across 16 categories (item 9)** — up from 45. Discover reshuffles endlessly once everything age-right has been seen, with an honest "you've seen everything" note.
- **Swipe rebuilt (item 5):** prominent full-card deck at the top of the app, slower/heavier drag (0.85 tracking, 110px threshold, SAVE/SKIP stamps), and a third action: **Let's go** straight from the card.
- **Constraints from the profile note (item 15 — real bug):** "hates water" now suppresses water categories/affordances (−14/−6) and shows visible "avoiding water" tags in the profile. Verified: same child/age/minute → *Beach at low tide* with "loves water", *Drive-through car wash* with "hates water".
- **Cooldowns (item 10):** same activity within 3 days −10, within 10 days −4; same category within 2 days −5.
- **Media (item 3):** three inputs — 📸 Camera, 🖼️ Photos (multi-select), 🎥 **Video** — up to 8 per memory, removable before saving.
- **Check-in reordered (item 7):** rating buttons at the TOP of the sheet; note field carries grey reminder-prompt copy ("bring water shoes", "arrive before 10 or no parking").
- **Caregiver roles (item 12):** caregivers listed in the profile; each memory records who was out; searchable in Story.
- **Custom activities (item 11a):** add your own type or specific place → joins recommendations with a purple **"Yours"** badge and a +3 boost; managed in Settings.
- **Custom memories (item 11):** log outings we did entirely on our own, with date, type, rating, photos.
- **Category stats (item 16):** per-category counts in Story.
- **Settings/account (item 7.1):** profile, home, caregivers, sign-out, plan placeholder.
- **Feedback + survey (item 8):** survey link and pre-filled mailto to alexlycau@gmail.com in Settings.
- **Data transparency (item 17):** plain-language explanation of where photos live, per-photo "Save to my device", and full JSON **Export my data**.
- **Global support (item 14):** any city works — Maps queries use your typed location; Vancouver's 50 named venue picks auto-hide elsewhere with an explanatory note.
### Changed
- Availability is now a **ranking signal, not a hard gate** (+5 open / +2 opening-or-closing-soon) — found during testing: the old gate emptied Discover outside business hours.
### Still open (answered, not built)
- **Item 13 (Maps results not kid-relevant):** improved query strings per activity + curated named venues + your own added places. A proper fix needs the Places API (Phase 4) where we can filter and rank actual venues.
- Cloud accounts/backup, real place autocomplete, background visit detection: Phase 2+/4/5 as previously sequenced.

## App 1.1.1-beta — 2026-07-29 (critical patch)
### Fixed
- **Defect #3 — white screen on the deployed PWA ("Little Rambles is starting…" forever).** Root cause: `app.jsx` used JSX (compiling to `React.createElement`) but only imported the hooks, never `React` itself. The chat artifact provided React as a global, so this was invisible in the sandbox and fatal in a real bundle. Added the explicit React import.
- **Silent-failure class removed:** entry point now wraps the app in an error boundary and a try/catch that PRINT the error on screen instead of leaving the boot message. A stuck loading screen can no longer hide a crash.
- **Storage resilience:** IndexedDB now falls back to localStorage/in-memory if unavailable (iOS private browsing, restricted webviews) rather than stalling startup.
- Service worker cache bumped to `lr-shell-v3`.
### QA process upgrade
- Bundles are now smoke-tested in a headless DOM (jsdom) before release, in two configurations (IndexedDB present / absent). Both must render. Lesson recorded: sandbox-provided globals are the top source of works-here-breaks-there defects — the environment capability matrix now covers globals, not just device APIs.

## App 1.1.0-beta — 2026-07-29 [ASSUMPTION-driven per ADR-0009]
### Added
- **Featured real venues (ADR-0013):** 45 curated Metro Vancouver places, one per idea. Cards now lead with the actual venue ("Spanish Banks Beach" · *🌊 Beach at low tide · Point Grey*) instead of the abstract archetype, with the venue's character note as the body line.
- **Breadth preserved:** every featured card carries "See every <category> nearby →" opening the full category search — bait plus 100+ options, per founder's design.
- **Journal specificity for free:** "Let's go" on a featured card logs the venue name automatically — no evening typing. Partially delivers ADR-0011 rung 3 without any API.
- **Real photos for all 16 categories** (Unsplash-licensed) with the illustration fallback retained; 7 new categories got photo URLs.
### Behaviour
- Featured picks auto-suppress when an away-mode spot is set (a Vancouver venue is wrong near an out-of-town appointment) — cards revert to category mode.
- Service worker cache bumped to `lr-shell-v2` so installed apps pick up the new build.
### New debt
- **D5:** featured seed set is unverified local knowledge (names/areas only — no hours or prices asserted). Founder verification required before any non-founder user sees it.

## App 1.0.0-beta + Dev-Map 1.2.0 — 2026-07-29 [ASSUMPTION-driven per ADR-0009]
### Added
- **Installable PWA build** (`web/`): index.html + bundled app.js (219KB, React 18) + manifest (standalone, theme #29382F) + service worker (offline shell) + generated icons. Deployable as static files; installs to iPhone/Android home screen via browser "Add to Home Screen". PRD: `docs/prds/2026-07-29-v1-0-beta-pwa.md`.
- **Activity library expanded 21 → 45 ideas, 9 → 16 categories** after founder comprehensiveness audit. New: transit (bus/train ride, ferry, train-spotting, plane-watching) · community (parent-tot drop-in, rec-centre gym time, playgroup) · food (bakery, restaurant lunch, ice cream walk) · winter (sledding, snow play, holiday lights, mall laps, ice skating) · seasonal (pumpkin patch, blossoms, festival) · culture (children's museum, heritage site, kids' concert, theatre moved here) · sports (toddler class, swim lessons, bowling moved here) · zoo added to animals.
- **Dev-Map 1.2.0:** affordances `vehicle_watch`, `snow_play`, `food_ritual`, `group_program`, `seasonal_wonder` with per-band weights; card art for all 16 categories.
### Changed
- Storage: artifact `window.storage` → **IndexedDB** shim (same async API) — escapes the ~5MB localStorage ceiling that would have capped the photo journal.
### Resolved by leaving the sandbox
- 📍 Pin (geolocation) and photo banners activate automatically in the PWA — both were dormant per the environment capability matrix.
### Audit finding recorded
- Prior library was NOT comprehensive: no transit, no community drop-in programs, **no winter coverage** (Vancouver's Nov–Mar gap), no food outings, no culture/sports; two miscategorisations. Fixed above.

## Research — 2026-07-27 (Track B live)
### Added
- **Survey is LIVE** — Google Form built by Founder from the pre-registered spec; link filed in `survey-v1-spec.md` and interpolated into all recruiting posts. Phase 1 Track B unblocked; interview funnel now depends only on responses.
### Note
- Age screener covers 6mo–5y (spec written pre-ADR-0012); product now spans 0–7y. Adding a "6 years" option is optional and non-blocking — posting takes priority over perfect coverage.

## Docs — 2026-07-27 (team charter)
### Added
- **ADR-0010 + docs/TEAM.md:** role-based team structure — Founder as Owner/CEO, Manual Test Lead, and exclusive Evidence Owner; Claude in nine checklisted roles; Science Advisor designated external-human-only (D2); release Definition-of-Done with per-role sign-offs adopted.
- `docs/qa/v0-4-test-script.md` — first QA deliverable under the new structure; awaiting Founder execution.

## App 0.4.0 — 2026-07-27 [ASSUMPTION-driven per ADR-0009]
### Added
- **Discover deck** (optional swipe mode): right = save 💛 (+2 weak parent-taste signal), left = not-for-us 👋 (−2, never a ban); drag gestures or buttons; age-gated ideas excluded; restartable; entry on Explore always and on Today while rated visits < 3 (cold-start placement). Copy states the signal hierarchy: swipes tune, child's ratings rule. PRD: `docs/prds/2026-07-27-v0-4-variety-discover.md`.
### Changed
- **Variety guarantees** (founder-identified defect): last outing can never lead Today again (−6); recency penalty now counts unrated/pending visits; Today's visible top-4 spans distinct categories (backfill only if fewer are open). Explore/exploit stance: diversity governs the mix, preference governs rank within it.

## App 0.3.0 — 2026-07-27
### Added
- Location "spots": free-text address/neighbourhood redirects all Maps queries (appointment mode); active-spot pill on Today and Explore; last 5 spots remembered; one-tap return to home; visits record their spot, shown in journal.
### Known limitations
- Spots not geocoded (typos pass to Maps); availability clock/season not localized to spot. Both queued behind Places API (Phase 4).

## App 0.2.0 — 2026-07-27
### Added
- Affordance-based developmental engine consuming dev-map bands (age band → weighted wants → venue affordances); explainable "feeds:" tags on every card.
- Availability pre-processing: season / day-of-week / hour / daylight gates with confidence-honest labels ("Sessions today — check times"); closed venues excluded from "right now"; "Open now" filter.
### Changed
- Scoring: map match is now the base term; personal signals (+4 loved / −5 paused / +2 novelty / −3 recent repeat / +2 retry) applied on top; availability multiplier gates the total.

## App 0.1.0 — 2026-07-27
### Added
- Real onboarding (name, birthdate, optional free-text; no quiz — ADR-0002); age engine with 8 developmental bands.
- Tap-to-go: "Let's go" opens Google Maps AND logs the visit (ADR-0003); "Didn't go" escape hatch; optional 3-tap evening check-in with note.
- Persistent storage across sessions; memory-derived insights (loved / paused categories, staleness ≥50% of last 8, retry flags ≥2 months after a "nope"); designed day-one empty states.

## Dev-Map 1.0.0 — 2026-07-27
### Added
- 8 age bands (0–42 mo) with themes, emerging skills, weighted affordance wants (1–3), cautions, per-band source attributions (CDC 2022, AAP Bright Futures 4e, Zero to Three, Harvard CDC, WHO MGRS).
- 16-term affordance vocabulary incl. attention_span_long modeled as a demand (cost before ~2.5y) so "not yet" emerges from the math.
- Editorial hard rules: never diagnostic; opportunities not judgments; annual review cadence; science layer never tuned for engagement.

## Prototype (mock) — 2026-07-27
Clickable mock with fake data to validate the loop by feel. Not versioned; superseded by 0.1.0.
