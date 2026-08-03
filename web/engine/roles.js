/* roles — who may do what to a baby's records. Pure: no React, no network, no
   Supabase. See ADR-0015.

   This module is NOT the security boundary. The database's row-level security
   is, and it must encode the same rules independently — a client that lies
   about its role must be refused by the server regardless of what this says.
   What this module prevents is the *other* failure: offering a caregiver a
   button that the server will then reject, which reads as the app being broken.

   Written and tested before the backend exists, because it depends on none of
   it. Every rule below is a sentence a family would recognise. */

/* Ordered weakest to strongest. Comparisons use the index, never string
   equality, so adding a role later does not mean auditing every call site. */
export const ROLES = ["viewer", "caregiver", "admin"];
export const ROLE_LABEL = {
  viewer: "Can see and comment",
  caregiver: "Can add outings and photos",
  admin: "Runs the family — can invite and remove",
};
const rank = (r) => ROLES.indexOf(r);
export const atLeast = (role, min) => rank(role) >= rank(min) && rank(role) >= 0;

/* Every capability the UI can offer. Anything not listed is not permitted. */
export const CAN = {
  view: "viewer",
  like: "viewer",
  comment: "viewer",
  logOuting: "caregiver",
  addPhoto: "caregiver",
  editOwn: "caregiver",
  planOuting: "caregiver",
  invite: "admin",
  removeMember: "admin",
  changeRole: "admin",
  deleteBaby: "admin",
};

/* `member` is { role, userId }; `subject` is the row being acted on, when the
   answer depends on who created it. */
export function can(member, action, subject) {
  if (!member || !member.role || rank(member.role) < 0) return false;
  const min = CAN[action];
  if (!min) return false;                       // unknown action: deny, never allow
  if (!atLeast(member.role, min)) return false;

  /* A caregiver owns what they wrote and nothing else. An admin may tidy up
     anything, because somebody has to be able to. A viewer may always delete
     their OWN comment — being able to withdraw your own words is not a
     privilege, and requiring an admin for it would be absurd. */
  if (subject && (action === "editOwn" || action === "deleteEntry")) {
    if (member.role === "admin") return true;
    return !!subject.authorId && subject.authorId === member.userId;
  }
  return true;
}

export const canDeleteComment = (member, comment) =>
  !!member && (member.role === "admin" || (!!comment && comment.authorId === member.userId));

/* An admin may not remove themselves or drop their own role while they are the
   only one left: a baby with no admin can never be invited into again, and no
   support desk exists to recover it. */
export function canChangeMember(member, target, members, nextRole) {
  if (!can(member, "changeRole")) return { ok: false, why: "Only an admin can change who does what." };
  if (!target) return { ok: false, why: "That person is not part of this family." };
  const admins = (members || []).filter((m) => m.role === "admin");
  const lastAdmin = target.role === "admin" && admins.length <= 1;
  if (lastAdmin && nextRole !== "admin") {
    return { ok: false, why: "Make someone else an admin first — a baby's page always needs one." };
  }
  return { ok: true };
}

export function canRemoveMember(member, target, members) {
  if (!can(member, "removeMember")) return { ok: false, why: "Only an admin can remove someone." };
  if (!target) return { ok: false, why: "That person is not part of this family." };
  if (target.userId === member.userId) return { ok: false, why: "You can't remove yourself. Hand admin to someone else first." };
  const admins = (members || []).filter((m) => m.role === "admin");
  if (target.role === "admin" && admins.length <= 1) {
    return { ok: false, why: "That's the only admin — make someone else an admin first." };
  }
  return { ok: true };
}

/* Invite codes are read aloud across a kitchen table and typed by grandparents.
   Ambiguous glyphs (0/O, 1/I/L) are excluded, and the alphabet is uppercase so
   there is no case to get wrong. Not a secret: an invite is single-use,
   expires, and is bound to one baby server-side. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function makeInviteCode(len = 6, rnd = Math.random) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(rnd() * CODE_ALPHABET.length)];
  return out;
}
export const normaliseCode = (s) =>
  String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0").replace(/[IL]/g, "1")     // undo the classic mis-reads...
    .replace(/0/g, "O").replace(/1/g, "I");        // ...then map onto the alphabet we use
export const isValidCode = (s) => /^[A-Z0-9]{6}$/.test(String(s || "").toUpperCase().replace(/[^A-Za-z0-9]/g, ""));
