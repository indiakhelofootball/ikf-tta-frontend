// Regression tests for AUDIT_2026-08-26 §1.4 and the frontend half of §1.2.
//
// §1.4: every optional box left empty was coerced to null. The serializer
// fields are allow_blank but not allow_null, so a city with any optional field
// blank could not be created at all — the operator saw "Failed to save city."
// §1.2b: the picker wrote `zone`, a key no serializer field accepts, so the
// region the operator chose was discarded on the wire.

import { buildCityPayload, REGIONS } from './cityPayload';

const form = (over = {}) => ({
  state: 'Bihar',
  stateCode: 'BR',
  city: 'Patna',
  region: '',
  assignedREP: '',
  groundLocation: '',
  groundVerified: false,
  trialType: '',
  monthOnly: '',
  comment: '',
  ...over,
});

describe('buildCityPayload', () => {
  test('THE BUG: an untouched optional field is sent as blank, never null', () => {
    const out = buildCityPayload(form(), 'BR-PAT-001');
    ['region', 'assignedREP', 'groundLocation', 'trialType', 'monthOnly', 'comment'].forEach(
      (key) => {
        expect(out[key]).toBe('');
        expect(out[key]).not.toBeNull();
      }
    );
  });

  test('THE BUG: the chosen region rides on `region`, and there is no `zone` key', () => {
    const out = buildCityPayload(form({ region: 'East' }), 'BR-PAT-001');
    expect(out.region).toBe('East');
    expect(out).not.toHaveProperty('zone');
  });

  test('values the operator typed are carried through untouched', () => {
    const out = buildCityPayload(
      form({
        assignedREP: 'RUFC',
        groundLocation: 'Gandhi Maidan',
        groundVerified: true,
        trialType: 'IKF Trial',
        monthOnly: 'March',
        comment: 'note',
      }),
      'BR-PAT-001'
    );
    expect(out).toMatchObject({
      code: 'BR-PAT-001',
      state: 'Bihar',
      city: 'Patna',
      trialCityName: 'Patna',
      assignedREP: 'RUFC',
      groundLocation: 'Gandhi Maidan',
      groundVerified: true,
      trialType: 'IKF Trial',
      monthOnly: 'March',
      comment: 'note',
    });
  });

  test('stateCode is a picker-only field and never goes on the wire', () => {
    expect(buildCityPayload(form(), 'BR-PAT-001')).not.toHaveProperty('stateCode');
  });

  test('the offered regions are exactly the serializer choices', () => {
    // The serializer is a ChoiceField now (§1.8): an option outside this list
    // would 400. 'Not Yet Decided' used to be offered and is not a choice —
    // blank is how "undecided" is stored.
    expect(REGIONS).toEqual(['North', 'South', 'East', 'West', 'Central']);
  });
});
