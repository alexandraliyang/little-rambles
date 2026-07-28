# QA Test Script — App 0.4.0 (Discover deck + variety guarantees)
Written by: QA (Claude) · Executed by: Manual Test Lead (Founder) · Device: your phone · Time: ~10 min
Mark each ✅ / ❌, note anything weird verbatim. ❌ anywhere = file it below; nothing is "probably fine."

1. Open v0.4 artifact. Existing profile + past visits load (data carried from v0.3)? __
2. Today: hero card shows with availability chip; band note matches her age? __
3. Log a visit ("Let's go" on the hero) → return to Today → **the same idea is NOT the hero anymore** (variety rule)? __
4. Today's hero + "Also good" cards: **all different categories** (no two water-type together)? __
5. Explore → 💫 Quick picks opens; card drags left/right with rotation; releasing past ~half-width triggers the swipe? __
6. Swipe right on something → close deck → it appears as "Saved ✓" on its Explore card? __
7. Swipe left on something → its card still exists in Explore (left ≠ ban)? __
8. Swipe through the whole deck → empty state appears with "Restart the deck"; restart works? __
9. Evening check-in on today's logged visit (one tap + note) → lands in Memories with the note? __
10. Kill the app fully, reopen → swipes, saves, visits all persisted? __
Edge checks: tap "Let's go" then "Didn't go" — visit removed? __ · Open deck with no ideas left mid-restart — no crash? __

## Result
Date executed: ____ · Pass: __/12 · Defects found:
