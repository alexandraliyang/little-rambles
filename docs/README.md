# Little Rambles — Documentation System

This folder is the product's institutional memory. It follows **docs-as-code**: when real development starts, this entire folder moves into the code repository (`/docs`) and is versioned, branched, and reviewed together with the code. Documentation is not a separate activity from building — a change is not "done" until its documentation is updated in the same commit.

## The map

| Where | What lives there | When you touch it |
|---|---|---|
| `README.md` | This map + the rules | Rarely; when the system itself changes |
| `ROADMAP.md` | Phases, gates, kill criteria, current position | At every gate review; mark position honestly |
| `CHANGELOG.md` | What actually shipped, per version | Every release, same sitting |
| `adr/` | One immutable file per significant decision | Whenever a decision with consequences is made |
| `templates/` | Blank ADR / PRD / field-notes forms | Copy, never edit the templates |
| `research/` | Interview guides, interview notes, dogfooding field notes — raw evidence | During Phase 1 and every research activity after |
| `design/` (future) | The living design docs, split by topic (architecture, scoring, dev-map, hours-pipeline) as the monolithic design doc outgrows itself | When a section of the big doc changes more often than the rest, split it out |

The founding snapshot (`little-rambles-design-doc-v1.md`) is preserved as-is — a historical document. Its decision log has been migrated to `adr/`, its changelog to `CHANGELOG.md`.

## The rules

**1. ADRs are immutable.** An ADR is never edited after acceptance. If a decision changes, write a *new* ADR that says "Supersedes ADR-000X" and mark the old one "Superseded by ADR-00YY". This makes the reasoning trail tamper-proof — you can always answer "why is it like this?" and "what did we believe at the time?"

**2. Semantic versioning, two tracks.** The app uses MAJOR.MINOR.PATCH (breaking / feature / fix). The developmental map versions independently (science content has its own release cycle and annual review cadence). CHANGELOG entries state which track moved.

**3. Evidence is citable.** Decisions cite research: an ADR that says "interviews showed X" links the interview notes in `research/`. Uncited claims about users are opinions and get labeled as such.

**4. PRD before build.** Any feature bigger than a small fix gets a one-page PRD (template provided) *before* code: the pain it kills, the gate it serves, what "done" means, what we're explicitly not building. If the PRD can't name the pain, the feature waits.

**5. Definition of done includes docs.** Ship checklist for every release: code works → CHANGELOG updated → affected ADRs written → ROADMAP position updated if a gate moved → design docs match reality. Five minutes that prevent the "future mystery bug in the product's soul."

**6. The risk register is reviewed at every gate.** It lives in ROADMAP.md §Risks. Risks are OPEN / GUARDED / CLOSED with evidence for any status change.

**7. Reviews apply their own amendments — same sitting, or the review is not filed.** (Rule added 2026-07-27 after founder audit caught exactly this drift: the Phase 0 review *declared* roadmap changes without editing ROADMAP.md.) A gate review that says "the roadmap now reads X" must be accompanied by the actual edit to ROADMAP.md, the CHANGELOG entry, and any flags embedded in affected artifacts (e.g., a debt about a data file goes *into that file's* metadata, not only into review prose). Declared-but-not-applied is the most dangerous documentation state: it reads as done and isn't.

## Why this system (and not just one big doc)

One big doc rots: it grows until nobody reads it, and edits silently rewrite history. This system separates the three things that must never blur: **what we decided and why** (ADRs — append-only), **what we shipped** (CHANGELOG — append-only), and **what is currently true** (design docs — living, always-current). Append-only history + always-current state = you can trust both.
