# Founder feedback FB2 — triage (round 3)
Source: `FB2.docx` (founder, 2026-07-30) · Tested against: **v3.0-beta** (screenshot header) · Triaged against: **v3.2.0-beta** (`web/app.jsx`, current HEAD)
Provenance: [EVIDENCE] founder observations · [AI-GEN] triage, root causes, line references

> **Read this first.** The feedback was written against v3.0. Versions 3.1 and 3.2 shipped afterwards and already close five of the items. Each row below was re-checked against the current source rather than taken at face value — status is what is true at HEAD today, not what was true on the founder's device.

## Summary

| Status | Count | Items |
|---|---|---|
| Already fixed in 3.1/3.2 — needs founder re-test, no work | 5 | 01, 02, 03, 04a, 18 |
| Confirmed open — root cause found, ready to build | 9 | 04b, 05/09, 06, 08, 10/12, 13, 14, 15, 16 |
| Confirmed open — needs a founder decision first | 2 | 07, 11 |
| Not possible in this architecture — Phase 2 | 1 | 17 |

---

## Already fixed since v3.0 (re-test, don't rebuild)

| # | Founder report | Where it was fixed | Verify by |
|---|---|---|---|
| FB2-01 | All 150+ activities need a unique, kid-relevant picture; none shared; Swipe **and** Browse | 2.2 (155 distinct curated photos) → 3.1 (Wikimedia primary + global claim-set that makes duplicates impossible) → 3.2 (kid-oriented query per activity, e.g. swim → "toddler swimming lesson child") | Scroll Browse on-device; look for a repeat or an adult-subject photo |
| FB2-02 | Edit profile and log out are not valid | 3.2 — root-caused: "Use my current location" during onboarding wrote a **partial profile** (home, no name/birthdate); app then signed in with no birthdate → `NaN` ages and `name.trim()` on undefined → throw | Onboard via "use my current location", then open Profile → Edit, then Sign out |
| FB2-03 | Icons too narrow; Our List corner number can't show | 3.0 (badge → 20px circle, nav overflow allowed) + 3.1 (nav min-height 62px, icon above label, ellipsis) | Screenshot showed badge "20" clipping — check with a 2-digit count |
| FB2-04a | "Add your own activity or place" should be at the top | 3.2 — now top of Browse (`app.jsx:480`) and Our List (`app.jsx:506`) | Open Browse; button is first element |
| FB2-18 | Address bar: "use my location" or picking from the list does nothing | 3.1 — single geocoder was failing silently; now **two providers** (Photon → Nominatim fallback), search from 2 chars, explicit "Searching…" / unreachable states, "use what I typed anyway" escape | Type 2+ chars in the location bar; pick a result; confirm the bar label changes |

**Note on FB2-01 and FB2-18:** both depend on live network calls (Wikimedia, Photon/Nominatim) that the build sandbox cannot exercise — they are verified by code path only. **On-device testing is the only real check.** If either still misbehaves on the founder's phone, that is new information, not a repeat of the old defect.

---

## Confirmed open — root cause identified

### FB2-06 — "Show what's coming later" / "Hide activities she's not old enough for" does nothing — **HIGH**
Not a state bug. The toggle works; the render truncates.

- `app.jsx:491` — the filter correctly admits under-age activities when `showLater` is on.
- `app.jsx:229` — under-age activities `return -100`, so they sort to the **very bottom** of `ranked`.
- `app.jsx:498` — the list is then cut with `.slice(0, 60)`.

With 155 activities and a big-kid-band child, well over 60 age-appropriate activities pass the filter, so the -100 block never reaches the visible window. The button label and its count change; **zero new cards appear.** For a young baby (few age-appropriate matches) it would partly work — which is why this looks intermittent.

*Fix:* render the later-items as their own labelled section below the main list rather than relying on rank order, so the slice can't swallow them.

### FB2-04b / FB2-05 / FB2-09 — navigation ergonomics — **MEDIUM**
- The "Show what's coming later" toggle is still at the **bottom** of Browse (`app.jsx:499`) — founder wants it at the top with the add button.
- No back-to-top affordance on any list. Browse renders up to 60 cards; Our List and Memories are unbounded.

*Fix:* move the toggle to the top; add a floating back-to-top button that appears past ~1.5 screens, on Browse, Our List and Memories.

### FB2-08 — log-outing action sits below the fold — **MEDIUM**
`app.jsx:1057` — `.sheetbg{align-items:flex-end}` bottom-anchors the sheet; `.sheet{max-height:92vh;overflow-y:auto}`. With rating + place + notes + caregiver + three media buttons + thumbnails, "Save to …'s story" (`app.jsx:667`) falls past the visible area and must be scrolled to.

