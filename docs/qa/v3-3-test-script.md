# QA test script — App 3.3.0-beta (founder feedback FB2)
Written by: QA (Claude) · Executed by: **Founder, on the iPhone, installed as a PWA** · Date executed: ______

Deploy `web/` to Netlify, then on the phone: **delete the old Home Screen icon → reinstall from Safari**. The service-worker cache was bumped to `lr-shell-v10`; a stale shell is the usual cause of "my fix isn't there".

**Record results in this file.** Write what actually happened, not what should have. A failed check here is worth more than a passed one.

---

## Part A — the five items FB2 reported that were ALREADY fixed in 3.1/3.2
These had no work done in 3.3. You were testing v3.0. If any still fails, that is **new information** and needs a fresh defect, not a repeat report.

| # | Check | Expected | Result |
|---|---|---|---|
| A1 | Scroll all of Browse, then all of Swipe | Every activity has its own photo; no two the same; photos show children/kid-relevant subjects, not adults | |
| A2 | Onboard using "📍 Use my current location", finish, then Profile → **Edit profile**, then **Sign out** | No crash, no "Great at NaNy" | |
| A3 | Save 10+ activities so Our List shows a 2-digit count | The number sits in its circle, not clipped by the icon | |
| A4 | Open Browse | "➕ Add your own activity or place" is the **first** thing, at the top | |
| A5 | Location bar → type 2+ characters; also try "use my current location" | Suggestions appear; picking one changes the bar; GPS works or explains itself | |

**A1 and A5 depend on live Wikimedia / Photon network calls that cannot be tested anywhere but a real device. These two are the highest-value checks in this script.**

---

## Part B — what 3.3 actually changed

| # | Check | Expected | Result |
|---|---|---|---|
| B1 | Open a memory rated before this build | An old "Fine" now reads **"It was okay"**. No memory shows a blank or broken rating pill | |
| B2 | Log an outing | **Five** rating buttons: Loved it · Liked it · It was okay · Not great · Not today — all five readable, none cut off | |
| B3 | In the log sheet, add 3+ photos | **"Save to …'s story" stays visible at the bottom** without scrolling | |
| B4 | In the log sheet, tap "Which place exactly?" and type 2+ chars | Address suggestions appear (as in the location bar) — not a plain text box | |
| B5 | Log a second outing at a place you've already logged | That place is offered **before you finish typing**, tagged "somewhere you've been" | |
| B6 | Browse → tap "Show what's coming later" | **New cards actually appear** under a "Coming later — not old enough yet" heading. This is the one that did nothing before — if the card count doesn't change, it has failed | |
| B7 | Browse: is the toggle at the top? | Yes, directly under "Add your own" | |
| B8 | Scroll Browse well down | A "↑ Top" button appears; tapping it returns to the top | |
| B9 | Repeat B8 on Our List and Memories | Same behaviour | |
| B10 | Switch tabs after scrolling down | The new tab starts at the top, not mid-list | |
| B11 | Memories → tap ☆ on a memory | Turns to ⭐; the ⭐ Favourites filter shows only that one | |
| B12 | Memories → tap each rating-tier filter | Each shows only memories at that tier; tapping again clears it | |
| B13 | Memories → "📍 We did on our own" filter | Shows only outings you added yourself | |
| B14 | Profile → set Gender = Boy | Copy reads "Who took **him** out?" etc. Set "Prefer not to say" → reads "them" | |
| B15 | Leave gender unset on an existing profile | Everything reads they/them. **Nowhere should say "she"** | |
| B16 | Add your own activity, then find it in Browse | Purple 💜 Yours artwork + badge; it does **not** borrow another activity's photo | |
| B17 | Settings → Your activities | Lists and removes them, but has **no "Add activity or place" button** (it lives on Browse / Our List / Memories now) | |

---

## Part C — regression (things 3.3 touched indirectly)

| # | Check | Expected | Result |
|---|---|---|---|
| C1 | Rate the same category "Loved it" twice | Memories shows "Working well: …" for that category | |
| C2 | Rate a category "Not today" twice | Shows "Resting: …"; that category drops down the rankings | |
| C3 | Swipe deck still works — drag, fling, SAVE/SKIP stamps | Unchanged from 3.2 | |
| C4 | "Let's go" from a card | Opens Maps centred on your location; the outing appears in Our List | |
| C5 | Write a moment (journal) | Saves; does **not** get a rating pill; does not affect recommendations | |
| C6 | Settings → Export my data | Downloads a JSON backup that includes your favourites | |
| C7 | Turn on Airplane Mode and open the app | Shell loads; cards fall back to generated art rather than breaking | |

---

## Automated pre-checks (already run, 2026-07-30)
`npm test` in `web/` — build + 18 headless checks, **all passing**: profile loads without the error boundary · old three-tier rating migrates and renders · no dead "Fine" label survives · favourite toggles · own-outing and favourites filters exist · the coming-later toggle increases the card count (60 → 61, previously 60 → 60) · no she/her in rendered copy with gender unset · all four tabs render.

**What automation could NOT check, and why B-part device testing is the real gate:** Wikimedia photo lookup, Photon/Nominatim address search, camera, video, real touch/drag physics, iOS Safari layout, and service-worker install behaviour.

---

## Defects found
| # | What happened | Steps to reproduce | Severity |
|---|---|---|---|
| | | | |

## Sign-off
- [ ] Founder executed on device · Date: ______
- [ ] Verdict: ship / fix-first / roll back
