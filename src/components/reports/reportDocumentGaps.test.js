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
