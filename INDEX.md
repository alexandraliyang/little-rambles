# Little Rambles — Repository Index & Manifest
Updated: 2026-07-27 · **This file is the map of everything.** If an artifact isn't listed here with a status, it doesn't officially exist.

## How this repository is managed (the three rules)

**Rule 1 — Single canonical home.** This bundle (`little-rambles/`) is the one true copy. Files generated in chat sessions are **drafts** until they are placed here and listed below. When a newer version of the bundle is produced, the old zip is superseded entirely — never mix files across bundle versions.

**Rule 2 — Provenance is labeled.** Every artifact below is tagged: [DECISION] founder-made choices · [AI-GEN] AI-generated content reviewed by founder · [AI-RESEARCH] AI deep-research with external citations · [EVIDENCE] raw field data (interviews, field notes — only humans create these). Authenticity means never letting an [AI-GEN] artifact masquerade as [EVIDENCE].

**Rule 3 — Next migration: GitHub.** At the start of Phase 2 (or sooner, as a learning exercise), this folder becomes a **private GitHub repository** — the industry-standard permanent home. From then on: every change is a commit with a message, history is automatic and tamper-proof, and chat sessions produce pull-request-style updates into it. Until then, the founder keeps the latest bundle zip; the bundle version number below is the authority.

**Bundle version: 1.0** (first consolidated bundle; supersedes `little-rambles-docs-kit.zip` and all loose files from earlier in the project chat).

## Manifest

| Path | What it is | Provenance | Status |
|---|---|---|---|
| `INDEX.md` | This manifest | [AI-GEN] | Canonical |
| `docs/README.md` | Documentation rules (docs-as-code, 7 rules) | [AI-GEN] | Canonical |
| `docs/ROADMAP.md` | Phases, gates, kill criteria, risk register, debt ledger — **amended 2026-07-27** (D2/D3 applied, D4 closed, scan evidence) | [AI-GEN + DECISION gates] | Canonical, current position: Phase 1 |
| `docs/CHANGELOG.md` | Everything shipped incl. 2026-07-27 correction release | [AI-GEN] | Canonical, append-only |
| `docs/adr/0001–0007` | Seven founding decisions with rationale | [DECISION, drafted AI] | Canonical, immutable |
| `docs/reviews/2026-07-27-phase-0-gate-review.md` | Phase 0 closure with debts D1–D4 | [DECISION + AI-GEN] | Filed |
| `docs/design/founding-snapshot-design-doc-v1.md` | Full design doc (architecture, scoring, map framework, limitations) | [AI-GEN] | Founding snapshot — historical; superseded structurally by this system; content still accurate for v0.3 |
| `docs/research/interview-guide.md` | Phase 1 interview script + scoring sheet + gate math | [AI-GEN] | Canonical, in active use |
| `docs/research/notes/` | Interview + field notes land here | [EVIDENCE] | Empty — fills during Phase 1 |
| `docs/research/2026-07-27-competitive-scan.md` | Condensed competitive landscape archive (closes D4) | [AI-RESEARCH] | Filed; fully-cited original in project chat — export on migration |
| `docs/templates/` | ADR / PRD / field-notes blanks | [AI-GEN] | Canonical |
| `docs/learning/software-development-primer.md` | Founder education: how software gets built + how to audit the work | [AI-GEN] | Canonical, living |
| `app/developmental-map-v1.json` | Science layer v1.1.0 (0–84mo) — **now carries verificationStatus flag (D2)** | [AI-GEN from cited frameworks; weights provisional] | Canonical; expert review pending (Phase 2) |
| `app/little-rambles-v0-13.jsx` | Current working prototype (age 0–7 + big-kid ideas + editable Memories hub) | [AI-GEN, ASSUMPTION-driven] | Canonical build |
| `docs/STATUS.md` | PM board — parallel-stream state, session-open reading | [AI-GEN] | Canonical, living |
| `docs/prds/` | One-page PRDs written before each feature build (Rule 4) | [DECISION + AI-GEN] | Canonical |
| `docs/TEAM.md` | Team charter: roles, decision rights, release Definition-of-Done | [DECISION + AI-GEN] | Canonical |
| `docs/qa/` | Per-release test scripts, written by QA, executed by Founder | [AI-GEN script + EVIDENCE results] | Canonical |
| `app/little-rambles-v0-12.jsx`, `v0-11.jsx`, `v0-10.jsx`, `v0-9.jsx`, `v0-8.jsx`, `v0-7.jsx`, `v0-6.jsx`, `v0-5.jsx`, `v0-4.jsx`, `v0-3.jsx`, `v0-2.jsx`, `v0-1.jsx`, `prototype.jsx` | Prior versions | [AI-GEN] | Superseded — git history is now the real archive |

## Open debts (mirror of ROADMAP debt ledger)
D1 platform (auto-resolves Phase 2) · D2 map verification (Phase 2, flag embedded in map file) · D3 compliance = Phase 2 entry gate · D4 **closed** 2026-07-27.

## Integrity checklist (run at every gate review, founder-executable)
1. Does every file in the bundle appear in this manifest? (`ls -R` vs table)
2. Does every review's declared amendment actually exist in its target file? (Rule 7 — the drift check)
3. Is anything labeled [EVIDENCE] actually AI-generated? (authenticity check)
4. Does CHANGELOG's latest entry match the newest files?
5. Is the ROADMAP position marker honest?
