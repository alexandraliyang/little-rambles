# ADR-0003: Tap-to-go = the log entry; check-in optional; no background tracking
Date: 2026-07-27 · Status: Accepted
## Context
The memory layer is the moat, but exhausted parents will not fill forms. Options ranged from manual logging to background geofencing ("looks like you're at the conservatory — log it?").
## Decision
The act of planning IS the log: tapping "Let's go" opens Maps and records the visit (what/when/where-context) in one gesture. Evening check-in is a single optional tap (loved/fine/nope) + optional note. A "Didn't go" escape hatch corrects false logs.
## Consequences
Total user overhead ≈ one optional tap → the data flywheel can survive real life. Logs are slightly noisy (turn-backs). Background location rejected — see ADR-0006.
