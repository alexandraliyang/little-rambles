# Little Rambles — Design Document

**Doc version:** 1.0 · **Covers app version:** v0.3 · **Last updated:** 2026-07-27
**Status:** Living document. Every product decision, its rationale, and its open questions belong here. If a decision isn't in this doc, it hasn't been made.

---

## 1. What we are building, in one paragraph

Little Rambles is a companion for caregivers of babies and toddlers (~6–42 months) that answers one question well: *"Given who my child is right now — her age, her developmental moment, what she's loved and hated, where we are, and what's actually open — what's worth doing?"* It is a discovery engine with a developmental brain and a memory. It is explicitly **not** a daily planner, because life with a baby cannot be planned; it is a menu that is ready whenever a found moment appears. As a side effect of near-zero-friction logging, it builds the journal of a child's first years that parents ache for and never manage to keep.

## 2. Product principles (the commandments)

These were decided deliberately and settle future feature debates. Changing one requires updating this doc with a rationale.

**The app watches how you actually live instead of asking you to describe yourself.** No onboarding quiz. Two facts (name, birthdate) plus an optional free-text note start the product; everything else is learned from behavior. Rationale: quizzes feel framed and binary; behavior is truer than self-report; decided in the founding conversation after explicit rejection of quiz-based onboarding.

**The app never demands anything.** Logging happens as a side effect of going ("Let's go" = directions + log in one tap). The evening check-in is one optional tap. Skipping it carries zero guilt and zero nagging. Rationale: exhausted parents abandon anything that feels like homework; the data flywheel must survive real life.

**Honesty over promotion.** The app tells you when a place is *not yet* worth it ("Science centre: best around 2½") and when your routine is fine as-is. It never manufactures urgency. Rationale: every listings product has an incentive to promote everything; refusing that incentive *is* the trust moat.

**Never guilt-market developmental anxiety.** The science layer describes emerging skills as opportunities, never expected achievements as judgments. No comparisons between children, ever, anywhere — including marketing copy. Rationale: the same CDC data that powers us powers a thousand anxiety apps; we chose the opposite product on purpose. This is a values decision, recorded before growth pressure could test it.

**Repetition is not failure.** "The library again" is developmentally fine and the app says so. Staleness nudges offer variety without judging routine.

**Privacy: the app only knows what you tap.** No background location tracking. Location awareness is inferred from explicit actions (tapping "Let's go", typing a spot). Rationale: this is data about a baby's whereabouts; trust here is existential, not a compliance checkbox. Decided when rejecting background geofencing in favor of tap-inferred logging.

## 3. Decision log

| Decision | Chosen | Rejected | Rationale |
|---|---|---|---|
| Product shape | Discovery engine + memory, usable as a planner | Daily planner format | Days with a baby are unpredictable; plans live in the app, not the calendar |
| Cold start | Age engine + venue categories from day one | Onboarding quiz; live events database | Quiz felt framed; events DBs are the tar pit that killed aggregator apps (Winnie et al.) |
| Logging | Tap-to-go = automatic log; optional 3-tap evening check-in | Forms, required ratings, background location detection | Friction kills logging; surveillance kills trust |
| Local data | Category archetypes → delegate venue search to Google Maps | Building a venue database first | 80% of value at 2% of maintenance cost; venue DB deferred to v1.0 pipeline |
| Content investment | Underinvest in copyable knowledge, overinvest in the loop | Rich editorial content | The information layer is commoditized by general AI assistants; the loop (logging, memory, timeline) is not |
| Science framing | Emerging skills as opportunities | Milestone checklists / progress tracking | Anti-guilt commandment; structural prevention, not tone |
| Monetization (provisional) | Freemium subscription; possibly "first-year companion" premium framing | Ads; venue pay-for-placement | Pay-for-placement destroys the honesty moat by definition |

## 4. System architecture — current (v0.3)

Single-client application; all state on-device/account (key-value storage under one key). No backend, no external APIs at runtime except Google Maps via deep links at tap time.

Components: (a) **Profile** — child name, birthdate, free-text notes; birthdate drives everything. (b) **Developmental map (condensed)** — embedded copy of `developmental-map-v1.json`; 8 age bands with weighted affordance wants. (c) **Idea library** — ~15 activity archetypes, each declaring affordances, age floor, tags, a Maps query, and a typical-hours spec. (d) **Availability pre-processor** — season/day/hour gate with confidence labels. (e) **Scoring engine** — see §6. (f) **Memory** — visit log with ratings and notes; derived signals (loved/paused categories, staleness, retry flags). (g) **Location context** — optional "spot" that redirects Maps queries; recent spots remembered.

## 5. Recommendation approach

### 5.1 Current reality (v0.3) — be honest with ourselves

The app does **not** search real venues. It ranks activity **archetypes** and delegates geographic search to Google Maps at tap time. Pipeline: hard gates (age floor; availability ≤ 0 excluded from "right now") → score (§6) → rank → the tapped archetype becomes a Maps query anchored to home or the set spot. Consequences to remember: comprehensiveness equals Google's category-query coverage; we cannot compare two actual venues, verify a specific venue's hours, or know what the parent actually chose inside Maps. These are accepted v0.3 limits, not oversights.

### 5.2 Target architecture (v1.0) — the four-stage pipeline

1. **Candidate generation.** Google Places API search per affordance-relevant category, bounded by a **travel-time isochrone, not a distance radius** — minutes matter, miles don't. The travel budget is computed from the logistics layer (§8): roughly, feasible one-way travel ≈ (current wake window − desired on-site time − buffer) / 2.
2. **Hard filtering.** Open now (from nightly-cached hours), age gate, paused categories, weather-infeasible outdoor options, previously "noped" venues not yet flagged for retry.
3. **Scoring.** Developmental affordance match + personal preference + novelty/staleness + context (remaining window, weather, travel cost decay).
4. **Ranking with diversity + explanations.** Never multiple near-identical options adjacent; every card shows its matched affordances (the "feeds:" tags), keeping the system debuggable and trustworthy.

**Hours pipeline:** nightly background refresh of opening hours for all candidate venues per active metro via Places API; "open now" computed locally. Note: Google's terms limit caching (~30 days for most fields) — refresh, don't hoard. The layer above Places — session schedules (story time 10:30 Tue; tot swim 9:00 Sun) — is data Google doesn't have; collecting it city-by-city is deliberately sequenced **last** (see risk register: events-DB tar pit) and, once earned, is a genuine local moat.

## 6. Scoring formula — exactly as implemented (v0.3)

```
if months < idea.ageMin            → excluded (shown dimmed as "later", with timeline label)
base   = Σ band.wants[a] for each affordance a of the idea      // typically 0–10
        + 4  if idea.category ∈ lovedCats     // ≥2 "loved it" ratings in category
        − 5  if idea.category ∈ pausedCats    // ≥2 rated, 0 loved, ≥1 nope
        + 2  if idea never visited            // novelty
        − 3  if idea appears in last 4 rated visits   // anti-samey
        + 2  if idea ∈ retryIdeas             // last rating "nope" ≥2 months ago AND age ≥ ageMin
score  = base × availabilityRank              // open=1.0, closing/opening-soon≈0.5–0.6, closed→excluded
```

Derived-signal definitions: **lovedCats** = categories with ≥2 loved. **pausedCats** = categories with ≥2 ratings, zero loved, ≥1 nope. **staleness** = one archetype ≥50% of last 8 rated visits (min 5) → nudge, never a penalty beyond the −3 repeat term. **retry** = developmental second chances; a "nope" is a snapshot, not a verdict.

All numeric weights are provisional and tunable (§12). The structure (map score × personal adjustments × availability gate) is the design.

## 7. Developmental map framework

**File:** `developmental-map-v1.json` (v1.0.0, reviewed 2026-07, annual cadence). Architecture: **age band → emerging skills → weighted affordance wants → venue affordances**, so recommendation is a weighted match and every layer tunes independently: science updates touch only bands; new venues only declare affordances; observed data tunes weights.

**Sources:** CDC "Learn the Signs. Act Early." checklists (2022 revision; milestones = what ~75%+ of children do by that age — the checkpoint ages 2/4/6/9/12/15/18/24/30/36 mo are our band skeleton); AAP Bright Futures 4th ed. (anticipatory guidance); Zero to Three (milestones → everyday activities translation); Harvard Center on the Developing Child (serve-and-return: interaction, not exposure, drives development — venue descriptions must center what caregiver and child do *together*); WHO Motor Development Study (gross-motor windows).

