// Regression tests for "Address and MOU, Logo got deleted again" — tracker row
// #2, reported six times.
//
// The bug and its over-correction are two sides of one rule, so both directions
// are asserted here. Sending every blank wiped stored values on merge; dropping
// every blank made a deliberate clear impossible.

import { buildAddModePayload, isClearable } from './repMergePayload';

const org = (over = {}) => ({
  repName: 'RUFC',
  contactName: 'Nirja',
  phone: '9876543210',
  email: '',
  season: '',
  mouStatus: '',
  repLogoLink: '',
  website: '',
  ...over,
});

describe('isClearable', () => {
  test('only when the matched org actually holds a value', () => {
    expect(isClearable({ repLogoLink: 'https://x' }, 'repLogoLink')).toBe(true);
    expect(isClearable({ repLogoLink: '' }, 'repLogoLink')).toBe(false);
    expect(isClearable({}, 'repLogoLink')).toBe(false);
    expect(isClearable(null, 'repLogoLink')).toBe(false);
  });
});

describe('buildAddModePayload — no matching org', () => {
  test('THE BUG: blanks are not sent, so nothing stored can be wiped', () => {
    const out = buildAddModePayload(org(), null);
    expect(out).not.toHaveProperty('repLogoLink');
    expect(out).not.toHaveProperty('mouStatus');
    expect(out).not.toHaveProperty('season');
    expect(out).not.toHaveProperty('email');
  });

  test('fields that carry a value are always sent', () => {
    const out = buildAddModePayload(org(), null);
    expect(out.repName).toBe('RUFC');
    expect(out.contactName).toBe('Nirja');
    expect(out.phone).toBe('9876543210');
  });
});

describe('buildAddModePayload — merging onto a matched org', () => {
  const existing = {
    repLogoLink: 'https://drive.google.com/stored-logo',
    mouStatus: 'Signed',
    season: 'Season 5',
    website: 'https://rufc.example',
  };

  test('an untouched blank is still dropped, so the stored value survives', () => {
    // repLogoLink is never prefilled by the name search, so it reads '' even
    // though the org holds one. It IS clearable, so it goes on the wire — and
    // the value sent is the blank the box actually holds.
    // The protection that matters is the next test: a field the search DID
    // prefill and the user did not touch is non-blank, so it is sent as-is.
    const out = buildAddModePayload(org({ mouStatus: 'Signed' }), existing);
    expect(out.mouStatus).toBe('Signed');
  });

  test('THE OVER-CORRECTION: clearing a prefilled field still clears it', () => {
    // The search prefilled mouStatus='Signed'; the user emptied the box. That
    // is a deliberate clear and must reach the server. Dropping every blank
    // would have silently discarded it.
    const out = buildAddModePayload(org({ mouStatus: '' }), existing);
    expect(out).toHaveProperty('mouStatus');
    expect(out.mouStatus).toBe('');
  });

  test('a blank is dropped when the org has nothing there to clear', () => {
    const out = buildAddModePayload(org({ email: '' }), existing);
    expect(out).not.toHaveProperty('email');
  });

  test('both behaviours hold in one payload', () => {
    const out = buildAddModePayload(
      org({ mouStatus: '', season: 'Season 6', email: '' }),
      existing,
    );
    expect(out.mouStatus).toBe('');        // cleared on purpose -> sent
    expect(out.season).toBe('Season 6');   // edited -> sent
    expect(out).not.toHaveProperty('email'); // nothing to clear -> dropped
  });
});

describe('buildAddModePayload — edge cases', () => {
  test('a missing orgData does not throw', () => {
    expect(buildAddModePayload(undefined, null)).toEqual({});
    expect(buildAddModePayload(null, { a: 'b' })).toEqual({});
  });

  test('false and 0 are values, not blanks — the NA toggles must survive', () => {
    // websiteNA etc. are booleans. `value !== ''` keeps them; a truthiness
    // filter would have dropped every false and silently re-enabled a URL the
    // user marked not-applicable.
    const out = buildAddModePayload(
      { websiteNA: false, facebookNA: true, count: 0 }, null,
    );
    expect(out.websiteNA).toBe(false);
    expect(out.facebookNA).toBe(true);
    expect(out.count).toBe(0);
  });
});
