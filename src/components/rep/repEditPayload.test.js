import { buildEditModePayload, orgDiffers } from './repEditPayload';

const org = (over = {}) => ({
  repName: 'RUFC',
  contactName: 'Nirja',
  phone: '+91 98765 43210',
  email: 'nirja@rufc.org',
  mouStatus: 'Signed',
  repLogoLink: 'https://drive/stored',
  websiteNA: false,
  ...over,
});

const file = (name) => ({ name });

describe('adding a city from the edit screen is not an org edit', () => {
  test('an untouched org is not written at all', () => {
    const baseline = org();
    expect(buildEditModePayload(org(), baseline)).toBeNull();
  });

  test('so a stored phone is not silently normalised', () => {
    // validate_phone strips to ten digits server-side, so PUTting an unchanged
    // form would turn '+91 98765 43210' into '9876543210' on a save where the
    // operator only added a city.
    expect(buildEditModePayload(org(), org())).toBeNull();
  });

  test('a real org edit is still written', () => {
    const out = buildEditModePayload(org({ contactName: 'Someone Else' }), org());
    expect(out).not.toBeNull();
    expect(out.contactName).toBe('Someone Else');
  });

  test('a changed NA toggle counts as an edit', () => {
    const out = buildEditModePayload(org({ websiteNA: true }), org());
    expect(out).not.toBeNull();
    expect(out.websiteNA).toBe(true);
  });
});

describe('an untouched attachment is preserved', () => {
  test('no file keys are sent when nothing was chosen or removed', () => {
    const out = buildEditModePayload(org({ contactName: 'X' }), org());
    expect(out).not.toHaveProperty('mouDocumentUrl');
    expect(out).not.toHaveProperty('repLogoUrl');
    expect(out).not.toHaveProperty('mouDocumentName');
    expect(out).not.toHaveProperty('repLogoName');
  });
});

describe('removing an attachment reaches the server', () => {
  test('pressing remove on the MoU sends an explicit blank', () => {
    const out = buildEditModePayload(org(), org(), {}, { mou: true });
    expect(out).not.toBeNull();
    expect(out.mouDocumentUrl).toBe('');
    expect(out.mouDocumentName).toBe('');
    // The logo was not touched, so it is left alone.
    expect(out).not.toHaveProperty('repLogoUrl');
  });

  test('pressing remove on the logo sends an explicit blank', () => {
    const out = buildEditModePayload(org(), org(), {}, { logo: true });
    expect(out.repLogoUrl).toBe('');
    expect(out.repLogoName).toBe('');
    expect(out).not.toHaveProperty('mouDocumentUrl');
  });

  test('a removal alone is enough to trigger the write', () => {
    // Without this, the org-unchanged check above would swallow the removal.
    expect(buildEditModePayload(org(), org(), {}, { mou: true })).not.toBeNull();
    expect(buildEditModePayload(org(), org(), {}, { logo: true })).not.toBeNull();
  });
});

describe('choosing a new file', () => {
  test('a new MoU replaces, and triggers the write on its own', () => {
    const out = buildEditModePayload(org(), org(), {
      mouDocument: file('new.pdf'), mouDocumentPreview: 'data:application/pdf;base64,NEW',
    });
    expect(out.mouDocumentName).toBe('new.pdf');
    expect(out.mouDocumentUrl).toBe('data:application/pdf;base64,NEW');
  });

  test('a new file after a removal wins — it is not sent as a blank', () => {
    const out = buildEditModePayload(org(), org(), {
      repLogo: file('logo.png'), repLogoPreview: 'data:image/png;base64,NEW',
    }, { logo: true });
    expect(out.repLogoName).toBe('logo.png');
    expect(out.repLogoUrl).toBe('data:image/png;base64,NEW');
  });
});

describe('orgDiffers', () => {
  test('treats undefined and empty string as the same absence', () => {
    expect(orgDiffers({ a: '' }, { a: undefined })).toBe(false);
    expect(orgDiffers({}, {})).toBe(false);
  });

  test('notices a value appearing, changing or being cleared', () => {
    expect(orgDiffers({ a: 'x' }, {})).toBe(true);
    expect(orgDiffers({ a: 'x' }, { a: 'y' })).toBe(true);
    expect(orgDiffers({ a: '' }, { a: 'y' })).toBe(true);
  });

  test('false is a value, not an absence', () => {
    expect(orgDiffers({ na: false }, { na: true })).toBe(true);
    expect(orgDiffers({ na: false }, { na: false })).toBe(false);
  });

  test('missing objects do not throw', () => {
    expect(orgDiffers(undefined, undefined)).toBe(false);
    expect(orgDiffers({ a: 'x' }, undefined)).toBe(true);
  });
});
