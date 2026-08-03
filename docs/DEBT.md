# DEBT — known-unfixed, deliberately carried

Updated: 2026-08-02 · Governed by [ADR-0014](adr/0014-layered-source-layout-and-feedback-routing.md)

Debt is a decision, not an accident. Every row states what is wrong, what it costs, and what would close it. Items carried without an owner or a trigger are how a product rots quietly.

`ROADMAP.md §Risks` holds *product* risk (will anyone want this). This file holds *build* debt (what we shipped knowing it was incomplete). D1–D5 predate this file and live in the Phase 0 gate review; numbering here continues from T1 to avoid collision.

**Status:** OPEN · GUARDED (mitigated, still real) · CLOSED (with evidence)

---

## T1 — Activity photos are wrong, not just missing · **OPEN** · high

**What.** A visual audit of all 155 curated photos (contact sheets, 2026-08-02) found roughly a third are plainly wrong for the activity. Not stylistic — categorically wrong. Tide pools shows a black-and-white photo of a homeless man holding a "SEEKING HUMAN KINDNESS" sign. Car ferry shows a scuba diver. Conservatory shows a cat on a sofa. Salmon hatchery shows a tropical clownfish. Harbour ferry shows the Grand Canal, Venice. Separately, 15 of 155 URLs 404.

**Cost.** This is a trust defect in a product for parents of babies, not a cosmetic one. A wrong image on a child-outing card is the kind of thing a tester screenshots and forwards.

**Why still open.** Auto-substitution is what created the problem. Openverse labels an 1896 lithograph a "photograph"; candidate titles are frequently `IMG_3202`. Images cannot be chosen without being looked at.

**Mitigated by.** The slot-poisoning bug (one failed photo turning every later card into a drawing) is fixed, so the blast radius is now one card rather than a session.

**Closes when.** Every activity has an entry in `content/images.json` with `verified: "human"`, and `images.audit` passes with zero `null`. Founder and AI reviewing contact sheets together — founder has asked to do this jointly rather than have it run unattended.

---

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
