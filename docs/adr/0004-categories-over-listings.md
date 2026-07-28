# ADR-0004: Category archetypes first; live venue/events data sequenced last
Date: 2026-07-27 · Status: Accepted (sequencing reaffirmed in ROADMAP Phase 4–5)
## Context
Event/venue aggregator apps (e.g., Winnie, Hoop) struggled largely because live listings are a brutal freshness problem — the "events-DB tar pit."
## Decision
v0.x recommends activity *archetypes* (splash pad, story time) and delegates geographic search to Google Maps at tap time. Venue-level data arrives via the Places API pipeline only in Phase 4 (after retention proof); session-level schedules (story-time times) arrive last, city-by-city, in Phase 5.
## Consequences
~80% of value at ~2% of maintenance cost early; comprehensiveness ceiling = Google's category search (documented honestly in design doc §5.1); the hard-won session-schedule layer becomes a real local moat precisely because it is entered late and deliberately.