**Hard editorial rules** (in the JSON, enforced in review): not diagnostic — emerging skills only, never expected achievements; band edges are soft; conservative claims when evidence is thin; the science layer is **never** edited to fit engagement metrics.

**Affordance vocabulary:** 16 terms (water_play, cause_effect, naming_targets, attention_span_long, etc. — full definitions in the JSON). Note the modeling trick: `attention_span_long` is a *demand* that acts as a cost before ~2.5y and an affordance after — this is how "not yet" venues emerge naturally from the math rather than a hardcoded blocklist.

## 8. Logistics layer (naps & wake windows) — SPEC, not yet built (target v0.4)

**Gap identified 2026-07-27 (founder):** nap schedules aren't modeled, yet they determine outing feasibility more than almost anything else — including how far away a recommendation may be.

Design: per age band, add typical nap count and wake-window ranges. Approximate norms (AAP / pediatric sleep literature; wide individual variance): 6–9 mo: 2–3 naps, wake windows ~2–3h. 9–14 mo: 2 naps, ~2.5–3.5h. **14–18 mo: the 2→1 nap transition**, ~3–5h. 18–36 mo: 1 nap, ~5–6h; naps fade entirely for some by 3+.

Two consumers of this data: (a) **the "good window" chip** — "good window: now–1:30" computed from typical wake windows anchored to observed or entered wake time; (b) **the travel budget** — feasible one-way travel ≈ (window − on-site time − buffer)/2, which parameterizes candidate-generation reach in the v1.0 pipeline. Concretely: a 13-month-old on two naps supports ~20–30 min destinations; an 18-month-old on one nap unlocks 45–60 min ones. **The map literally widens as she grows.**

Rules, consistent with our commandments: ranges are defaults, never assertions ("babies this age often…"); the parent can correct actual schedule in one tap; no sleep advice, no sleep judgment — this layer exists purely to make suggestions feasible. Sources to attribute in map v1.1: AAP healthy-sleep guidance; standard pediatric sleep references.

## 9. Availability model (v0.3)

Typical-hours heuristics per archetype: seasonal windows (splash pads May–Sep; farms Mar–Oct), day-of-week patterns (markets weekends; story time weekday mornings), hour ranges, daylight logic for parks. Statuses: open (rank 1.0) / opening soon ≤1.5h (0.5) / closing soon ≤1h (0.6) / closed (excluded from "right now"; savable). **Confidence labels are mandatory:** "Open now" only for reliable daily venues; schedule-driven venues say "Sessions today — check times." Rationale: one confident wrong "open now" at a locked door destroys trust permanently; never claim certainty we don't have. Known limits: no holidays, no real venue hours, clock/season are the user's local ones (wrong for other-timezone travel) — all resolved by the v1.0 hours pipeline.

## 10. Location model (v0.3)

Default anchor "near home" ( Maps "near me"). Optional **spot**: free-text address/neighbourhood/landmark redirecting all Maps queries; visually distinct pill when active; persists across restarts; last 5 spots remembered (appointments recur). Visits record their spot, enriching the journal ("· near Metrotown"). Known limits: no geocoding (typos pass through to Maps), availability clock not localized to the spot, no distance-aware ranking — all three queue behind the same Places API integration, which is why it's the right first backend piece. Product hypothesis to verify in field notes: away-mode users want shorter, lower-commitment options ("kill 45 minutes gracefully") → if confirmed, v0.4 adds a time-budget input feeding §8's travel math.

## 11. Data schemas (v0.3, storage key `little-rambles-v02`)

```
{ baby:   { name, birthdate (YYYY-MM-DD), notes },
  visits: [ { id, ideaId, name, cat, emoji, ts, rating: "loved"|"fine"|"nope"|null, note, loc } ],
  saved:  [ ideaId ],
  loc:    string | null,
  recentLocs: [ string, ≤5 ] }
```
Visits with `rating: null` are pending check-ins; "Didn't go" deletes them. Reset erases everything (parent-controlled, one tap, honest label).

