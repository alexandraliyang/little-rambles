# Team Little Rambles — Charter
Adopted: 2026-07-27 (ADR-0010) · One human + one AI, organized as explicit roles with checklists, deliverables, and sign-offs. Roles are lenses; checklists force each lens to actually look.

## Roster & responsibilities

| Role | Held by | Owns | Standing deliverables |
|---|---|---|---|
| **Owner / CEO / Head of Product** | **Founder** | Vision, priorities, spend, go/no-go at every gate & merge review, final call on all disputes | Gate decisions on the record; weekly honesty check |
| **Manual Test Lead** | **Founder** | Executing release test scripts on real device; filing defects honestly | Completed test script per release (docs/qa/) |
| **Evidence Owner** | **Founder** (exclusive) | All [EVIDENCE]: field notes, interviews, survey conduct | research/notes/ files |
| Product Manager | Claude | PRDs before builds (Rule 4), ROADMAP upkeep, scope guarding ("NOT building" lists), merge-review prep | PRD per feature; roadmap position honest |
| Product Designer | Claude | Flows, copy, design system, principle checks (esp. ADR-0005 no-guilt tone) | Design notes in PRDs; copy review pass |
| Tech Lead / Architect | Claude | Stack, schemas, technical ADRs, the "how boxes connect" decisions | ADRs; design-doc updates |
| Developer | Claude | Implementation to PRD spec, small commits, honest "NOT done" lists | Code + commit messages that tell the truth |
| QA Engineer | Claude | Test script per release (happy path + edge + regression), syntax checks, defect triage | docs/qa/<version>-test-script.md |
| DevOps / Deployment (Phase 2+) | Claude | Environments (local/preview/prod), CI, backups, monitoring, cost ceiling (~$75/mo) | Deploy runbook; env docs |
| Data / Analytics (Phase 2+) | Claude | Event instrumentation matching gate metrics; dashboards | Event spec in Phase 2 PRD |
| Compliance / Privacy | Claude (draft) + external check before launch | D3: policy, deletion path, minimal-collection audit | Compliance checklist at Phase 2 entry |
| User Research | Claude (design) + Founder (conduct) | Survey/interview instruments, frozen rubrics, coding (founder-audited) | Spec'd in research/; coded datasets |
| **Child-Development Science Advisor** | **EXTERNAL HUMAN — cannot be Claude** | D2: professional review of the developmental map | Signed-off map review before Phase 3 |

## Decision rights (RACI-lite)
Founder **decides**: vision, scope priority, money, gates/merge, anything two roles dispute. Claude roles **recommend and execute**. Disagreements between Claude-roles are surfaced to the Founder explicitly, not silently resolved. Any decision with consequences → ADR.

## Rituals
1. **Session open:** token → clone → "what's on deck" against ROADMAP position.
2. **Release checklist (Definition of Done — every version):**
   - [ ] PM: PRD exists and "done" list is met item-by-item
   - [ ] Designer: copy/principles pass (no guilt, honesty labels intact)
   - [ ] Dev: built; "what I did NOT do" stated
   - [ ] QA: test script written; syntax check passed; known defects listed
   - [ ] **Founder: test script executed on device; result recorded in the script file**
   - [ ] Docs: CHANGELOG + INDEX + affected docs updated same sitting (Rules 5 & 7)
3. **Weekly review (30 min, Founder-led):** roadmap position honest? risks drifting? evidence filed?
4. **Gate / merge reviews:** full-team lens pass; Founder signs the verdict.

## Honesty clauses
- Claude playing multiple roles is one mind with lenses, not independent judgment. True independence comes from: Founder audits, external humans (science advisor, compliance check, beta users), and pre-committed numbers.
- A role that produced nothing this release says so in the checklist rather than rubber-stamping.
- The Founder's title stack (CEO/COO/Head of Product) carries one duty above the others: keeping the kill criteria honest when momentum argues otherwise.
