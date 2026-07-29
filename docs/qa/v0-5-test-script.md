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
12. (v0.7) Pending card → 📸 Snap → camera opens (mobile) / file dialog (desktop) → photo appears ON the pending card instantly? __
13. (v0.7) Snap 2–3 times → count accumulates in toast; thumbnails stack on card? __
14. (v0.7) Open Check in afterwards → snapped photos already loaded in the modal (with any draft place/note)? __
15. (v0.7) Try exceeding 6 photos → capped gracefully? __
16. (v0.8) Hero, Explore cards, compact cards, and deck cards all show illustrated banners; each category's scene differs? __
17. (v0.8) Science centre banner (dark starfield) — text/badges above it still readable, layout intact? __
18. (v0.8) Memories tab unchanged — no banners there (your photos remain the star)? __
19. (v0.9) For each category card: REAL PHOTO or ILLUSTRATION? List which — this is a live probe of the sandbox image policy. Any broken/blank banner = defect (fallback failed). __
20. (v0.10) Rich scenes render across hero/Explore/deck: waves+sun (water), book stack (stories), sound-rings (music), meadow+fence (animals), layered forest (nature), awning (sensory), splats (art), slide+swing (playground), planet+stars (science) — no visual glitches or overflow? __
21. (v0.11) Memories: stats header shows correct counts; "since" matches earliest entry? __
22. (v0.11) Filters: 😍 narrows to loved; 📷 to photo-entries; search "jump" finds your Jump Gym entry; nonsense search → friendly empty state? __
23. (v0.11) Photos view: grid of all photos; tap → full-screen lightbox with place+date caption; tap closes? __
24. (v0.11) ✍️ Write a moment: save text+photo → appears with marigold spine and Journal badge; survives full app restart; does NOT create a pending check-in card on Today? __
25. (v0.12) ✏️ on a visit → change note + place + rating → Save → entry updates; insights recompute if rating changed? __
26. (v0.12) Edit: remove a photo via ✕, add another → Save → strip reflects it; survives restart? __
27. (v0.12) Delete: first tap shows "Tap again"; second tap removes entry AND its photos; stats header counts drop? __
28. (v0.13) Edit profile → set birthdate ~5 years ago → header shows "5y Xm"; Today's band note reads "Big kid, wide world"; bowling/climbing/skate rank up; science centre badge is "Great" not "later"? __
29. (v0.13) Set birthdate back to her real one → everything returns to toddler-appropriate; data intact? __
## Result
Date: ____ · Pass __/27 (+2 deferred to Phase 2 env) · Defects:
