# ADR-0007: Scoring = map match x personal signals x availability gate
Date: 2026-07-27 · Status: Accepted (constants provisional; structure decided)
## Context
Needed a ranking approach that is explainable, tunable layer-by-layer, and keeps science and personalization separate (per dev-map editorial rules).
## Decision
score = [ affordance match against age-band weights ] + [ personal adjustments: +4 loved-category / −5 paused / +2 novelty / −3 recent-repeat / +2 developmental-retry ] × [ availability rank; closed = excluded ]. Age floor is a hard gate rendering "later" items on a timeline instead of hiding them. Every card displays its matched affordances ("feeds:" tags) so any wrong-feeling recommendation is traceable to a specific weight.
## Consequences
Debuggable by inspection; per-child preferences never contaminate the shared science layer; all constants are tunable knobs logged via CHANGELOG when changed. Superseded in part when Phase 4 introduces venue-level candidates (a future ADR will cover the four-stage pipeline).
