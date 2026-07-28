# Software Development Primer — for the Founder of Little Rambles
Status: living learning doc · Written 2026-07-27 · Read time ~25 min · Goal: not to make you a programmer, but to make you a founder who understands what's being built, can direct it, and can catch what's missing. You already caught one real defect (the D2 doc drift) with zero technical knowledge — this doc multiplies that ability.

---

## Part 1 — What a web app actually is (the four boxes)

Every product like Little Rambles is four boxes talking to each other:

**Frontend** — everything the parent sees and taps. Screens, buttons, the pin pill, the check-in modal. Our v0.3 `.jsx` file is *entirely* frontend: it runs on the user's own phone/browser. Written in a language called JavaScript using a library called **React** (a way of building screens out of reusable components — a "card", a "badge" — like standardized Lego bricks).

**Backend** — a program running on a server (a computer in a data center) that does the things you can't trust or fit into a phone: checking who's logged in, running the nightly hours refresh, talking to Google's Places API with our secret key. v0.3 has no backend — that's literally what "Phase 2: Real Software" means: building this box.

**Database** — where data lives permanently: each family's profile, visits, ratings. Think of it as ultra-structured, multi-user spreadsheets with rules ("every visit must belong to a child; every child must belong to an account"). We'll use **Postgres** via a service called **Supabase**, which bundles database + login/auth + file storage so a solo founder doesn't build those from scratch.

**Hosting** — the service that keeps frontend and backend running on the internet 24/7 (we'll use **Vercel**) plus a **domain name** (littlerambles.app or similar, ~$15/yr).

One more term you'll hear: **PWA (progressive web app)** — a website that installs on a phone home screen and can send notifications, without app stores. Our Phase 2 choice, because it skips Apple/Google review friction during beta. A "native app" (real App Store app) is a possible Phase 5 decision, driven by whether we need things PWAs do poorly (reliable iOS notifications is the classic one).

## Part 2 — The toolchain you'll actually touch

**Git & GitHub.** Git is version control: it records every change to every file, by whom, when, and why, forever. GitHub is the website that hosts git repositories. This is the answer to your documentation question at industrial strength — the entire history, tamper-proof, with the ability to see "what changed between last Tuesday and today" in one click. *Your first hands-on task (before Phase 2, ~1 hour): create a free GitHub account, create a private repository, upload this bundle. I can walk you through it step-by-step when you're ready.*
Vocabulary you'll hear: **commit** = one saved change with a message ("add nap layer") · **branch** = a parallel workspace to try something without touching the main copy · **pull request (PR)** = "here's a batch of changes, review before merging" — this is where your audits will live · **merge** = accept the changes into main.

**Claude Code.** The build method for Phase 2: an agentic coding tool where you describe what you want (backed by our PRDs) and it writes, runs, and tests the code in your repository while you review in plain language. Your role stays director + auditor; the primer's Part 5 is your audit toolkit for exactly this.

**The terminal.** A text window for giving the computer direct commands. You'll use maybe ten commands ever; each will be given to you exactly when needed. It looks intimidating and is not.

## Part 3 — How building actually proceeds (the loop)

Professional software isn't built in one heroic push; it's a repeating loop, and you already know most of it because our docs system encodes it:

1. **Decide** — PRD written first (our template): the pain it kills, what "done" means, what we're NOT building.
2. **Build** — on a branch, in small pieces. Small is a virtue: a 50-line change can be reviewed and reversed; a 5,000-line change is faith.
3. **Test** — three layers: automated tests (small programs that check the code — e.g., "a 13-month profile must never be recommended the science centre"; they re-run on every change forever, so old features can't silently break — this is called *regression protection*); manual testing (you, on your phone, being a difficult user: what if the birthdate is tomorrow? what if I tap twice?); and later, beta users.
4. **Review** — the PR: read the description, run the audit checklist (Part 5), ask questions.
5. **Deploy** — publish. Three **environments**: *local* (developer's machine) → *preview/staging* (a private URL where you test each change before the world sees it — Vercel makes one automatically per PR, which is wonderful) → *production* (real users). Rule: nothing reaches production that you didn't touch in preview.
6. **Monitor** — production telemetry: **error monitoring** (Sentry — tells you when the app crashes for someone before they email you) and **product analytics** (opens, taps, check-ins — the Phase 3 gate numbers come from here; instrument them in Phase 2 or you'll be blind at the gate).
7. **Document** — CHANGELOG + affected docs, same sitting. You know this one; you enforced it before I did.

## Part 4 — The supporting systems checklist (what a real app needs beyond features)

Use this as your "did we miss anything" list entering Phase 2 — each item is a yes/no you can ask about:

Accounts & login (Supabase Auth; email magic-link is the low-friction choice for parents) · Database with **backups** (automatic daily; ask to see a restore actually tested once) · Privacy & compliance (D3: privacy policy, data deletion path, minimal collection — COPPA/PIPEDA; entry gate, already in ROADMAP) · Security basics (secrets like API keys live in server config, never in code; user data only reachable through permission rules — Supabase "row-level security": ask "can family A ever query family B's visits? show me why not") · Error monitoring (Sentry) · Analytics events (define the exact list in the Phase 2 PRD: open, recommend_shown, lets_go, checkin, journal_view) · Cost picture at beta scale: domain ~$15/yr, Vercel free–$20/mo, Supabase free–$25/mo, Sentry free tier, Google Places API ~$0–50/mo capped — **call it under ~$75/month; anything above needs a written reason.**

## Part 5 — How to audit the work (your superpower, systematized)

You don't need to read code to audit effectively. Auditing is checking *claims against artifacts* — precisely how you caught D2. The method:

**The five audit questions** (use on any "it's done"):
1. **"Show me."** Every claim has an artifact — a preview URL you can tap, a file you can open, a test that runs. No artifact = not done. (D2's failure: a *declared* amendment with no edited file.)
2. **"Where is it written down?"** Feature → CHANGELOG entry; decision → ADR; behavior → matches PRD's "done" list, item by item, checked by you on your own phone.
3. **"What did you NOT do?"** Forces scope honesty. Good answers are specific ("no holiday hours yet — tracked as debt"). Vague answers are the red flag.
4. **"What happens when it goes wrong?"** The empty state, the typo, the offline moment, the double-tap. Amateur software handles the happy path; real software handles Tuesday.
5. **"If we removed this, what breaks?"** Detects ornamental work — code that exists but serves no gate.

**Red flags that mean dig deeper:** declared-but-not-applied changes (you've met this one) · "it works on my machine" without a preview URL · features that skipped their PRD · a CHANGELOG that's behind the code · test counts that never grow while features do · any answer to a yes/no audit question that isn't yes or no.

**Your standing audit cadence:** per-PR: five questions above · weekly: INDEX integrity checklist (5 items, in INDEX.md) · per-gate: full review with debts ledger, risk register, and the drift check (Rule 7).

## Part 6 — What to learn vs. what to delegate

Learn (high leverage, ~10 focused hours total): the four boxes and how data flows between them · git/GitHub basics by doing (create repo, make a commit, open a PR) · reading a database schema as tables-and-relationships (I'll draw ours) · reading analytics dashboards (your gate numbers) · the audit method above, until it's reflex.
Delegate without guilt: syntax, frameworks, CSS, server configuration, the actual writing of code. Knowing *what must exist and why* is the founder's job; typing it is not.
The learning path is sequenced with the phases: nothing in Part 2–4 needs to be learned before it's needed. When Phase 2 opens, the first session is: GitHub repo + first commit + I explain every file as it lands. You'll audit from day one.
