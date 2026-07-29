# ADR-0012: Age range extends to 0–84 months (through the 6-year-old year); hard ceiling at 7
Date: 2026-07-27 · Status: Accepted · Origin: founder decision ("at least cover 6")
## Context
Original range ~6–42mo maximized developmental-change density but capped customer lifetime at ~3y (age-out churn = top structural risk; competitive scan: Tinybeans extended to 6+ for the same reason). Science coverage: CDC checklists reach age 5; AAP through school entry; past ~7 children enter middle childhood — interests individualize, discovery becomes activity REGISTRATION (Sawyer's domain), and the caregiver-led decision model our thesis rests on fades.
## Decision
Support 0–84 months. Dev-Map v1.1.0 adds bands 42–60 ("preschool leap") and 60–84 ("big kid, wide world" — flagged lower-evidence: beyond CDC checklist coverage; D2 expert review scope extended accordingly) plus affordances rule_games and big_kid_challenge. App adds big-kid idea archetypes incl. after-school-hours patterns. Hard product ceiling at the 7th birthday: we exit gracefully rather than become a kids-activity registration platform.
## Consequences
~2.3× customer lifetime per child; sibling households (baby + preschooler) become a core segment → multi-child support elevated within Phase 2 scope; marketing/positioning may later narrow launch messaging to a beachhead age even though the engine covers 0–7.
