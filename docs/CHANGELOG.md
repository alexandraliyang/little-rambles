# Changelog
Format: [Keep a Changelog](https://keepachangelog.com). Versioning: SemVer. Two tracks: **App** and **Dev-Map** (science layer, independent cycle). Docs events recorded here too.

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
