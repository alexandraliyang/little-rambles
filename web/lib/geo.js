/* geo — distance, geocoding, and every Maps URL the app produces. Pure: must
   never import React. Address results are ranked nearest-first, because a
   geocoder with no location bias offers the same global places to everyone
   (FB3-01), and "Directions" means directions to a known address, not a
   re-centred area search (FB8-01).
   Routed from docs/MAP.md: "location search shows far-away places". */
/* FB3-01. Great-circle distance, used to rank address results the way a maps app
   does: what is near you first, not whatever the geocoder happened to return. */
export const haversine = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
};
export const fmtKm = (km) => (km == null ? ""
  : km < 1 ? Math.round(km * 1000) + " m away"
  : km < 10 ? km.toFixed(1) + " km away"
  : Math.round(km).toLocaleString() + " km away");
/* Keyless worldwide address autocomplete (Photon, OpenStreetMap data).
   Returns {label, lat, lng} so Maps searches can be centred on real coordinates. */
async function photon(q, near) {
  /* location_bias_scale pulls results towards `near` inside Photon's own ranking;
     without it a two-letter query returns the same global places for everyone. */
  const bias = near && near.lat != null ? "&lat=" + near.lat + "&lon=" + near.lng + "&location_bias_scale=0.8&zoom=12" : "";
  const r = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=12" + bias);
  if (!r.ok) throw new Error("photon " + r.status);
  const j = await r.json();
  return (j.features || []).map((f) => {
    const p = f.properties || {};
    const l1 = [p.name, p.housenumber && p.street ? p.housenumber + " " + p.street : p.street].filter(Boolean).join(", ");
    const l2 = [p.district, p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(", ");
    return { label: l1 || l2, sub: l1 && l2 !== l1 ? l2 : "", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  }).filter((x) => x.label);
}
async function nominatim(q, near) {
  /* An unbounded viewbox: local matches float up, but somewhere genuinely far
     away is still findable when you are planning a trip. */
  const box = near && near.lat != null
    ? "&viewbox=" + [near.lng - 1.2, near.lat + 0.9, near.lng + 1.2, near.lat - 0.9].map((n) => n.toFixed(4)).join(",")
    : "";
  const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=12&addressdetails=1" + box + "&q=" + encodeURIComponent(q));
  if (!r.ok) throw new Error("nominatim " + r.status);
  const j = await r.json();
  return (j || []).map((x) => {
    const parts = String(x.display_name).split(",").map((s) => s.trim());
    return { label: parts.slice(0, 2).join(", "), sub: parts.slice(2, 5).filter(Boolean).join(", "), lat: +x.lat, lng: +x.lon };
  });
}
/* Blend the provider's own text relevance with distance, rather than sorting on
   either alone. Distance dominates (a nearby match wins) but relevance breaks
   ties inside a band, so an exact name match never drops below a vague one. */
function rankByProximity(hits, near) {
  if (!near || near.lat == null) return hits.slice(0, 7);
  /* Bands, not raw kilometres — but only where banding earns its keep.
     Under 100km everything is a plausible outing, so the geocoder's own text
     relevance breaks ties and an exact name match never loses to a vaguer one
     200m closer. Past that nothing is reachable today, relevance stops meaning
     anything, and the only number the user can act on is the one we print — so
     it sorts strictly by distance. Mixing the two is what made a far tail read
     1,765 / 1,772 / 1,595 and look broken. */
  const NEAR = 100;
  const band = (km) => (km == null ? 6 : km < 2 ? 0 : km < 10 ? 1 : km < 30 ? 2 : km < NEAR ? 3 : km < 500 ? 5 : km < 2000 ? 7 : 9);
  /* Kept strictly under the 2-point gap between bands, so this orders results
     inside a band without ever letting a far one jump a nearer band. */
  const tail = (km) => Math.min(km, 20000) / 20000 * 1.9;
  return hits
    .map((h, i) => {
      const km = haversine(near, h);
      const within = km == null || km < NEAR ? i * 0.5 : tail(km);
      return { h: { ...h, km }, s: band(km) * 2 + within };
    })
    .sort((a, b) => a.s - b.s)
    .slice(0, 7)
    .map((x) => x.h);
}
/* Two independent providers so one being blocked or slow never leaves the user stuck. */
export async function geoSearch(q, near) {
  if (!q || q.trim().length < 2) return [];
  const dedupe = (arr) => { const seen = {}; return arr.filter((x) => (seen[x.label + x.sub] ? false : (seen[x.label + x.sub] = true))); };
  try { const a = await photon(q, near); if (a.length) return rankByProximity(dedupe(a), near); } catch (e) {}
  return rankByProximity(dedupe(await nominatim(q, near)), near);
}
/* When we hold real coordinates we centre the Maps search on them (@lat,lng),
   which is the only reliable way to move results off the phone's default area. */
const gmaps = (q, place) => {
  if (place && place.lat != null) return "https://www.google.com/maps/search/" + encodeURIComponent(q) + "/@" + place.lat + "," + place.lng + ",14z";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q + (place && place.label ? " near " + place.label : ""));
};
export const nearQuery = (q, place) => gmaps(q, place);
/* FB8-01. "Directions" now means directions. When a memory recorded an exact
   address — or a GPS pin — that is the destination, full stop: no "near home"
   suffix and no map re-centring, both of which turned a known address back into
   a fuzzy area search. Falls back to a search only when all we ever had was a
   generic activity name. */
export const directionsTo = (place, pin) => {
  if (pin && pin.lat != null) return "https://www.google.com/maps/dir/?api=1&destination=" + pin.lat + "," + pin.lng;
  const p = String(place || "").trim();
  if (!p) return null;
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(p);
};
export const venueQuery = (name, area, place) => gmaps(name + (area ? ", " + area : ""), place);

