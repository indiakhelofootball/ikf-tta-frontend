import {
  countDocumentGaps, filterByGap, describeSkipped, hasLogo, hasMou,
  MISSING_LOGO, MISSING_MOU,
} from './reportDocumentGaps';

const withBoth = { id: 1, repName: 'Jerthi Football Club', repLogoUrl: 'data:image/png;base64,A', mouDocumentUrl: 'data:application/pdf;base64,B' };
const logoOnly = { id: 2, repName: 'DFA Jaisalmer', repLogoUrl: 'data:image/png;base64,A', mouDocumentUrl: '' };
const neither = { id: 60, repName: 'SportOwn', repLogoUrl: '', mouDocumentUrl: '' };
const mouOnly = { id: 4, repName: 'Goal Academy', repLogoUrl: '', mouDocumentUrl: 'data:application/pdf;base64,B' };
const ALL = [withBoth, logoOnly, neither, mouOnly];

describe('what counts as having a document', () => {
  test('a stored file is present', () => {
    expect(hasLogo(withBoth)).toBe(true);
    expect(hasMou(withBoth)).toBe(true);
  });

  test('empty string is absent — that is what the backend stores for "none"', () => {
    expect(hasLogo(neither)).toBe(false);
    expect(hasMou(logoOnly)).toBe(false);
  });

  test('whitespace is absent, not a document', () => {
    expect(hasLogo({ repLogoUrl: '   ' })).toBe(false);
  });

  test('missing key, null, and a non-string do not throw', () => {
    expect(hasLogo({})).toBe(false);
    expect(hasLogo({ repLogoUrl: null })).toBe(false);
    expect(hasLogo({ repLogoUrl: 12345 })).toBe(false);
    expect(hasLogo(null)).toBe(false);
    expect(hasLogo(undefined)).toBe(false);
  });
});

describe('the counts shown beside the header', () => {
  test('counts each gap independently', () => {
    expect(countDocumentGaps(ALL)).toEqual({ missingLogo: 2, missingMou: 2, total: 4 });
  });

  test('an org missing both is counted in both', () => {
    expect(countDocumentGaps([neither])).toEqual({ missingLogo: 1, missingMou: 1, total: 1 });
  });

  test('a complete roster reports zero, not a falsy muddle', () => {
    expect(countDocumentGaps([withBoth])).toEqual({ missingLogo: 0, missingMou: 0, total: 1 });
  });

  test('no reps loaded yet', () => {
    expect(countDocumentGaps([])).toEqual({ missingLogo: 0, missingMou: 0, total: 0 });
    expect(countDocumentGaps(undefined)).toEqual({ missingLogo: 0, missingMou: 0, total: 0 });
    expect(countDocumentGaps(null)).toEqual({ missingLogo: 0, missingMou: 0, total: 0 });
  });
});

describe('clicking a count filters to exactly those organisations', () => {
  test('missing logo', () => {
    expect(filterByGap(ALL, MISSING_LOGO).map(r => r.repName))
      .toEqual(['SportOwn', 'Goal Academy']);
  });

  test('missing MoU', () => {
    expect(filterByGap(ALL, MISSING_MOU).map(r => r.repName))
      .toEqual(['DFA Jaisalmer', 'SportOwn']);
  });

  test('no gap selected returns everything, unfiltered', () => {
    expect(filterByGap(ALL, null)).toHaveLength(4);
    expect(filterByGap(ALL, '')).toHaveLength(4);
    expect(filterByGap(ALL, 'something-else')).toHaveLength(4);
  });

  test('the count and the filter always agree', () => {
    const { missingLogo, missingMou } = countDocumentGaps(ALL);
    expect(filterByGap(ALL, MISSING_LOGO)).toHaveLength(missingLogo);
    expect(filterByGap(ALL, MISSING_MOU)).toHaveLength(missingMou);
  });
});

describe('what the download says it skipped', () => {
  test('names both gaps', () => {
    expect(describeSkipped(ALL))
      .toBe('2 had no logo: SportOwn, Goal Academy. 2 had no MoU: DFA Jaisalmer, SportOwn');
  });

  test('says nothing when everything was downloadable', () => {
    expect(describeSkipped([withBoth])).toBe('');
    expect(describeSkipped([])).toBe('');
    expect(describeSkipped(undefined)).toBe('');
  });

  test('truncates a long list rather than filling the screen', () => {
    // 46 of 64 orgs had no MoU on production — the untruncated list is unusable.
    const many = Array.from({ length: 10 }, (_, i) => ({ repName: `Org ${i}`, repLogoUrl: 'x' }));
    expect(describeSkipped(many, 3))
      .toBe('10 had no MoU: Org 0, Org 1, Org 2, +7 more');
  });

  test('an unnamed org is still reported rather than dropped', () => {
    expect(describeSkipped([{ repLogoUrl: 'x' }])).toBe('1 had no MoU: Unnamed');
  });
});

describe('slim rows: the backend flags follow this same rule', () => {
  // Mirrors FLAG_CASES in tta_backend reps/test_slim.py, which checks
  // stored_value_present() against the same values. Change both together.
  const ch = (...codes) => String.fromCharCode(...codes);
  const FLAG_CASES = [
    ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', true],
    ['data:application/pdf;base64,JVBERi0xLjQK', true],
    ['Budge-Budge MOU-S6.pdf', true],
    ['https://example.com/mou.pdf', true],
    ['DATA:image/png;base64,AAAA', true],
    [' data:image/png;base64,AAAA', true],
    ['', false],
    ['   ', false],
    [ch(0x09), false],
    [ch(0x0d, 0x0a, 0x20), false],
    [ch(0xa0), false],
    [ch(0xfeff), false],
    [ch(0x3000, 0x2028), false],
    [ch(0x1c), true],
    [ch(0x85), true],
  ];

  test.each(FLAG_CASES)('%j present = %s on a full row', (value, present) => {
    expect(hasLogo({ repLogoUrl: value })).toBe(present);
    expect(hasMou({ mouDocumentUrl: value })).toBe(present);
  });

  test('a slim row is judged by its flags, which the counts and filters use', () => {
    const slimRows = [
      { repName: 'A', hasLogo: true, hasMou: false, repLogoText: '', mouDocumentText: '   ' },
      { repName: 'B', hasLogo: false, hasMou: true, repLogoText: '', mouDocumentText: '' },
    ];
    expect(countDocumentGaps(slimRows)).toEqual({ missingLogo: 1, missingMou: 1, total: 2 });
    expect(filterByGap(slimRows, MISSING_MOU).map(r => r.repName)).toEqual(['A']);
    expect(describeSkipped(slimRows)).toBe('1 had no logo: B. 1 had no MoU: A');
  });
});
