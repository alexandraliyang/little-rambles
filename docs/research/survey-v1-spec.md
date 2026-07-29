# Parent Survey v1 — Specification (pre-registered)
Date: 2026-07-27 · Status: **LIVE 2026-07-27** — https://docs.google.com/forms/d/e/1FAIpQLScwGfNEKUm4xONslhSRcn9ZTg5DLxz-zuMA_eHc1PsbffDUyQ/viewform · Tool: Google Forms (see tool decision in CHANGELOG) · Target: ≥60 valid responses in 2–3 weeks · Public title: **"How parents really plan time with little kids — 5-min anonymous survey"**

## Design rules (why it looks like this)
- Q1 open-ended comes BEFORE any pain-themed question → spontaneous pain mentions in Q1 are our "unprompted" measure.
- No concept pitch, no "would you use/pay" hypotheticals anywhere — behavioral questions only (what people DO and PAY, not what they predict).
- Neutral tone; explicitly welcomes "no pain here" answers (self-selection counterweight).
- Last question is the interview funnel.

## Intro text (paste verbatim)
"Anonymous, ~5 minutes. I'm a Vancouver parent doing independent research on how families with babies/toddlers actually decide what to do day to day. I'm exploring a project in this space, but nothing is being sold or promoted — right now I only want to understand real life. Honest, messy answers are the most useful kind. Optional at the end: volunteer for a 30-min chat ($10 gift card)."

## Questions (in this exact order)
S1. Are you a parent/caregiver of a child aged 6 months–5 years? — Yes / No (No → thank-you screen)
S2. Age of your youngest child in that range — 6–11 mo / 12–17 mo / 18–23 mo / 2 yrs / 3–5 yrs
S3. Where do you live? — Metro Vancouver / elsewhere in BC / elsewhere in Canada / USA / other
Q1. (REQUIRED, long text) "Think about your most recent weekend day or day off with your child. How did you decide what to do that day? Walk us through it — the real version, not the ideal one."
Q2. (long text) "What's the hardest or most annoying part of figuring out what to do with your child day to day? If nothing is — say so, that's genuinely useful too."
Q3. In the past month, how often did you think some version of "we keep doing the same things over and over"? — Never / Once or twice / Most weeks / Almost daily
Q4. (multi-select) Where do outing/activity ideas usually come from? — Google or Google Maps / Facebook groups / Instagram or TikTok / Friends & family / Local blogs or newsletters / Library or community-centre listings / ChatGPT or another AI / A dedicated app (named in Q4b) / We mostly repeat our usual spots / Other
Q4b. (optional, short text) Which app(s)?
Q5. Ever arrived somewhere with your child and it was closed, or turned out wrong for their age? — Yes, several times / Once or twice / No
Q6. How much do naps/wake windows shape whether and where you go? — Completely / A lot / Somewhat / Not much
Q7. (multi-select) Which of these do you currently PAY for? — Drop-in classes (music, swim, gym…) / Rec-centre passes or programs / Memberships (aquarium, zoo, science centre…) / Parenting or baby apps & subscriptions (named in Q7b) / None of these
Q7b. (optional, short text) Which subscriptions, and roughly how much per month?
Q8. Do you keep a record or journal of your child's outings and milestones? — Yes, an app (named below) / Yes, a physical baby book / Mostly photos piling up on my phone / Started one and abandoned it / No
Q9. (optional, long text) "If a magic wand fixed ONE thing about planning time with your child, what would it be?"
Q10. How many children do you have? — 1 / 2 / 3+
F1. Open to a relaxed 30-min follow-up chat — video call, phone, or coffee in Vancouver? $10 gift card as thanks. — Yes / No
F2. (shown if F1 = Yes) Email — used only to schedule, deleted after the study.
Thank-you screen: "Thank you — truly. If you know another parent whose honest answer would differ from yours, please pass this along."

## Pre-registered coding rubric (applied to Q1, Q2, Q9 — FROZEN before data collection)
Each open-text response is coded with all that apply:
SAMEY (rut/repetition) · FATIGUE (deciding is effortful; "I always have to come up with it" — mental-load markers) · DISCOVERY (don't know what exists/where to look) · AGE-FIT (unsure what suits the age; wrong-age busts) · LOGISTICS (naps, hours, weather, closures dominate) · GUILT (should be doing more; development worry) · MEMORY (wish I captured/recorded more) · NONE (explicitly content / no pain expressed)
**Gate counts Q1 codes only as "unprompted."** Q2/Q9 codes inform which pain to center, not the gate.

## Amended Phase 1 gate math (mirrors ROADMAP)
- n ≥ 60 valid (S1 yes, child ≤3y for gate counting; 3–5y kept as extension signal)
- ≥30% of Q1 responses carry ≥1 pain code other than NONE (conservative vs the 60% interview bar, acknowledging self-selection)
- ≥40% report ≥1 current paid item in Q7
- ≥8 F1 volunteers → conduct ≥5 interviews (guide unchanged); ≥3/5 unprompted pain in conversation
- Founder week-3 dogfooding criterion unchanged
Kill/pivot: Q1 pain <20% → vitamin verdict, pivot per ROADMAP. 20–30% → judgment call documented in gate review, weighted by interview results.

## Distribution & platform etiquette
- Reddit: r/SampleSize (built for surveys), r/NewParents, r/toddlers, r/beyondthebump, r/daddit, r/vancouver or r/askvan for local — **read each sub's rules first; several require mod approval or restrict surveys to weekly threads. Message mods before posting where unclear.**
- Facebook: Vancouver/Burnaby/Richmond parent & mom groups — post only after reading pinned rules; many require admin approval for research posts.
- Never post the same text simultaneously everywhere; stagger, and note in the tracker where/when posted (for response-source honesty).
- Recruiting copy lives in `docs/research/recruiting-posts.md`; must retain the "routines that work great — want you too" line (disconfirmation quota).

## Analysis loop
Export CSV from the form → upload to Claude with this spec → code open-text per frozen rubric (founder spot-checks a 10-response sample against Claude's coding) → tally gates → file CSV + coded sheet in research/notes/ as [EVIDENCE] → gate review.
