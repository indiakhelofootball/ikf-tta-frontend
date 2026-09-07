import {
  findRepForShipment, findRepIdForShipment, findRepLogoRefForShipment,
} from './courierRepLookup';

const JERTHI = {
  id: 47,
  repName: 'Jerthi Football Club',
  hasLogo: true,
  updatedAt: '2026-09-01T10:00:00Z',
  cityAssignments: [{ id: 101, city: 'Sikar' }, { id: 102, city: 'Sikar' }],
};
const NFA = {
  id: 20,
  repName: 'NFA',
  hasLogo: true,
  updatedAt: '2026-09-02T10:00:00Z',
  cityAssignments: [{ id: 201, city: 'Nimbahera' }],
};
const REPS = [JERTHI, NFA];

describe('the link is used whenever it resolves', () => {
  test('a shipment with a live assignment resolves through it', () => {
    const s = { assignmentId: 201, snapRepName: 'NFA' };
    expect(findRepForShipment(REPS, s)).toBe(NFA);
  });

  test('the link wins over the name — a renamed org still resolves', () => {
    // snapRepName is a snapshot; if the org was renamed afterwards the name no
    // longer matches anything, and the link must still carry it.
    const s = { assignmentId: 101, snapRepName: 'Jerthi FC (old name)' };
    expect(findRepForShipment(REPS, s)).toBe(JERTHI);
  });
});

describe('THE BUG: assignment deleted, link is null', () => {
  test('CR-2026-0043 — dispatched, orphaned, still finds its REP by name', () => {
    const s = { assignmentId: null, snapRepName: 'Jerthi Football Club' };
    expect(findRepForShipment(REPS, s)).toBe(JERTHI);
  });

  test('and therefore the slip can still address the logo it used to lose', () => {
    const s = { assignmentId: null, snapRepName: 'Jerthi Football Club' };
    // The bytes no longer travel in the list; what the slip needs is the id to
    // fetch, plus the updatedAt that versions the URL so a replaced logo is
    // never served from cache.
    expect(findRepLogoRefForShipment(REPS, s)).toEqual({
      id: 47, updatedAt: '2026-09-01T10:00:00Z',
    });
  });

  test('and the REP field is no longer blank when the shipment is opened', () => {
    const s = { assignmentId: null, snapRepName: 'NFA' };
    expect(findRepIdForShipment(REPS, s)).toBe(20);
  });

  test('matching ignores case and surrounding space', () => {
    const s = { assignmentId: null, snapRepName: '  jerthi football CLUB ' };
    expect(findRepForShipment(REPS, s)).toBe(JERTHI);
  });
});

describe('it must not invent a match', () => {
  test('a blank snapshot name matches nothing, not the first blank-named org', () => {
    const reps = [{ id: 9, repName: '', cityAssignments: [] }, JERTHI];
    expect(findRepForShipment(reps, { assignmentId: null, snapRepName: '' })).toBeNull();
    expect(findRepForShipment(reps, { assignmentId: null })).toBeNull();
  });

  test('an org that is genuinely gone stays unresolved', () => {
    const s = { assignmentId: null, snapRepName: 'Dissolved FC' };
    expect(findRepForShipment(REPS, s)).toBeNull();
    expect(findRepIdForShipment(REPS, s)).toBe('');
    expect(findRepLogoRefForShipment(REPS, s)).toBeNull();
  });

  test('an org with no logo yields no logo ref, so no pointless fetch', () => {
    const reps = [{ id: 60, repName: 'SportOwn', hasLogo: false, cityAssignments: [] }];
    const s = { assignmentId: null, snapRepName: 'SportOwn' };
    expect(findRepForShipment(reps, s).id).toBe(60);
    expect(findRepLogoRefForShipment(reps, s)).toBeNull();
  });

  test('the slim list must not be assumed to carry the logo bytes', () => {
    // Guards the regression this change could cause: if someone reintroduces a
    // repLogoUrl read here, it would silently return undefined against
    // /reps/options/ and every slip would print without a logo.
    const s = { assignmentId: 101 };
    const ref = findRepLogoRefForShipment(REPS, s);
    expect(Object.keys(ref).sort()).toEqual(['id', 'updatedAt']);
  });
});

describe('it must not throw on the shapes the API actually returns', () => {
  test('reps not loaded yet', () => {
    expect(findRepForShipment([], { assignmentId: 101 })).toBeNull();
    expect(findRepForShipment(undefined, { assignmentId: 101 })).toBeNull();
    expect(findRepForShipment(null, { assignmentId: 101 })).toBeNull();
  });

  test('no shipment', () => {
    expect(findRepForShipment(REPS, null)).toBeNull();
    expect(findRepForShipment(REPS, undefined)).toBeNull();
  });

  test('a rep row with no cityAssignments array', () => {
    const reps = [{ id: 5, repName: 'Gwalior City FC' }];
    expect(findRepForShipment(reps, { assignmentId: 1 })).toBeNull();
    expect(findRepForShipment(reps, { assignmentId: null, snapRepName: 'Gwalior City FC' }).id)
      .toBe(5);
  });
});
