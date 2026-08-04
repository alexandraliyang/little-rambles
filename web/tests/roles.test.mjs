/* roles.test — the permission model, before any backend exists.
   These are the rules a family would recognise, stated as assertions. The
   database's RLS must encode the same ones independently; this suite only
   guarantees the client never OFFERS what the server would refuse. */
import { can, canRemoveMember, canChangeMember, canDeleteComment, canLeave, atLeast, makeInviteCode, isValidCode, ROLES } from "../engine/roles.js";

const fails = [];
const ok = (n, c, d) => { if (c) console.log("  PASS  " + n + (d ? "  [" + d + "]" : "")); else { console.log("  FAIL  " + n + (d ? " — " + d : "")); fails.push(n); } };

console.log("\nroles unit tests\n");

const mum     = { userId: "u1", role: "admin" };
const dad     = { userId: "u2", role: "caregiver" };
const grandma = { userId: "u3", role: "viewer" };
const members = [mum, dad, grandma];

/* --- the grandparent case, which is the common one --- */
ok("a viewer can see the baby's page", can(grandma, "view"));
ok("a viewer can like", can(grandma, "like"));
ok("a viewer can comment", can(grandma, "comment"));
ok("a viewer CANNOT log an outing", !can(grandma, "logOuting"));
ok("a viewer CANNOT add photos", !can(grandma, "addPhoto"));
ok("a viewer CANNOT invite", !can(grandma, "invite"));

/* --- caregiver --- */
ok("a caregiver can log an outing", can(dad, "logOuting"));
ok("a caregiver can add photos", can(dad, "addPhoto"));
ok("a caregiver can plan an outing", can(dad, "planOuting"));
ok("a caregiver CANNOT invite", !can(dad, "invite"));
ok("a caregiver CANNOT remove a member", !can(dad, "removeMember"));

/* --- admin --- */
ok("an admin can invite", can(mum, "invite"));
ok("an admin can change roles", can(mum, "changeRole"));
ok("an admin can still do everything a caregiver can", can(mum, "logOuting") && can(mum, "addPhoto"));

/* --- ownership --- */
const dadsEntry = { authorId: "u2" };
ok("a caregiver can edit their own entry", can(dad, "editOwn", dadsEntry));
ok("a caregiver CANNOT edit someone else's", !can(dad, "editOwn", { authorId: "u1" }));
ok("an admin can edit anyone's entry", can(mum, "editOwn", dadsEntry));
ok("anyone can delete their OWN comment", canDeleteComment(grandma, { authorId: "u3" }));
ok("nobody deletes someone else's comment", !canDeleteComment(grandma, { authorId: "u2" }));
ok("an admin can delete any comment", canDeleteComment(mum, { authorId: "u3" }));

/* --- the lockout cases: a baby must never end up with no admin --- */
ok("the only admin cannot remove themselves",
   !canRemoveMember(mum, mum, members).ok, canRemoveMember(mum, mum, members).why);
ok("the only admin cannot be demoted",
   !canChangeMember(mum, mum, members, "viewer").ok, canChangeMember(mum, mum, members, "viewer").why);
const twoAdmins = [mum, { userId: "u4", role: "admin" }, dad];
ok("with a second admin, demotion is allowed",
   canChangeMember(mum, twoAdmins[1], twoAdmins, "caregiver").ok);
ok("an admin can remove a caregiver", canRemoveMember(mum, dad, members).ok);
ok("a caregiver cannot remove anyone", !canRemoveMember(dad, grandma, members).ok);
ok("removing someone who isn't a member is refused", !canRemoveMember(mum, null, members).ok);

/* --- leaving: anyone may, except the last admin --- */
ok("a viewer can leave", canLeave(grandma, members).ok);
ok("a caregiver can leave", canLeave(dad, members).ok);
ok("the ONLY admin cannot leave", !canLeave(mum, members).ok, canLeave(mum, members).why);
ok("and is told how to make it possible",
   /make someone else an admin/i.test(canLeave(mum, members).why));
ok("an admin can leave once there is a second one", canLeave(mum, twoAdmins).ok);
ok("someone who isn't a member cannot leave", !canLeave(null, members).ok);

/* --- deny by default --- */
ok("an unknown action is denied even for an admin", !can(mum, "launchMissiles"));
ok("a member with no role is denied", !can({ userId: "x", role: "" }, "view"));
ok("a member with an invented role is denied", !can({ userId: "x", role: "superuser" }, "view"));
ok("null member is denied", !can(null, "view"));
ok("role ranking is ordered", atLeast("admin", "viewer") && !atLeast("viewer", "admin"));
ok("there are exactly three roles", ROLES.length === 3, ROLES.join("/"));

/* --- invite codes: read aloud, typed by a grandparent --- */
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const code = makeInviteCode(6, rnd);
ok("an invite code is six characters", code.length === 6, code);
ok("codes avoid glyphs that are misread aloud", !/[O0I1L]/.test(code), code);
ok("a well-formed code validates", isValidCode(code), code);
ok("a short code is refused", !isValidCode("ABC"));
ok("an empty code is refused", !isValidCode(""));
ok("codes are accepted regardless of case or spacing", isValidCode(" ab2-c3d "), "normalised");

console.log("\n" + (fails.length ? fails.length + " FAILED: " + fails.join(", ") : "all roles checks passed") + "\n");
process.exit(fails.length ? 1 : 0);
