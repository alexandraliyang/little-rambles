# PRD: v0.4 — Variety guarantees + Discover deck
Date: 2026-07-27 · Author: founder + Claude · Target: App 0.4.0 · Label: [ASSUMPTION-driven, ADR-0009]
## The pain this kills
(1) Founder-identified defect: same idea can repeat same-day (unrated visits uncounted) and Today's list lacks category diversity — the sameness the product exists to cure, reproduced by the product. (2) Cold-start: day-one users have zero personalization; assumption A1.3 needs a friction-free taste input that is not a quiz (ADR-0002).
## What done means
- Last outing never leads the Today screen again (hard −6 demotion on visits[0]).
- Recency penalty counts ALL visits incl. unrated/pending.
- Today's hero + "also good" span 4 distinct categories (backfill only if fewer open).
- Discover deck: optional swipe overlay (drag or buttons); right = save + weak +2; left = weak −2, never a ban; age-gated items excluded; deck restartable; entry on Explore always + on Today while rated<3 (cold-start placement).
- Swipe copy states the hierarchy: "Swipes tune what you see. Her real reactions always count more."
## Explicitly NOT building
Swipe-to-go; swipe decay over time (future); using swipes in Memories insights (parent taste ≠ child response — kept separate).
## Principles check
ADR-0002 intact (optional play, not required elicitation); ADR-0005 intact (no engagement-farming mechanics: finite deck, no infinite feed); explore/exploit: diversity rules govern the mix, preference governs rank within the mix.
