// D-019: where an activity was, city first as the funder reads it, then the
// venue typed on the activity when it says something the city does not.
export function activityLocation(a) {
  const city = String(a?.trialCityName || '').trim();
  const venue = String(a?.location || '').trim();
  if (!city) return venue || '—';
  if (!venue || venue.toLowerCase() === city.toLowerCase()) return city;
  return `${city} · ${venue}`;
}
