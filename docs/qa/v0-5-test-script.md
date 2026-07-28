# QA Test Script — App 0.5.x (place names + photos)
Executed by: Manual Test Lead · ~6 min · builds on v0.4 script (run that first if not done)
0. Header shows badge "v0.5.1" (you are on the right build)? __
1. Log a visit → evening check-in → type a place name ("Jump Gym Kitsilano") → rate → Memories shows the PLACE as title with category as subtitle? __
2. Check-in WITHOUT a place name → Memories shows category as before (no blanks/guesses)? __
3. Check-in: 📷 Add photos → pick 2 from camera roll → thumbnails preview in modal before rating? __
4. After rating → photos appear in that visit's Memories entry? __
5. Try adding 4+ photos → capped at 3, no crash? __
6. Fully close and reopen the app → place names AND photos persisted? __
7. Rapid double-tap on a rating button → only one visit updated, no duplicate? __
8. Very long place name (50+ chars) → layout survives? __
9. (v0.6.1) Pending card shows "📍 Pin where we are"; tapping it yields the honest environment-blocked toast (NOT a user-error message), no crash? __
10–11. [ENV-BLOCKED, per capability matrix] True pin capture + map link verified at Phase 2 PWA, not here. Logged, not skipped silently.
## Result
Date: ____ · Pass __/9 (+2 deferred to Phase 2 env) · Defects:
