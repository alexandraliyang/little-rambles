/* availability — open, closing, shut, or out of season? Pure; no React, no DOM.
   `offseason` is deliberately NOT `closed`: one means come back in four months,
   the other means come back tomorrow. Conflating them put Christmas tree farms
   in the August deck (FB4-02). */
import { MON, fmtHour } from "../lib/format.js";

export function availability(a, now = new Date()) {
  const h = a.hours, mo = now.getMonth() + 1, day = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
  /* FB4-02. Out of season is NOT the same as closed. "Closed" means come back
     tomorrow morning; out of season means come back in four months, and a
     Christmas tree farm has no business being recommended in August. They shared
     a status, so the ranker treated them identically. */
  if (h.months) { const [s, e] = h.months; const inSeason = s <= e ? (mo >= s && mo <= e) : (mo >= s || mo <= e); if (!inSeason) return { st: "offseason", rank: -2, label: `In season ${MON[s]}–${MON[e]}` }; }
  if (!h.days.includes(day)) return { st: "closed", rank: -1, label: h.days.length === 2 ? "Weekends" : "Weekdays only" };
  if (hr < h.open) return h.open - hr <= 1.5 ? { st: "soon", rank: 0.5, label: `Opens ~${fmtHour(h.open)}` } : { st: "closed", rank: -1, label: `Opens ~${fmtHour(h.open)}` };
  if (hr >= h.close) return { st: "closed", rank: -1, label: "Done for today" };
  if (h.close - hr <= 1) return { st: "closing", rank: 0.6, label: `Closes ~${fmtHour(h.close)}` };
  return { st: "open", rank: 1, label: { daily: "Open now", daylight: "Good now", seasonal: "Open now · in season", schedule: "Sessions today — check times" }[h.conf] };
}
