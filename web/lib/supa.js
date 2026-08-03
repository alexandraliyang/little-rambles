/* supa — the one place that knows about the backend. See ADR-0015.

   The anon key below is PUBLIC BY DESIGN. It identifies the project and nothing
   else; it grants no access on its own. Every row a client can reach is decided
   by row-level security in the database (web/supabase/001_family_sharing.sql),
   which is why this key is safe to ship inside the bundle. The service_role key
   is the opposite of this and must never appear in client code.

   The app must keep working with no backend at all: family sharing is additive,
   and a caregiver with no account still has a complete local journal. Every
   caller therefore checks `enabled` rather than assuming a client exists. */
import { createClient } from "@supabase/supabase-js";

export const SUPA_URL = "https://qopwdepadqdhcjmxuncv.supabase.co";
export const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcHdkZXBhZHFkaGNqbXh1bmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3ODU3NTcsImV4cCI6MjEwMTM2MTc1N30.RWedSLmED1lXH4AKW9X9umFTpaaygS0wPGgo8K-0scM";

export const enabled = !!(SUPA_URL && SUPA_ANON);

/* Created lazily so a device that never signs in pays nothing for this. */
let _client = null;
export function supa() {
  if (!enabled) return null;
  if (!_client) {
    _client = createClient(SUPA_URL, SUPA_ANON, {
      /* detectSessionInUrl MUST be true for OAuth: the provider sends the user
         back with the session in the URL fragment, and this is what reads it. */
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      global: { headers: { "x-application-name": "little-rambles" } },
    });
  }
  return _client;
}

/* Supabase errors arrive as objects, and their `message` is often written for a
   developer. Anything shown to a caregiver goes through here first. */
export function humanError(e) {
  const m = String((e && e.message) || e || "").toLowerCase();
  if (!m) return "Something went wrong. Try again in a moment.";
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Check your email and tap the confirmation link first.";
  if (m.includes("already registered")) return "That email already has an account — sign in instead.";
  if (m.includes("password should be")) return "Passwords need to be at least 6 characters.";
  if (m.includes("not valid any more") || m.includes("invite")) return "That invite code has expired or has already been used.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts just now — wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "No connection. Your journal still works offline.";
  return (e && e.message) || "Something went wrong.";
}
