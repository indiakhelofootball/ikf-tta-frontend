// Regression tests for "Address and MOU, Logo got deleted again" — tracker row
// #2, reported six times — and for the two over-corrections that followed it.
//
// The rule under all three is a layer boundary: adding a city does not edit the
// org it is being added to. See repMergePayload.js.

import { buildAddModePayload } from './repMergePayload';

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

describe('creating a new org — the name matches nothing', () => {
  test('fields that carry a value are sent', () => {
    const out = buildAddModePayload(org(), null);
    expect(out.repName).toBe('RUFC');
    expect(out.contactName).toBe('Nirja');
    expect(out.phone).toBe('9876543210');
  });

  test('blanks are not sent', () => {
    const out = buildAddModePayload(org(), null);
    expect(out).not.toHaveProperty('repLogoLink');
    expect(out).not.toHaveProperty('mouStatus');
    expect(out).not.toHaveProperty('season');
    expect(out).not.toHaveProperty('email');
  });

  test('false and 0 are values, not blanks — the NA toggles must survive', () => {
    // websiteNA etc. are booleans. A truthiness filter would have dropped every
    // false and silently re-enabled a URL the user marked not-applicable.
    const out = buildAddModePayload(
      { websiteNA: false, facebookNA: true, count: 0 }, null,
    );
    expect(out.websiteNA).toBe(false);
    expect(out.facebookNA).toBe(true);
    expect(out.count).toBe(0);
  });
});

describe('adding a city — the name matches an existing org', () => {
  const existing = {
    repLogoLink: 'https://drive.google.com/stored-logo',
    mouStatus: 'Signed',
    season: 'Season 5',
    website: 'https://rufc.example',
  };

  test('only the name goes on the wire', () => {
    const out = buildAddModePayload(org(), existing);
    expect(out).toEqual({ repName: 'RUFC' });
  });

  test('THE BUG: an untouched repLogoLink can no longer wipe the stored one', () => {
    // The name search never prefills this box, so it reads '' while the org
    // holds a link. The previous rule called that blank "clearable" and put it
    // on the wire, wiping the logo of any org you added a city to.
    const out = buildAddModePayload(org({ repLogoLink: '' }), existing);
    expect(out).not.toHaveProperty('repLogoLink');
  });

  test('org values the operator can still see are not resent', () => {
    // The modal prefills these and disables them, so they arrive unchanged and
    // used to be written back over themselves. Harmless until one of them
    // differed, which is how contact_name and email moved on a 201.
    const out = buildAddModePayload(
      org({ contactName: 'Someone Else', phone: '9000000000', mouStatus: 'Not Required' }),
      existing,
    );
    expect(out).not.toHaveProperty('contactName');
    expect(out).not.toHaveProperty('phone');
    expect(out).not.toHaveProperty('mouStatus');
  });

  test('a typed org value is not smuggled through either', () => {
    // Reachable before the debounced name lookup resolves, when the org inputs
    // are still enabled. It must not reach the org; the server ignores it too.
    const out = buildAddModePayload(org({ season: 'Season 6' }), existing);
    expect(out).not.toHaveProperty('season');
  });
});

describe('edge cases', () => {
  test('a missing orgData does not throw', () => {
    expect(buildAddModePayload(undefined, null)).toEqual({});
    expect(buildAddModePayload(null, { a: 'b' })).toEqual({});
  });
});
