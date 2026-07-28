# ADR-0011: Hybrid photo architecture; auto-capture delivered as a four-rung ladder
Date: 2026-07-27 · Status: Accepted · Origin: founder challenge — manual place entry and manual photo attach violate the zero-friction commandment; evaluated founder's two photo options.
## Context
Option 1 (photos remain on-device, app references by tag/time): true auto-suggest needs native photo-library APIs (web cannot scan libraries); references break on delete/offload/device-change; no cross-device sync. Option 2 (app-hosted): infra cost is trivial at journal sizes (~300KB/photo, ~80MB/user-yr, ~$0.02/GB-mo ⇒ pennies/user/yr); the real cost is custody of children's photos (encryption, deletion guarantees, breach liability → D3 weight).
## Decision
**Photos — hybrid (Tinybeans/Qeepsake model):** originals stay in the user's camera roll as the canonical copy; the app stores compressed journal copies for display/sync (Phase 2 backend). We are never the only copy of a family's photo.
**Place capture — ladder, each rung shipping when its platform allows:**
1. NOW (v0.6, artifact): one-tap 📍 pin while on-site → coordinates stored; journal renders a see-on-map link (kills forgot-the-name); coordinates resolve to venue names retroactively when rung 3 lands.
2. Phase 2 (PWA): Android share-target from Google Maps place pages; foreground "log here" + reverse-geocode once Places API exists.
3. Phase 4 (primary fix): in-app venue-level selection ⇒ tap-to-go logs the exact venue by architecture — typing eliminated because choosing happens inside Little Rambles, not Google.
4. Phase 5 (native, OPT-IN via a future ADR consistent with ADR-0006): background visit detection + photo-library time-window auto-suggest = full magic.
## Consequences
Zero-friction is restored incrementally with honesty about platform limits; ADR-0006 privacy stance intact (rungs 1–3 are all explicit-tap; rung 4 requires new opt-in ADR); D3 compliance scope formally includes photo custody from Phase 2 onward.
