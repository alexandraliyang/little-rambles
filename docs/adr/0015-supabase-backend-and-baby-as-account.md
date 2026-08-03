# ADR-0015: A baby is the account; Supabase holds it; permissions are a pure function
Date: 2026-08-03 · Status: Accepted (region and photo-upload decided 2026-08-03; account pending) · Origin: founder — "I'm the mum, I'm the admin, I can invite dad, grandma, auntie to follow baby's page. They can like and leave a comment." Reference: 亲宝宝.

## Context

Every version so far has been a static bundle plus IndexedDB on one device: no accounts, no server, no sync. That was the right call for Phases 0–1 — it kept the whole product deployable as seven files and cost nothing. It is also why Settings has to warn that deleting the app loses the journal (debt T2), and why reminders cannot reach anyone who has not already opened the app (T7).

Family sharing is the first requirement that cannot be met on the client. Three things need a server that a device cannot provide: a durable home for data that outlives any one phone, an authority that decides who may read what, and a place to put photographs that two people can both see.

Options considered:

**Supabase** — Postgres, auth, object storage, and row-level security. RLS matters more than it sounds: the rule "you may read a memory only if you are a member of that baby" is expressed once, in the database, and is then true for every client, every query, and every future surface. Free tier is generous; ~$25/mo when outgrown. Canadian regions available.

**Firebase** — fastest to a working sync and excellent offline. But security rules are a bespoke language rather than SQL, the data model resists the relational shape this problem actually has (members, roles, comments, likes all join naturally), and cost is famously hard to predict on read-heavy workloads. A photo-heavy family app is read-heavy.

**Own API on a small host** — most control, and the most surface to get wrong. Auth, session handling, storage signing, backups and their restoration would all become ours to maintain, for a product with one developer and no revenue.

**Nothing; keep it local and export/import files.** Genuinely considered, because it preserves the "photos never leave the device" promise exactly. Rejected: it does not deliver the thing asked for — a grandparent cannot follow a file.

## Decision

**Supabase**, with three structural choices that matter more than the vendor:

**1. A baby is the account, not a person.** `babies` is the root. People attach through `baby_members(baby_id, user_id, role)`. This is the same shape 亲宝宝 uses and it is why a grandparent can join without owning anything. It also makes removal a single row delete, and multi-baby a later feature rather than a rewrite.

**2. Three roles, and `viewer` is the common case.** `admin` (invite, remove, change roles, delete anything) · `caregiver` (log outings, add photos, edit their own) · `viewer` (read, like, comment). Designing for grandparents-as-viewers rather than treating them as degraded caregivers is the difference between a product they use and one they are locked out of.

**3. Permission logic is a pure function in `engine/roles.js`, mirrored by RLS.** The client must never be the authority — RLS is — but the client must not *offer* an action it will then be refused. One pure, unit-tested module answers "may this member do this?", and the SQL policies encode the same rules. The module is written and tested **before** the backend exists, because it depends on none of it.

Vendor lock-in is bounded deliberately: Supabase is Postgres. The schema, the data, and the policies are portable. Only auth and storage calls are vendor-shaped, and they sit behind `lib/sync.js`.

## Consequences

Easier: the journal survives a lost phone. A second caregiver becomes a user acquired for free. Push (T7) becomes possible. The Settings warning stops being true.

Harder, and knowingly accepted: a recurring cost against no revenue; an account-recovery surface where losing an account must not mean losing the journal; offline becomes a real sync problem rather than the only mode; and a third party now holds photographs of a named child.

**Given up:** the current, literally true promise that photos never leave the device. Founder decided 2026-08-03 to upload photos, on the grounds that a grandparent seeing an outing without its picture is most of the emotional value gone. The Settings copy must be rewritten in the founder's own words before any tester sees it.

**Region: ca-central-1 (Montreal), decided 2026-08-03.** The founder asked for something that works "for Canada, US, Australia, EU — all over the developed world". A Supabase project lives in exactly one region, so this is a single choice, and Canada is the one that travels furthest. Canada holds an **EU adequacy decision** for commercial organisations under PIPEDA, so EU→Canada personal-data transfers need no Standard Contractual Clauses or additional safeguards. The US does not have that clean standing: the EU-US Data Privacy Framework replaced two invalidated arrangements and is itself under challenge, so a US region would put an EU legal question in the product's foundations. Australia imposes no residency requirement that Canada fails. Latency is the only cost, and it is small: the app is a static PWA served from a CDN, and only reads and writes cross the Atlantic.

Revisit if: cost outgrows the product before revenue exists (self-host Supabase, same schema), or if research shows invited caregivers do not return — the PRD names that kill criterion, and it should be measured before anything is built on top of this.