*Fix:* make the save action sticky to the bottom of the sheet so it is always reachable without scrolling. (Preferred over centring the sheet: it keeps the v0.5.1 ordering fix, where fields must precede the submit control.)

### FB2-10 / FB2-12 — "which place exactly" should be a real location picker — **MEDIUM**
`app.jsx:657` is still a bare `<input>`. The reusable `PlaceInput` geocoder (`app.jsx:706`) already exists and is wired into onboarding, the location bar, custom activities and custom memories — but **not** into check-in.

*Fix:* swap the check-in place field to `PlaceInput`, and seed its suggestions with places already used in past memories so repeat venues are one tap. Venue-level accuracy (as opposed to address-level) still needs the Places API — Phase 4, unchanged.

### FB2-13 — duplicate "add activity or place" in Profile — **LOW**
Three entry points exist: `app.jsx:480` (Browse), `:506` (Our List), `:638` (Settings). Founder wants the Settings one removed and the Memories flow improved instead.

### FB2-14 — mark an outing as a favourite — **LOW**
No such field. Distinct from a rating: rating is the child's reaction (engine signal), favourite is the parent's keepsake mark (must stay **out** of the engine, same rule as journal entries and swipes).

### FB2-15 — Memories filtering — **MEDIUM**
`app.jsx:350-351, 561-562` — only two filters exist (😍 Loved, 📷 With photos). Missing: filter by rating tier, and "we did on our own" as its own category. The founder additionally asks that this category feed the Browse/Swipe library once added — `userAdded` already does exactly that (`app.jsx:246` +3 boost, `:256` "Yours" badge), so only the Memories-side filter is new work.

### FB2-16 — special mark and picture for user-added outings — **LOW**
The "Yours" badge exists (`app.jsx:256`). The shared-picture exemption does not. Founder's rule: this is the **only** category permitted to reuse one image.

*Also noted while reading:* `app.jsx:333` sets the `place:` key twice in the same object literal. Harmless (last wins) but should be cleaned up.

---

## Needs a founder decision before building

### FB2-07 — no gender selection; copy assumes "she"; age should be mandatory
Two separable parts:

1. **Gender.** Hardcoded feminine copy appears in the check-in caregiver prompt (`app.jsx:660` "Who took her out?") and the age toggle (`app.jsx:500` "she's not old enough"). Only a handful of occurrences, so the sweep is small — but the profile needs a field, and the field's options are a product decision. Neutral they/them is the safe default for anyone who skips it.
2. **Mandatory age.** Already effectively true as of 3.2: a profile without a parseable birthdate is rejected and onboarding is re-shown. Worth confirming this is what the founder meant, since the whole engine is age-ranked and cannot run without it.

### FB2-11 — rating system: 3 tiers → at least 5
`app.jsx:45` defines three (`loved` / `fine` / `nope`). This is the single most invasive item in FB2, because ratings are the engine's **only heavy signal**:
- `lovedCats` / `pausedCats` thresholds, retry logic, and `score()` all key off the three literals.
- Existing memories carry old values and must migrate cleanly.

Needs: the five labels, and the mapping of the three old values onto the new scale. Recommend keeping the existing three as anchors (so old data maps without loss) and adding one tier above and one below.

---

## Not possible in this architecture

### FB2-17 — multi-parent access, admin + normal users, shared history — **Phase 2**
Direct answer to the founder's question ("are we able to do this now?"): **no.** The app is a device-local PWA — all state lives in IndexedDB on one phone (`app.jsx:14`), there is no server, no accounts, and no sync. The existing "caregivers" list (`app.jsx:659`) records *who was out* as a label on a memory; it is not authentication and grants no access.

Real shared accounts need: a backend with auth, a migration from device-local storage to server records, conflict handling for two people editing the same child, and a role model. That is the Phase 2 stack already chosen in ROADMAP (Next.js + Supabase). It is also gated by **D3 compliance** — child data on a server is exactly what the compliance baseline was written to cover.

Recommend this stays Phase 2 and does not get a half-version now: a fake "accounts" screen backed by local storage would be worse than nothing.

---

## Build blocker

`web/app.js` is the esbuild bundle Netlify serves and is marked *"Regenerate, don't edit"* in INDEX. **Node.js is not installed on the founder's machine** (checked: no `node`, `npx`, `deno`, `bun`, and none bundled in VS Code or GitHub Desktop). The bundle is minified, so hand-patching it is not a realistic option for a change set this size.

Nothing ships to the device until Node is installed and `esbuild` can run. Source edits to `app.jsx` are possible before then, but would be unverified — a JSX syntax error surfaces only at build time.
