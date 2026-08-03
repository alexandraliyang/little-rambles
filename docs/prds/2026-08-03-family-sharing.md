# PRD: Family sharing — one baby, many caregivers        (one page max)
2026-08-03 · Founder + AI · Target version 4.0.0-beta

## The pain this kills

Two pains, one mechanism.

**The one the founder has stated.** "I'm the mum, I'm the admin, I can invite dad, grandma, auntie to follow baby's page. They can like and leave a comment." The reference is 亲宝宝 (Qinbaobao), where the overwhelming majority of accounts are grandparents who never post — they look. Today Rambles has exactly one user per device and no way for a second person to see anything.

**The one the product already admits to.** Settings currently has to say: photos live on this device only, are not backed up, and *would be lost if you delete the app*. That warning exists because there is nowhere else for the data to be. Every founder testing round has carried it. A journal that can be lost is not a keepsake.

⚠️ **Evidence status.** The founder's request is [DECISION]; the grandparent-usage pattern is [AI-RESEARCH] from the competitive scan, not from our own interviews. Phase 1 research has **not** tested willingness to invite family, nor whether a second caregiver logs anything. This PRD proceeds on founder conviction, and that is stated rather than disguised — see Risks.

## Roadmap gate it serves

Phase 2 (Build) and the assumption set A1 — specifically "logging is used". It also opens the only organic growth loop the product has: an invited caregiver is a new user acquired at zero cost by someone who already trusts the product. Closes debt **T2**, and unblocks **T7** (push needs a server to send from).

## What done means

- A **baby** is the account. Caregivers attach to it; the baby is not owned by a device.
- The admin invites by link or short code. Joining attaches you to that baby with a role.
- **Roles:** `admin` (invite, remove, delete anything, change roles) · `caregiver` (log outings, add photos, edit their own entries) · `viewer` (read, like, comment — nothing else). Grandparents are viewers, and that is the common case, not the edge case.
- Memories, photos, and Our List sync across every member of a baby.
- Any member can **like** a memory and leave a **comment**; both show who and when.
- The Settings warning about losing everything changes, because it stops being true.
- Offline still works: the app is usable with no network and reconciles on reconnect.
- A member who is removed immediately loses access, including to photos.

## Decisions taken (2026-08-03)

- **Account required only to share.** The app keeps working with no account, exactly as today. The first time you invite someone, you create one and your existing journal comes with you. The account appears at the moment its value is obvious, rather than as a wall in front of the first outing (keeps ADR-0002).
- **Local data uploads on first sign-in**, once, explicitly — "bring my 12 memories with me" — never silently, because photographs leaving the device must not be a surprise.
- **Sign in with Google, plus a passwordless email link.** Founder asked for social sign-in. Google covers the large majority and removes the password problem for grandparents entirely. Facebook is deliberately excluded for now: a Meta app plus business verification is materially more setup for a shrinking share of users. Apple Sign In needs a paid Apple Developer account ($99/yr) and is only mandatory for native App Store builds, which this is not.
- **Photos: subjects now, paid stock later** (T1) — close the embarrassing gaps for free, upgrade the highest-traffic cards once there is budget or validation.

## Explicitly NOT building

- **No public sharing.** No public links, no social feed, no discovery of other families. A baby is private to its invited members, full stop.
- **No comment threads, mentions, reactions beyond one like, or notifications feed.** One like, one flat comment list.
- **No multi-baby switching** in this version. One baby per account; siblings come later.
- **No push notifications.** Depends on this shipping first (T7).
- **No migration of an existing device's data into an account** beyond a one-time import of what is already there.
- **No moderation tooling.** Family members are trusted by construction; removal is the only lever.

## Risks & principles check

**ADR-0006 (tap-inferred location only) — no conflict.** Location handling is unchanged.

**ADR-0005 (anti-guilt) — REAL RISK, and the main design constraint.** An audience changes behaviour. Making a private journal observable invites performance, comparison, and the feeling of being behind. Mitigations, binding on the build: no streaks, no counts of who logged more, no "X hasn't visited in N days", no leaderboards, and likes are never surfaced as a total anyone is measured by. If sharing makes a caregiver feel judged, we have broken the product's core promise to fix its second-best feature.

**Privacy — this is the significant one.** Today photographs of a child never leave the device; that is currently a true statement in Settings. This feature makes it false. Uploading images of a named child to a third-party host is a material change that the founder must state in their own words, and it needs: encryption in transit and at rest, deletion that actually deletes (including storage objects), a data region chosen deliberately (Canadian residency available and relevant for child data), and honest Settings copy. **This is the reason the feature waits on an explicit founder decision rather than being assumed.**

**Risk register interaction.** Adds a new dependency (a hosted backend) and a recurring cost to a product with no revenue. Also adds an account-recovery surface: losing access to an account must not mean losing the journal.

**Kill criterion for this feature.** If invited caregivers do not open it twice, sharing is decoration and the cost is not justified — measure before building anything further on top.