## 12. Tuning guide

**Safe to tune:** band `wants` weights (1–3) in the map; personal-signal constants (+4/−5/+2/−3/+2) and thresholds (loved ≥2; staleness ≥50% of last 8; retry ≥2 months); availability ranks; archetype affordance declarations; hours specs. Method: when a recommendation feels wrong, read its "feeds:" tags — they identify exactly which weight fired; adjust in one place; log the change in §14.

**Never tune:** `emergingSkills` content to fit engagement (science layer integrity rule); anything that introduces child-to-child comparison; anything converting the check-in from optional to demanded; honesty labels on availability.

**Tuning data we already generate:** per-category rating distributions, staleness patterns, retry outcomes, away-mode usage. Future: aggregate (anonymized) rating patterns per affordance-per-band become the empirical correction to the hand-set weights — the map proposes, reality disposes.

## 13. Risk register (living — from the critical review session)

| Risk | Status | Mitigation in design |
|---|---|---|
| Structural churn: users age out; most parenting apps lose users in weeks, memory moat needs months | OPEN — the big one | Day-one usefulness via age engine; falsifiable beta test pre-committed ("of 20 parents, do 8+ log in week 4?"); optional pivot to "first-year companion" premium framing; 6mo–42mo range extends lifetime |
| Free general-AI substitution ("just ask ChatGPT") | OPEN | Invest in the loop (logging/memory/timeline/photos), not the copyable knowledge layer |
| Vitamin-not-painkiller: willingness to pay unproven | OPEN | Beta pricing test planned (v0.3 phase "put a price on it"); interviews probe what parents already pay for |
| Guilt-marketing drift | GUARDED | Commandment + structural rules in map + this doc as accountability |
| Events-DB tar pit (session schedules) | SEQUENCED | Entered last, city-by-city, only after engine+loop proven |
| Child-location privacy | GUARDED | Tap-inferred only; no background tracking; principle recorded |
| Founder confirmation bias (n=1 + agreeable AI) | OPEN | Field-notes protocol ("moments it helped / moments I ignored it"); external caregiver testing in v0.2 phase of roadmap |

## 14. Version changelog

| Version | Date | Changes | Driver |
|---|---|---|---|
| Concept | 2026-07-27 | Product shape: discovery+memory, not planner; no quiz; tap-to-go logging; retry timing; journal side effect | Founding brainstorm |
| Mock | 2026-07-27 | Clickable prototype (fake data) to feel the loop | Validate the loop by touch |
| v0.1 | 2026-07-27 | Real onboarding (birthdate→age engine), persistence, real Maps links, real logging/check-in/insights, day-one empty states | "Build and solve while building"; founder = user #1 |
| v0.2 | 2026-07-27 | Affordance engine from developmental-map-v1.json; explainable "feeds:" tags; availability pre-processing with confidence labels; "Open now" filter | Founder request: science-based refreshable framework + no dead-door recommendations |
| v0.3 | 2026-07-27 | Location spots (appointment mode), recent spots, visit locations in journal | Founder insight: exploration around appointments |
| Map v1.0.0 | 2026-07-27 | 8 bands, 16 affordances, sources, editorial rules, tuning notes | Foundation layer |

**Planned v0.4 candidates (pick by field-note evidence):** logistics/nap layer (§8) · time-budget input · expanded archetype library · photo capture · journal export. **v1.0:** Places API pipeline (candidate generation, hours cache, geocoded spots, travel-time budgets) — one integration unblocking four queued features.

## 15. Known limitations — the honest list (v0.3)

No real venue search or venue-level hours (archetypes + Maps delegation). Typical-hours heuristics ignore holidays and other timezones. No nap/wake-window modeling yet (§8 spec'd). Free-text spots aren't geocoded. ~15 archetypes only. No photos, no export, single child per profile, single device/account storage. "Let's go" logs even if you turn back at the door (mitigated by "Didn't go"). No weather integration — outdoor suggestions don't yet know it's raining.

---
*Maintenance rule: any change to code, map, weights, or principles updates §14 in the same sitting. An undocumented change is a future mystery bug in the product's soul.*
