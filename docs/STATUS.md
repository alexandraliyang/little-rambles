# STATUS — the board (PM's externalized brain)
Rule: read at every session open; update at every touch. A stream not on this board does not exist. Updated: 2026-07-30.

## In progress
| Stream | Role lead | State | Next action | Waiting on |
|---|---|---|---|---|
| Track A: founder dogfooding | Evidence Owner | **LIVE on Netlify, v3.2 installed** | Continue daily use; field notes still unwritten | Founder |
| Founder test rounds | QA + Dev | 4 rounds completed, ~35 findings resolved | Round 5 after v3.2 deploy | Founder |
| Track B: survey | Research | **LIVE** — form built & link filed | Post to r/SampleSize, then FB groups; log postings | Founder (posting) |
| v0.4 QA sign-off | Manual Test Lead | Script written, unexecuted | Run docs/qa/v0-4-test-script.md on device | Founder (~10 min) |
| v0.5.x–0.6 QA sign-off | Manual Test Lead | Script covers 0.5.1→0.13 (29 checks) | Run docs/qa/v0-5-test-script.md on v0.6 | Founder |
| Interview funnel | Research | 0 volunteers | Volunteers arrive via survey F1; schedule at ≥8 | Survey responses |

## Scheduled / blocked
| Stream | State | Unblocks when |
|---|---|---|
| D5 featured-venue verification | NEW debt — 45 Vancouver picks unverified | Founder reviews list (QA-37) before external users |
| D2 map expert review | Debt, scheduled Phase 2 — SCOPE GREW: bands to 84mo incl. lower-evidence 60–84 | Founder sources an early-childhood educator / pediatric OT |
| Multi-child support | ELEVATED in Phase 2 scope (ADR-0012: sibling households core) | Phase 2 build |
| D3 compliance baseline | Phase 2 entry requirement | Before any external family's data is stored |
| Phase 2 dev environment (VS Code + Claude Code) | Decided, not started | Founder chooses to run setup (~1 hr) |
| Hosting pipeline (Vercel + GitHub auto-deploy) | Next after first manual deploy | Founder connects Vercel to repo |
| Phase 4 Places pipeline | Re-scoped: MEMORY feature as much as discovery (venue-level tap-to-go = specific auto-logging) | After merge checkpoint |
| Video in journal | Logged Phase 2 backend item | Real cloud storage exists |

## 2026-07-30 — FB2 round 3
| Stream | Role lead | State | Next action | Waiting on |
|---|---|---|---|---|
| v3.3 FB2 build | Developer | **Built + 18 automated checks passing** | Deploy `web/` to Netlify, reinstall on phone, run `docs/qa/v3-3-test-script.md` | Founder (device test) |
| FB2 items already fixed in 3.1/3.2 | QA | 5 items need re-test only (FB2 was written against v3.0) | Part A of the v3.3 script — A1 photos and A5 address search are network-dependent and testable **only** on device | Founder |
| Build reproducibility | Tech Lead | **CLOSED** — `main.jsx` was missing so `web/` could not be rebuilt from source; recovered and proven byte-identical. Node 24.18.0 installed | — | — |
| FB2-17 multi-parent accounts | Tech Lead | Deferred to Phase 2 — needs a server, auth, and D3 compliance; device-local app cannot do it | Fold into Phase 2 Supabase scope | Phase 2 |

## Done this cycle
v1.0-beta PWA · v1.1 featured venues · v2.0 four-tab rebuild + 155 activities · v2.1 location/swipe/photos · v2.2 unique images · v3.0 renamed **Rambles** · v3.1 dual geocoder + Wikimedia images · v3.2 partial-profile crash root-caused and fixed, kid-oriented photo queries, custom activities surfaced

v2.0.0-beta: 4-tab nav, Up Next plan room, location system, 155 activities, swipe rebuild, constraints honoured, roles, custom activities/memories, media+video, settings/feedback, export · founder test round #1 closed 15/18 items

Repo live (27→ files) · Phase 0 closed w/ debts · D4 competitive scan · ADR-0008 survey method · ADR-0009 parallel tracks · ADR-0010 team charter · v0.4 (variety + deck) · v0.5.1 · v0.6/0.6.1 (pin + env matrix) · v0.7 (Snap) · v0.8 (illustrated banners) · v0.9 (photos dormant per QA-19) · v0.10 (rich illustrations) · v0.11 (Memories hub) · v0.12 (edit memories) · v0.13 + Map 1.1.0 (age 0–7) · **v1.0-beta PWA + 45 ideas/16 categories + Map 1.2.0** · **v1.1-beta featured venues + real photos**

## Founder decision queue
- Optional: add "6 years" to survey age screener (ADR-0012 extended range to 0–7y) — non-blocking, post first.
