/* format — dates, ages, clock times, month names. Pure, no dependencies.
   Separated so engine/ can render honest labels ("In season Nov-Dec", "Opens
   ~9am") without reaching into the React layer. */
export const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY = 86400000;
export const monthsOld = (bd) => { const b = new Date(bd + "T00:00:00"), n = new Date(); let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth()); if (n.getDate() < b.getDate()) m -= 1; return Math.max(0, m); };
export const fmtAge = (m) => (m < 24 ? m + " mo" : Math.floor(m / 12) + "y" + (m % 12 ? " " + (m % 12) + "m" : ""));
export const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60), ap = hh >= 12 ? "pm" : "am", h12 = ((hh + 11) % 12) + 1; return mm ? `${h12}:${String(mm).padStart(2, "0")}${ap}` : `${h12}${ap}`; };
