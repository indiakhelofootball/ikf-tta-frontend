import { State } from 'country-state-city';
import { buildCityOptions, filterCityOptions, cityOptionHint } from './cityOptions';

const iso = (stateName) =>
  State.getStatesOfCountry('IN').find((s) => s.name === stateName).isoCode;

const AP = iso('Andhra Pradesh');
const MP = iso('Madhya Pradesh');

const names = (opts) => opts.map((o) => o.name);

describe('the library gap these pickers had', () => {
  // These four are the actual complaints from 18 Sep, and they are the reason
  // the module exists. If the bundled library is ever updated, these assertions
  // should start failing — that is the signal, not a break.
  test('the library alone cannot offer the names the team uses', () => {
    const lib = buildCityOptions(AP);
    expect(names(lib)).toContain('Cuddapah');
    expect(names(lib)).not.toContain('Kadapa');
    expect(names(lib)).not.toContain('Eluru');
    expect(names(buildCityOptions(MP))).not.toContain('Sardarpur');
  });
});

describe('alias search', () => {
  test('typing a current name finds the old one the library stores', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Kadapa');
    expect(names(out)).toContain('Cuddapah');
    expect(out.find((o) => o.name === 'Cuddapah').matchedAlias).toBe('Kadapa');
    expect(cityOptionHint(out.find((o) => o.name === 'Cuddapah')))
      .toBe('also known as Kadapa');
  });

  test('a misspelling finds the real entry', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Amlapuram');
    expect(names(out)).toContain('Amalapuram');
  });

  test('an alias hit does not also offer to create the name', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Kadapa');
    expect(out.filter((o) => o.isNew)).toHaveLength(0);
  });
});

describe('typed entry', () => {
  test('a genuinely missing city is offered as typed', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Eluru');
    const made = out.find((o) => o.isNew);
    expect(made.name).toBe('Eluru');
    expect(cityOptionHint(made)).toBe('not in the standard list — add it as typed');
  });

  test('an exact existing name is never offered as new', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Vijayawada');
    expect(out.filter((o) => o.isNew)).toHaveLength(0);
  });

  test('case and spacing differences count as the same city', () => {
    for (const typed of ['vijayawada', 'VIJAYAWADA', '  Vijayawada  ']) {
      expect(filterCityOptions(buildCityOptions(AP), typed).filter((o) => o.isNew))
        .toHaveLength(0);
    }
  });

  test('a city already used by a project is offered, not duplicated', () => {
    const out = filterCityOptions(buildCityOptions(AP, ['Kadapa']), 'Kadapa');
    expect(names(out).filter((n) => n === 'Kadapa')).toHaveLength(1);
    expect(out.filter((o) => o.isNew)).toHaveLength(0);
    expect(cityOptionHint(out.find((o) => o.name === 'Kadapa')))
      .toBe('already used by a project');
  });

  test('one character does not create a city', () => {
    expect(filterCityOptions(buildCityOptions(AP), 'E').filter((o) => o.isNew))
      .toHaveLength(0);
  });

  test('allowNew false never offers a typed name', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'Eluru', { allowNew: false });
    expect(out.filter((o) => o.isNew)).toHaveLength(0);
  });
});

describe('the unchanged path', () => {
  // Reverse-check: this is what the pickers did before, and it must still hold.
  // A green suite that only tests the new behaviour proves nothing about what
  // was already working.
  test('every library city is still offered for a state', () => {
    expect(buildCityOptions(AP).length).toBe(168);
    expect(buildCityOptions(MP).length).toBe(275);
  });

  test('an ordinary substring search behaves as before', () => {
    const out = filterCityOptions(buildCityOptions(AP), 'vij');
    expect(names(out)).toContain('Vijayawada');
    expect(out[0].name.toLowerCase().startsWith('vij')).toBe(true);
  });

  test('project cities absent from the library are merged in', () => {
    const out = buildCityOptions(MP, ['Sardarpur', 'Bhopal']);
    expect(names(out)).toContain('Sardarpur');
    expect(names(out).filter((n) => n === 'Bhopal')).toHaveLength(1);
  });

  test('empty input returns the whole list untouched', () => {
    const opts = buildCityOptions(AP);
    expect(filterCityOptions(opts, '')).toBe(opts);
  });

  test('no state means no options', () => {
    expect(buildCityOptions(null)).toEqual([]);
  });
});
