# DEBT — known-unfixed, deliberately carried

Updated: 2026-08-02 · Governed by [ADR-0014](adr/0014-layered-source-layout-and-feedback-routing.md)

Debt is a decision, not an accident. Every row states what is wrong, what it costs, and what would close it. Items carried without an owner or a trigger are how a product rots quietly.

`ROADMAP.md §Risks` holds *product* risk (will anyone want this). This file holds *build* debt (what we shipped knowing it was incomplete). D1–D5 predate this file and live in the Phase 0 gate review; numbering here continues from T1 to avoid collision.

**Status:** OPEN · GUARDED (mitigated, still real) · CLOSED (with evidence)

---

## T1 — Activity photos are wrong, not just missing · **OPEN** · high

**What.** A full visual audit of all 155 curated photos (contact sheets, reviewed by eye 2026-08-02/03) produced hard numbers rather than an impression:

| Verdict | Count |
|---|---|
| Confirmed correct | **51** |
| Wrong subject | **91** |
| Dead URL (404) | **13** |

Not stylistic disagreements — categorically wrong. Tide pools showed a black-and-white photograph of a homeless man holding a "SEEKING HUMAN KINDNESS" sign. Car ferry: a scuba diver. Conservatory: a cat on a sofa. Salmon hatchery: a tropical clownfish. Harbour ferry: the Grand Canal, Venice. Toddler gym class: adults doing pilates. Kids' climbing gym: an adult on an outdoor rock face.

Every verdict is recorded per-image in `content/images.json` with a `note` naming what is actually in the picture, so this never has to be re-derived.

**Cost.** A trust defect in a product for parents of babies, not a cosmetic one.

**Selection rule, adopted 2026-08-03 — prefer the subject, not people.** A swing, a carousel, pumpkins, orchids, a duck. Two reasons, and the second is the serious one:

1. Object and scene photographs age better and are unambiguous at card size.
2. **Openverse surfaces NGO and photojournalism images of identifiable, often vulnerable children.** Searching "library story time children" returned four frames from a documentary series on young Roma children. Those images are openly licensed, and using them to decorate a commercial product would still be wrong — the licence covers copyright, not the dignity or consent of an identifiable child. Any candidate showing a recognisable child's face is rejected regardless of licence.

This also explains why the 51 survivors survived: nearly all are subjects, not people.

**Method that works.** `candidates.mjs` assembles candidates (Openverse, `category=photograph`, title-filtered against artwork terms, each URL verified to resolve); a contact sheet is rendered; selection happens **by eye**. Nothing is auto-accepted — Openverse files 1896 lithographs as photographs, and candidate titles are frequently `IMG_3202`.

**Progress.** 4 replaced and confirmed on the first batch (toddler playground, carousel, pumpkin patch, conservatory). One activity (`splashpad`) returned zero usable candidates, so some will need a different source or a hand-chosen image.

**Closes when.** `npm run audit:images` reports 155 confirmed and zero rejected.

## T2 — No backend, so no family sharing and no real backup · **OPEN** · high

**What.** All data lives in IndexedDB on one device. No accounts, no sync, no server-side backup. A caregiver who deletes the app loses the journal.

**Cost.** Blocks the second-caregiver growth loop, which is the most natural invite the product has. Also makes the Settings copy ("not backed up, would be lost if you delete the app") permanently necessary.

**Closes when.** Backend chosen (Supabase recommended) and the baby-as-account model with invite codes and roles ships. Two irreversible decisions ride on it: photos currently never leave the device, and sharing means uploading them; and data region (Canadian residency available, relevant for child data). Awaiting founder decision.

---

## T3 — CHANGELOG is manual and has drifted · **GUARDED** · medium

**What.** Versions in the UI drifted from `package.json` for five rounds. The UI half is fixed — the header now reads `package.json` and a test asserts it. The CHANGELOG half is still hand-written and lags.

**Cost.** Tester reports cannot be attributed to a build.

**Closes when.** Either a release script that appends from commits, or CHANGELOG discipline enforced in the release checklist (`TEAM.md` DoD).

---

## T4 — Views are still one 1,968-line file · **GUARDED** · medium

**What.** ADR-0014 extracted `engine/`, `lib/` and `theme.css`. Screens stay in `app.jsx` with 69 shared state values.

**Cost.** Screen-level feedback still opens a large file.

**Why deferred deliberately.** Splitting screens needs a context provider first; doing it without one trades a big file for prop-drilling. No payoff until work actually concentrates in those files.

**Closes when.** A context provider lands and views move — trigger is "we keep editing views", not a date.

---

## T5 — Featured venues are single-city and unverified · **OPEN** · medium

**What.** ~45 Metro Vancouver venues, founder local knowledge, no external verification (this is D5 from the Phase 0 gate review, restated here so it is visible alongside build debt).

**Cost.** Any tester outside Metro Vancouver sees category cards only. Wrong venue details would be visible to non-founder users.

**Closes when.** Verified before non-founder users see them; second city requires another curated table (ADR-0013 accepted this scales by curation, not code).

---

## T6 — Desktop mouse-drag swipe does not commit · **OPEN** · low

**What.** Drag-to-swipe with a mouse gets cancelled. Touch is unaffected. Buttons (Skip/Save/Let's go) work everywhere.

**Cost.** Low — the product is a phone PWA, and desktop has full button parity.

**Closes when.** Someone tests on a laptop and cares. Explicitly not worth chasing before that.

---

## T7 — Reminders are in-app only · **OPEN** · medium

**What.** The "been a while" and "similar activity" reminders appear when the app is opened. There is no push.

**Cost.** The reminder to go outside only reaches someone who already opened the app — weakest exactly when it matters most.

**Closes when.** Web Push with a VAPID key pair and a server to send from. Depends on T2. On iOS, reaches only an installed PWA that has granted permission.

---

## T8 — Typical-hours model is asserted, not sourced · **GUARDED** · medium

**What.** Opening hours come from a per-category typical-hours model, not real venue data. Honesty labels ("Sessions today — check times") carry the uncertainty.

**Cost.** The 90-minute answer (FB10) gates hard on closing time, so it now *acts* on this data rather than merely displaying it. A wrong closing time sends someone to a shut door with a toddler.

**Closes when.** Places API (Phase 4) or per-venue curated hours. Until then the honesty labels are load-bearing and must not be removed.
