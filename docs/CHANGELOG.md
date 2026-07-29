# Changelog
Format: [Keep a Changelog](https://keepachangelog.com). Versioning: SemVer. Two tracks: **App** and **Dev-Map** (science layer, independent cycle). Docs events recorded here too.

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
