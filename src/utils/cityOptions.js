import { City } from 'country-state-city';

// The bundled `country-state-city` list is the only source the city pickers
// ever had, and it is old: it carries Cuddapah rather than Kadapa (renamed
// 2005), has no Eluru at all, and predates the 2022 Andhra Pradesh district
// reorganisation. 168 names for Andhra Pradesh, most of them district
// headquarters. So the name the team uses daily is routinely not the name the
// list stores, and the picker's answer was "No options" — which reads as "this
// city does not exist in the system".
//
// Pairs are unordered on purpose. Whichever side the library actually carries
// becomes the selectable option and the other becomes a search alias for it,
// so this table never has to assert which spelling the package chose.
const NAME_PAIRS = [
  ['Kadapa', 'Cuddapah'],
  ['Amlapuram', 'Amalapuram'],
  ['Kalaburagi', 'Gulbarga'],
  ['Bengaluru', 'Bangalore'],
  ['Mysuru', 'Mysore'],
  ['Belagavi', 'Belgaum'],
  ['Hubballi', 'Hubli'],
  ['Shivamogga', 'Shimoga'],
  ['Vijayapura', 'Bijapur'],
  ['Ballari', 'Bellary'],
  ['Tumakuru', 'Tumkur'],
  ['Chikkamagaluru', 'Chikmagalur'],
  ['Mumbai', 'Bombay'],
  ['Chennai', 'Madras'],
  ['Kolkata', 'Calcutta'],
  ['Puducherry', 'Pondicherry'],
  ['Prayagraj', 'Allahabad'],
  ['Gurugram', 'Gurgaon'],
  ['Vadodara', 'Baroda'],
  ['Thiruvananthapuram', 'Trivandrum'],
  ['Kozhikode', 'Calicut'],
  ['Kochi', 'Cochin'],
  ['Alappuzha', 'Alleppey'],
  ['Kollam', 'Quilon'],
  ['Thrissur', 'Trichur'],
  ['Tiruchirappalli', 'Trichy'],
  ['Thoothukudi', 'Tuticorin'],
  ['Puri', 'Jagannath Puri'],
];

export const normaliseCityKey = (value) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const aliasesFor = (name) => {
  const key = normaliseCityKey(name);
  const out = [];
  for (const pair of NAME_PAIRS) {
    const [a, b] = pair;
    if (normaliseCityKey(a) === key) out.push(b);
    else if (normaliseCityKey(b) === key) out.push(a);
  }
  return out;
};

// Library cities for a state, plus any names the projects already use that the
// library does not have. Every option carries its aliases so a search can match
// on a name the team uses even when the stored name differs.
export const buildCityOptions = (isoCode, extraNames = []) => {
  if (!isoCode) return [];
  const libCities = City.getCitiesOfState('IN', isoCode) || [];
  const seen = new Set(libCities.map((c) => normaliseCityKey(c.name)));
  const options = libCities.map((c) => ({ ...c, aliases: aliasesFor(c.name) }));

  for (const name of extraNames) {
    const key = normaliseCityKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push({ name, isProjectCity: true, aliases: aliasesFor(name) });
  }
  return options;
};

// Filter for Autocomplete. Matches the option name OR any of its aliases, and
// when nothing matches exactly it appends an explicit "use what I typed" entry.
// The entry is a choice she has to click — not free text saved on blur — so a
// half-typed name cannot become a city by accident.
export const filterCityOptions = (options, inputValue, { allowNew = true } = {}) => {
  const raw = String(inputValue || '').trim();
  const input = normaliseCityKey(raw);
  if (!input) return options;

  const scored = [];
  for (const o of options) {
    const name = normaliseCityKey(o.name);
    const alias = (o.aliases || []).find((a) => normaliseCityKey(a).includes(input));
    if (name.includes(input)) scored.push([name.startsWith(input) ? 0 : 1, o, null]);
    else if (alias) scored.push([normaliseCityKey(alias).startsWith(input) ? 0 : 1, o, alias]);
  }
  scored.sort((x, y) => x[0] - y[0] || normaliseCityKey(x[1].name).localeCompare(normaliseCityKey(y[1].name)));
  const matches = scored.map(([, o, alias]) => (alias ? { ...o, matchedAlias: alias } : o));

  // An exact hit means the name exists; offering to create it again is how a
  // second row for one place gets made. Case and spacing differences count as
  // exact, so "kadapa" cannot be added next to "Kadapa".
  const exact = options.some((o) => normaliseCityKey(o.name) === input)
    || options.some((o) => (o.aliases || []).some((a) => normaliseCityKey(a) === input));
  if (allowNew && !exact && raw.length >= 2) {
    matches.push({ name: raw, isNew: true, aliases: [] });
  }
  return matches;
};

// One label for all three pickers. The alias and "not in the standard list"
// hints are the half that stops the next complaint: they tell her that Kadapa
// is stored as Cuddapah instead of leaving her to guess.
export const cityOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return option.name || '';
};

export const cityOptionHint = (option) => {
  if (!option) return '';
  if (option.isNew) return 'not in the standard list — add it as typed';
  if (option.matchedAlias) return `also known as ${option.matchedAlias}`;
  if (option.isProjectCity) return 'already used by a project';
  return '';
};
