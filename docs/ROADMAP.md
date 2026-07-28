# Little Rambles — Roadmap

**Updated:** 2026-07-27 · **Current position: PHASE 1 (Pain Validation) — just entered.**

Design of this roadmap: every phase has an entry gate, an exit gate with *pre-committed, measurable* criteria, and explicit kill/pivot criteria. Gates are decided **before** the phase runs so results can't be rationalized afterward. Cheap kills come first; expensive builds come last. The organizing principle, in the founder's words: *things need to kill the real pain point* — so nothing expensive happens until the pain is confirmed.

---

## Phase 0 — Foundation ✅ COMPLETE (2026-07-27)

Delivered: product concept and principles; clickable mock; working prototype v0.1 → v0.3 (real onboarding, age engine, tap-to-go logging with Maps, check-in loop, memory + insights, affordance-based developmental engine, availability pre-processing, location spots); developmental map v1.0.0 with sources; design doc v1; this documentation system.
Remaining item: founder field-test week (rolls into Phase 1).

## Phase 1 — Pain Validation ← **YOU ARE HERE** (target: 2–4 weeks)

**The question this phase answers:** is the pain real, frequent, and painful enough beyond a sample size of one — and *which* pain is it exactly (decision fatigue / discovery / enrichment guilt / mental load / memory-keeping)?

**Track A — Founder dogfooding.** Use v0.3 for real, daily-ish, including one appointment-day away-mode test. Keep the two-list field notes (template in `templates/`): *moments it helped* / *moments I ignored it and used Google or instinct*. The second list is the gold.

**Track B — Survey-first mixed method (amended 2026-07-27 per ADR-0008; was: ten warm interviews).** An anonymous ~5-min public survey (FB parent groups, Reddit incl. r/SampleSize; spec pre-registered in `research/survey-v1-spec.md`) provides breadth and recruits volunteers; ≥5 stranger interviews from the volunteer funnel provide depth using the unchanged guide. Non-negotiable rules: the open-ended "last Saturday" question comes before any pain-themed content; no concept pitch or willingness-to-pay hypotheticals anywhere; recruiting copy explicitly invites contented-routine parents; coding rubric frozen before data arrives.

**Exit gate (amended per ADR-0008, pre-committed):**
- Survey: n ≥ 60 valid; ≥30% of Q1 ("last Saturday") open-text carries a spontaneous pain code per the frozen rubric; ≥40% report current adjacent spend (Q7).
- Interviews: ≥8 volunteers from the funnel → ≥5 conducted; ≥3/5 show unprompted pain in conversation.
- Founder is still opening the app voluntarily in week 3.

**Kill/pivot criteria (amended per ADR-0008):** Q1 spontaneous pain <20% → the "samey weekends" framing is a vitamin; pivot the pain hypothesis to whichever code dominated Q2/Q9 (FATIGUE / GUILT / MEMORY / AGE-FIT — same skeleton, different product) and re-run a focused 5-interview round. 20–30% → documented judgment call weighted by the interviews. Zero heat anywhere → stop; weeks spent, years saved — written up honestly either way.

## Phase 2 — Real Software (target: 4–8 weeks after gate)

**Entry gate (amended per Phase 0 gate review, 2026-07-27):** Phase 1 exit gate passed **AND** children's-data compliance baseline complete (D3: privacy policy, deletion path, minimal-collection audit — COPPA/PIPEDA). **The question:** can the loop survive outside the founder's phone?

Port from chat-artifact to a deployed **progressive web app** (installable, push-capable, no app-store friction for beta). Recommended stack for a solo founder building with AI assistance: Next.js + Supabase (auth, Postgres, storage) + Vercel hosting — boring, cheap (~$0–25/mo at beta scale), massively documented. Build method: Claude Code, with this docs folder in the repo from commit #1.

Scope: port v0.3 features; add from field-note evidence (likely: logistics/nap layer per design doc §8, photo attach, time-budget input). Multi-family accounts. **D2 scheduled here:** professional review of the developmental map (early-childhood educator / pediatric OT) — must complete before Phase 3 exposes the map to external families. **Not in scope:** Places API pipeline (Phase 4), payments (test in Phase 3 first).

**Exit gate:** deployed, installable, 5–10 beta families onboarded and functioning without founder hand-holding.

## Phase 3 — Retention & Pricing Beta (target: 4–8 weeks)

**The questions:** the two scariest risks from the register — churn and willingness to pay — tested cheaply.

