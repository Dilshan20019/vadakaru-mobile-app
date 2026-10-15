// Sri Lanka is UTC+05:30. All "today/tomorrow" logic uses that offset, not the server clock.
const OFFSET_MS = 5.5 * 60 * 60 * 1000;

function colomboDate(offsetDays = 0) {
  return new Date(Date.now() + OFFSET_MS + offsetDays * 86400000).toISOString().slice(0, 10);
}

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

module.exports = { colomboDate, haversineKm };
