# MAP — where things live, and what to open when

Updated: 2026-08-02 · Governed by [ADR-0014](adr/0014-layered-source-layout-and-feedback-routing.md)

**Purpose.** You describe a problem in your own words. This file routes that description to the files that own it and the tests that prove it. Nothing else needs opening.

**Rule.** This file is part of the build, not commentary. A change that moves code, adds a surface, or adds a test group updates this table in the same sitting (docs/README.md Rule 5).

---

## Route by symptom

| If you say… | Open | Verify with |
|---|---|---|
| "swipe doesn't work / feels wrong / page moves" | `app.jsx` → deck gesture block (`onPointerDown/Move/Up/Cancel`), `.deckcard` in `theme.css` | `device.drive` — FB4-01, FB8-04, FB9-01, FB11 |
| "wrong activity suggested / it recommends things we avoid" | `engine/constraints.js`, `engine/ranking.js` | `engine.test` |
| "suggested something out of season / closed" | `engine/availability.js` | `engine.test` |
| "the 90-minute answer is wrong" | `engine/rightnow.js`, `lib/weather.js` | `device.drive` — FB10 |
| "wrong / ugly / illustrated picture" | `content/images.json`, `components/Art` | `images.audit` |
| "location search shows far-away places" | `lib/geo.js` | `engine.test` geo group |
| "directions go to the wrong place" | `lib/geo.js` (`directionsTo`) | `engine.test` geo group |
| "check-in / sheet is awkward" | `app.jsx` → check-in sheet, `.sheet*` in `theme.css` | `device.drive` — FB6-04, FB8-02 |
| "memories / journal" | `app.jsx` → STORY block | `ui.smoke` — FB3-02, FB6-01 |
| "reminders fire wrongly / not at all" | `app.jsx` → `catStreak`, `similarWarning`, `awayNudge` | `ui.smoke` — FB6-03 |
| "photos/videos won't save" | `lib/store.js`, `lib/media.js` | `device.drive` — FB3-07 |
| "looks / feels off, colours, spacing, type" | `theme.css` **only** | visual capture (`sheet.mjs`, screenshots) |
| "logo / icon" | `components/Logo`, `web/icon-*.png` | visual capture |
| "won't install / stale version / old build on my phone" | `pack.mjs`, `sw.js`, `manifest.webmanifest` | deploy verify |
| "activity data is wrong (age, hours, tags)" | `content/data.js` | `engine.test` |
| "version number is wrong" | `package.json` (single source) | `ui.smoke` — FB7-02 |

---

## Layers

Dependencies point **downward only**. `engine/` and `lib/` must never import React.

```
content/     data.js · images.json          (no deps)
theme.css                                    (no deps)
engine/      availability · constraints      (pure)
             ranking · rightnow
lib/         geo · store · media · weather   (pure / IO)
app.jsx      views + state + gestures        (depends on all of the above)
main.jsx     mount + error boundary
```

**Why this cut and not by screen:** `app.jsx` holds 69 shared state values, so splitting by screen requires a context provider first. Splitting by layer needs no state refactor. See ADR-0014.

---

## Test groups

| Suite | Runs in | Covers | Command |
|---|---|---|---|
| `engine.test` | Node, no DOM | pure logic — ranking, seasons, constraints, distance, URLs | `npm run test:engine` |
| `ui.smoke` | jsdom | rendering, filters, tabs, version | `npm run test:ui` |
| `device.drive` | real Chrome, real touch | gestures, sheets, PWA, live geocoder + weather | `npm run test:device` |
| `images.audit` | Node | every image resolves and is verified | `npm run audit:images` |

`npm test` runs engine + ui. `npm run verify` runs everything.

**Device tests must use touch, not mouse.** Two separate bugs were misdiagnosed by driving synthetic mouse events: `touch-action` does not apply to mouse, so the mouse path exercises code the phone never runs.

---

## Conventions worth knowing before editing

- **`app.js` is a build artifact.** Never edit it. `npm run build` regenerates it from `app.jsx`.
- **`theme.css` is a template literal** injected at runtime. Backticks inside it terminate the string — use plain quotes in comments.
- **JSX comments inside array literals** (`{/* … */}`) become empty object elements. Use `/* … */` there.
- **Version lives only in `package.json`.** The header reads it; a test asserts they match.
- **The image manifest is the source of truth for pictures**, not the code. Adding an activity without an image entry fails `images.audit`.
