# ADR-0014: Split the app into pure-logic, view, design and content layers, and route feedback by layer
Date: 2026-08-02 · Status: Accepted · Origin: founder — "should we separate the dev into different parts, so whenever I give feedback you just go fix the relevant part, so other parts don't need to be touched or parsed or reviewed."

## Context

`web/app.jsx` reached **1,968 lines with 69 `useState` calls in a single component**, holding the ranking engine, the geocoder, the storage layer, the gesture handling, every screen, and a 300-line CSS template literal. The whole file had to be opened and re-read to change any part of it.

Eight rounds of founder device testing (FB2–FB11) made the cost concrete, and the bug pattern is diagnostic — the defects clustered in *pure logic that had no seam of its own*:

- season and closing-time conflated into one `st: "closed"` (availability logic)
- "hates water" implemented as a −14 ranking penalty against a −50 cutoff, so it never actually excluded (constraint logic)
- swipe velocity divided by whole-gesture duration, so a pause before a flick averaged the flick away (gesture logic)
- `h >> i` signed-shifted a uint32 hash negative, producing `r="-4"` (art logic)
- image `failed` state never reset between activities, poisoning every later card (component state)

None of these needed a browser to find. All of them were found in a browser, late, because there was nowhere to unit-test them.

Three options were considered. **Do nothing** keeps the re-read cost on every future round. **Split by screen** (Deck.jsx, Browse.jsx, …) is the intuitive split but the wrong first cut: 69 shared state values mean naive extraction becomes prop-drilling, and it requires a context refactor to be safe. **Split by layer**, extracting pure logic first, needs no state refactor at all.

A restructure of this size is only safe with a regression net. As of this ADR there are ~120 automated checks across two suites (jsdom smoke + real-browser device drive). That net did not exist three rounds ago; it does now, which is what makes this the right moment rather than a later one.

## Decision

Adopt a **four-layer source layout**, extracted in stages, safest first:

| Layer | Holds | Depends on |
|---|---|---|
| `engine/` | availability, ranking, constraints, right-now selection | nothing (pure) |
| `lib/` | geo + distance, storage, media, weather | nothing (pure/IO) |
| `components/` + `views/` | React | engine + lib |
| `theme.css` · `content/` | design tokens · activities and image manifest | nothing |

**`engine/` and `lib/` are pure and React-free by rule.** They are unit-testable in Node with no jsdom and no browser, and that is the point: the class of bug listed above becomes catchable in milliseconds instead of in a device round.

Stage 1 (this ADR): `engine/`, `lib/`, `theme.css`, plus the routing docs.
Stage 2 (deferred): `views/`, once a context provider makes it safe — and only when work actually lands in those files.

Add two navigation documents, and treat them as part of the build, not commentary:

- **`docs/MAP.md`** — routes a *symptom in founder language* ("swipe feels wrong", "wrong picture") to the files and the test group that own it. This is the artifact that makes targeted fixes possible; without it, more files means more searching, not less.
- **`docs/DEBT.md`** — the standing register of known-unfixed items, so quality gaps are tracked rather than remembered.

Content quality becomes **data with an audit field**, not diligence. Per-image `verified: "human" | "auto" | null` in the image manifest, enforced in CI-style checks: every activity has an image, every URL resolves as an image, and nothing ships unverified. "Is every picture good?" becomes a query.

## Consequences

Feedback about one layer opens one layer. Pure logic gains fast unit tests, which is where the historical defects live. Design feedback stops requiring the application file to be opened. Image quality becomes auditable rather than remembered.

Harder: two more documents that rot if not maintained — `MAP.md` is only worth having if it is updated in the same sitting as a structural change, and Rule 5 (definition of done includes docs) now explicitly covers it. Imports become explicit, so a careless move can break the build — mitigated by the test suites, which must pass before deploy.

Knowingly deferred: the `views/` split. Screens stay in `app.jsx` until the context refactor is justified by real work, because doing it now would be a large, risky change with no immediate payoff.

Revisit if: the view layer becomes the thing we keep editing (then do Stage 2 with a context provider), or a backend lands (ADR pending on family sharing) and a `server/` or `sync/` layer needs its own row in the map.