Twenty beta families (recruited from interviews + local parent groups). Instrument the basics: opens, "Let's go" taps, check-in completion, week-over-week return.

**Exit gate (pre-committed since the critical review):**
- **Retention:** ≥8/20 families log ≥1 visit in week 4.
- **Pricing signal:** run one honest test — e.g., "beta is free; at launch this will be $6–8/mo — would you continue?" with a real commitment mechanism (card-on-file trial or signed letter of intent, not a survey smile). Gate: ≥5/20 commit.

**Kill/pivot criteria:** retention <5/20 → the day-3/week-4 problem is structural; before building more, redesign around the strongest observed hook (if Memories gets the engagement, pivot toward journal-first with discovery attached; if away-mode does, pivot toward the appointment/travel use case). Pricing <3/20 → revisit model (annual "first-year companion" gift framing, or B2B2C via venues/pediatric clinics) before any further build.

## Phase 4 — The v1.0 Backend (target: 6–10 weeks)

**Entry gate:** Phase 3 both gates passed. This is deliberately the most de-risked expensive build.

The Places API pipeline from design doc §5.2: candidate generation within travel-time budgets (fed by the nap/logistics layer), nightly hours cache (respecting ~30-day caching terms), geocoded spots with address autocomplete, venue-level ranking with diversity, weather integration. One integration unblocks the four queued features (real hours, timezone-correct away mode, autocomplete, distance-aware ranking).

**Exit gate:** recommendations are venue-level, hours-accurate (>95% "open now" correctness spot-checked), and away-mode works in a different city.

## Phase 5 — One-City Launch (Vancouver)

Public launch in one metro. Only now: the session-schedule layer (story-time times, tot-swim slots) — the tar-pit entered last, city-by-city, partially community-sourced, per ADR-0004's sequencing logic. Marketing voice audited against ADR-0005 (no guilt) before anything ships. Growth loop hypothesis: the shareable journal/timeline.

---

## Risk register (reviewed at every gate; updated 2026-07-27 post competitive scan)

| Risk | Status | Evidence / tested in |
|---|---|---|
| Pain is a vitamin, not a painkiller | OPEN | Phase 1 (primary). Scan evidence: parents demonstrably pay for anxiety-relief & utility (sleep, tracking, journal), not "ideas" |
| Structural churn / age-out; week-4 drop-off | OPEN | Phase 3 (primary). Scan: age-out pushed Tinybeans to extend age range; ~30% of annual subs cancel in month 1 (RevenueCat) |
| Free general-AI substitution | OPEN, elevated | Scan: 79% of US parents have used AI (Menlo Ventures 2025); ideas are free — monetize the loop, never the ideas |
| Willingness to pay | OPEN | Phase 3. Scan benchmarks: freemium converts ~2.1% median; parenting apps cluster $48–120/yr; journals proven at $48–96/yr |
| Events-DB tar pit | CONFIRMED by scan; SEQUENCED | Hoop (1.5M families) died on it; Winnie abandoned it. Mitigation upgraded: launch on durable venues only, never an events calendar; Phase 5, last |
| Whitespace closure by incumbent | NEW (from scan) | Tinybeans (owns Red Tricycle discovery legacy + Qeepsake journal) or a funded AI-family player (Ohai, Joy) ships stage-matched local discovery → move fast on Vancouver data moat. Watch quarterly |
| Map scientific validity (D2) | OPEN debt | Expert review scheduled Phase 2, before external families see it |
| Child-data privacy (D3) | GUARDED → Phase 2 entry gate | ADR-0006 + compliance baseline required to enter Phase 2 |
| Guilt-marketing drift | GUARDED | Phase 5 marketing audit; ADR-0005 |
| Founder confirmation bias | GUARDED | Phase 1 method; founder audit already caught doc drift (2026-07-27) — audits work, keep doing them |

**Debt ledger:** D1 platform (auto-resolves Phase 2) · D2 map verification (Phase 2, pre-Phase-3) · D3 compliance (Phase 2 entry gate) · **D4 competitive scan — CLOSED 2026-07-27** via deep-research report (`docs/research/2026-07-27-competitive-scan.md`); headline: the three-way combination (developmental fit + local discovery + memory) exists nowhere at scale — whitespace confirmed, graveyard causes named.

## Operating cadence

Weekly 30-minute solo review: update ROADMAP position honestly, file field notes, check whether any gate criterion is drifting ("maybe 6/10 is too strict…" — no; the numbers were set when we were calm precisely so they'd govern us when we're attached).
