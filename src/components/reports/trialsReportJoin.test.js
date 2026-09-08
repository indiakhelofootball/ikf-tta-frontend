import {
  buildCityAssignmentIndex, resolveAssignment, assignmentIsReachable,
} from './trialsReportJoin';

const trial = (id, cities) => ({ id, assignedCities: cities });
const city = (cityName, state) => ({ cityName, state });
const rep = (repName, assignments) => ({ repName, cityAssignments: assignments });
const asn = (trialId, cityName, state, extra = {}) => ({
  trialId, city: cityName, state, ...extra,
});

describe('the cross-state rebind this module exists to stop', () => {
  const trials = [trial(1, [city('Aurangabad', 'Maharashtra'), city('Aurangabad', 'Bihar')])];
  const reps = [
    rep('MH Rep', [asn(1, 'Aurangabad', 'Maharashtra', {
      physicalAddress: 'MH ground', googleMapLink: 'http://maps/mh', pinCode: '431001',
    })]),
    rep('BR Rep', [asn(1, 'Aurangabad', 'Bihar', {
      physicalAddress: 'BR ground', googleMapLink: 'http://maps/br', pinCode: '824101',
    })]),
  ];
  const index = buildCityAssignmentIndex(trials, reps);

  it('gives each state its own REP and address', () => {
    const mh = resolveAssignment(index, 1, 'Aurangabad', 'Maharashtra');
    const br = resolveAssignment(index, 1, 'Aurangabad', 'Bihar');
    expect(mh.reps).toEqual(['MH Rep']);
    expect(mh.physicalAddress).toBe('MH ground');
    expect(mh.groundPinCode).toBe('431001');
    expect(br.reps).toEqual(['BR Rep']);
    expect(br.physicalAddress).toBe('BR ground');
    expect(br.groundPinCode).toBe('824101');
  });

  it('returns nothing rather than the other state when the state is unknown', () => {
    // The old key was `${trialId}||${city}`, so this returned whichever
    // assignment was absorbed first and printed its address on both rows.
    expect(resolveAssignment(index, 1, 'Aurangabad', '')).toBeUndefined();
    expect(resolveAssignment(index, 1, 'Aurangabad', 'Gujarat')).toBeUndefined();
  });
});

