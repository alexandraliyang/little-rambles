# ADR-0006: Location awareness is tap-inferred only; no background tracking
Date: 2026-07-27 · Status: Accepted
## Context
Location spectrum: from zero awareness → tap-inferred → background detection. The data in question describes a baby's whereabouts; trust here is existential, not a compliance checkbox.
## Decision
The app knows location context only from explicit actions: tapping "Let's go" (destination intent) or typing a spot (ADR-scope extended by v0.3 away-mode). No GPS tracking, no geofencing, no passive detection. More automation may be offered later strictly as opt-in, via a new ADR.
## Consequences
~90% of the magic with none of the surveillance. Slightly noisier logs (mitigated by "Didn't go"). "The app only knows what you tap" becomes a stated product promise (onboarding copy).