describe('rows that work today keep working', () => {
  const trials = [trial(7, [city('Kota', 'Rajasthan')])];

  it('matches when only the assignment carries no state', () => {
    const reps = [rep('R', [asn(7, 'Kota', '', { physicalAddress: 'Ground A' })])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(resolveAssignment(index, 7, 'Kota', 'Rajasthan').physicalAddress).toBe('Ground A');
  });

  it('matches when the two states are spelt differently', () => {
    const reps = [rep('R', [asn(7, 'Kota', 'RAJ', { physicalAddress: 'Ground B' })])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(resolveAssignment(index, 7, 'Kota', 'Rajasthan').physicalAddress).toBe('Ground B');
  });

  it('ignores case and surrounding space in the city name', () => {
    const reps = [rep('R', [asn(7, '  kota ', 'Rajasthan', { physicalAddress: 'Ground C' })])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(resolveAssignment(index, 7, 'Kota', 'Rajasthan').physicalAddress).toBe('Ground C');
  });

  it('keeps two REPs on one city as two names against one address', () => {
    const reps = [
      rep('First', [asn(7, 'Kota', 'Rajasthan', { physicalAddress: 'Ground D' })]),
      rep('Second', [asn(7, 'Kota', 'Rajasthan', { physicalAddress: 'Ground E' })]),
    ];
    const index = buildCityAssignmentIndex(trials, reps);
    const hit = resolveAssignment(index, 7, 'Kota', 'Rajasthan');
    expect(hit.reps).toEqual(['First', 'Second']);
    expect(hit.physicalAddress).toBe('Ground D');
  });

  it('does not bleed across projects', () => {
    const twoTrials = [trial(7, [city('Kota', 'Rajasthan')]), trial(8, [city('Kota', 'Rajasthan')])];
    const reps = [rep('R', [asn(7, 'Kota', 'Rajasthan', { physicalAddress: 'Only 7' })])];
    const index = buildCityAssignmentIndex(twoTrials, reps);
    expect(resolveAssignment(index, 7, 'Kota', 'Rajasthan').physicalAddress).toBe('Only 7');
    expect(resolveAssignment(index, 8, 'Kota', 'Rajasthan')).toBeUndefined();
  });
});

describe('data-entry variance is NOT a collision', () => {
  // The first version of this module treated "the assignments disagree about the
  // state" as ambiguity. On a project listing ONE Kota, with REP A on
  // "Rajasthan" and REP B on "RAJ", it kept only A, blanked the address and
  // reported B as an orphan -- the exact complaint this file exists to fix.
  const trials = [trial(7, [city('Kota', 'Rajasthan')])];
  const reps = [
    rep('A', [asn(7, 'Kota', 'Rajasthan', { physicalAddress: '' })]),
    rep('B', [asn(7, 'Kota', 'RAJ', { physicalAddress: 'Ground B', googleMapLink: 'http://maps/b' })]),
  ];
  const index = buildCityAssignmentIndex(trials, reps);

  it('keeps both REPs on the row', () => {
    expect(resolveAssignment(index, 7, 'Kota', 'Rajasthan').reps).toEqual(['A', 'B']);
  });

  it('keeps the address that only the other spelling carried', () => {
    const hit = resolveAssignment(index, 7, 'Kota', 'Rajasthan');
    expect(hit.physicalAddress).toBe('Ground B');
    expect(hit.googleMapLink).toBe('http://maps/b');
  });

  it('does not report the other spelling as an orphan', () => {
    expect(assignmentIsReachable(index, asn(7, 'Kota', 'RAJ'))).toBe(true);
  });
});

describe('a project with no duplicate city name behaves exactly as before', () => {
  // The guarantee that bounds the blast radius: where the project lists each
  // city name once, this module returns the name-only merge the report always
  // used, whatever the states say.
  const trials = [trial(3, [city('Pune', 'Maharashtra'), city('Kota', 'Rajasthan')])];
  const reps = [
    rep('P1', [asn(3, 'Pune', '', { physicalAddress: 'P addr' })]),
    rep('P2', [asn(3, 'Pune', 'MH', { groundLocation: 'P ground' })]),
    rep('K1', [asn(3, 'Kota', 'WRONG STATE', { physicalAddress: 'K addr' })]),
  ];
  const index = buildCityAssignmentIndex(trials, reps);

  it('merges every assignment for the city regardless of state', () => {
    const pune = resolveAssignment(index, 3, 'Pune', 'Maharashtra');
    expect(pune.reps).toEqual(['P1', 'P2']);
    expect(pune.physicalAddress).toBe('P addr');
    expect(pune.groundLocation).toBe('P ground');
  });

  it('still matches a plainly wrong state', () => {
    expect(resolveAssignment(index, 3, 'Kota', 'Rajasthan').physicalAddress).toBe('K addr');
  });

  it('orphans nothing', () => {
    expect(assignmentIsReachable(index, asn(3, 'Pune', ''))).toBe(true);
    expect(assignmentIsReachable(index, asn(3, 'Kota', 'WRONG STATE'))).toBe(true);
  });
});

describe('orphan detection follows the same rules', () => {
  it('does not turn a blank-state assignment into an orphan', () => {
    const trials = [trial(7, [city('Kota', 'Rajasthan')])];
    const reps = [rep('R', [asn(7, 'Kota', '')])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(assignmentIsReachable(index, asn(7, 'Kota', ''))).toBe(true);
  });

  it('reports an unresolvable assignment rather than misplacing it', () => {
    const trials = [trial(1, [city('Aurangabad', 'Maharashtra'), city('Aurangabad', 'Bihar')])];
    const reps = [rep('R', [asn(1, 'Aurangabad', '')])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(assignmentIsReachable(index, asn(1, 'Aurangabad', ''))).toBe(false);
  });

  it('still reports a city the trial no longer lists', () => {
    const trials = [trial(7, [city('Kota', 'Rajasthan')])];
    const reps = [rep('R', [asn(7, 'Bikaner', 'Rajasthan')])];
    const index = buildCityAssignmentIndex(trials, reps);
    expect(assignmentIsReachable(index, asn(7, 'Bikaner', 'Rajasthan'))).toBe(false);
  });
});

describe('empty and malformed input', () => {
  it('survives missing arrays', () => {
    const index = buildCityAssignmentIndex(undefined, undefined);
    expect(resolveAssignment(index, 1, 'Kota', 'Rajasthan')).toBeUndefined();
    expect(assignmentIsReachable(index, asn(1, 'Kota', 'Rajasthan'))).toBe(false);
  });

  it('survives a trial with no cities and a rep with no assignments', () => {
    const index = buildCityAssignmentIndex([{ id: 1 }], [{ repName: 'R' }]);
    expect(resolveAssignment(index, 1, 'Kota', '')).toBeUndefined();
  });
});
