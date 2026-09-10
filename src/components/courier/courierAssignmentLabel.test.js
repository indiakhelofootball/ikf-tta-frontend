import { assignmentOptionLines, assignmentSelectedLabel } from './courierAssignmentLabel';

// The real pairs, read from /api/reps/options/ on production 2026-09-10. Each
// is one REP holding one city under two projects. All 22 rows are CORRECT data
// and must not be "cleaned up" — two programmes genuinely visit the same city.
const AMBIGUOUS_PAIRS = [
  ['Best Stars', 'Indore', 'Madhya Pradesh', 'IKF-S6-006', 'IKF-S6-008'],
  ['Braj Sports Foundation', 'Mathura', 'Uttar Pradesh', 'TRI-S6-001', 'IKF-S6-001'],
  ['DFA Jaisalmer', 'Jaisalmer', 'Rajasthan', 'IKF-S6-006', 'IKF-S6-008'],
  ['Dhingsara Football Club', 'Fatehabad, Dhingsara', 'Haryana', 'TRI-S6-001', 'IKF-S6-001'],
  ['Jerthi Football Club', 'Sikar', 'Rajasthan', 'IKF-S6-006', 'IKF-S6-008'],
  ['Jodhpur City FC', 'Jodhpur', 'Rajasthan', 'IKF-S6-006', 'IKF-S6-008'],
  ['Master Bacchi Club', 'Bikaner', 'Rajasthan', 'IKF-S6-008', 'IKF-S6-006'],
  ['Meerut Youth Football Academy', 'Meerut', 'Uttar Pradesh', 'TRI-S6-001', 'IKF-S6-001'],
  ['NFA', 'Nimbahera', 'Rajasthan', 'IKF-S6-008', 'IKF-S6-006'],
  ['South Clan Football Academy', 'Rajahmundry', 'Andhra Pradesh', 'IKF-S6-006', 'IKF-S6-008'],
  ['South Clan Football Academy', 'Anantapur', 'Andhra Pradesh', 'IKF-S6-008', 'IKF-S6-006'],
];

const TYPE_OF = {
  'IKF-S6-001': 'IKF Naari Shakti Trials',
  'IKF-S6-006': 'IKF Scout on Wheel',
  'IKF-S6-008': 'IKF Scout on Wheel Naari Shakti',
  'TRI-S6-001': 'Trials',
};

const pairToOptions = ([, city, state, codeA, codeB]) => [
  { id: 1, city, state, trialName: codeA, trialType: TYPE_OF[codeA] },
  { id: 2, city, state, trialName: codeB, trialType: TYPE_OF[codeB] },
];

const twoLineLabel = (a) => {
  const { primary, secondary } = assignmentOptionLines(a);
  return `${primary}\n${secondary}`;
};

describe('the two-line option separates every ambiguous pair on production', () => {
  test.each(AMBIGUOUS_PAIRS)('%s — %s, %s', (...pair) => {
    const [a, b] = pairToOptions(pair);
    expect(twoLineLabel(a)).not.toEqual(twoLineLabel(b));
  });
});

// Reverse checks. A test that only asserts the new label is distinct would
// still pass if the labelling stopped working, as long as it stayed distinct
// by accident. These pin the three shapes that were MEASURED to fail on
// 2026-09-09, so nobody rebuilds one of them believing it is equivalent.
describe('the shapes that were measured to fail, and why they are not used', () => {
  const cityOnly = (a) => `${a.city}, ${a.state}`;
  const appendType = (a) => `${a.city}, ${a.state} — ${a.trialType}`;
  const collisions = (label) =>
    AMBIGUOUS_PAIRS.filter((pair) => {
      const [a, b] = pairToOptions(pair);
      return label(a) === label(b);
    }).length;

  test('city and state alone collide on all 11 — this is the bug', () => {
    expect(collisions(cityOnly)).toBe(11);
  });

  test('the project TYPE appended to one line is a strict prefix on 8', () => {
    // "IKF Scout on Wheel" against "IKF Scout on Wheel Naari Shakti": one
    // label is the whole of the other plus a tail. Any truncation that cuts
    // the longer one back to the shorter one's length makes them equal, so
    // this fails at SOME dropdown width no matter which width you pick. That
    // is why the assertion is on the prefix relation and not on a guessed
    // number of pixels.
    const oneIsAPrefixOfTheOther = AMBIGUOUS_PAIRS.filter((pair) => {
      const [a, b] = pairToOptions(pair);
      return appendType(a).startsWith(appendType(b)) || appendType(b).startsWith(appendType(a));
    }).length;
    expect(oneIsAPrefixOfTheOther).toBe(8);
  });

  test('the project CODE appended to one line differs only in its last character on 8', () => {
    const differsOnlyAtTheEnd = AMBIGUOUS_PAIRS.filter((pair) => {
      const [a, b] = pairToOptions(pair);
      const la = `${a.city}, ${a.state} — ${a.trialName}`;
      const lb = `${b.city}, ${b.state} — ${b.trialName}`;
      let i = 0;
      while (i < la.length && la[i] === lb[i]) i += 1;
      return i >= la.length - 1;
    }).length;
    expect(differsOnlyAtTheEnd).toBe(8);
  });

  test('the two-line form puts the difference in the first characters of line two', () => {
    // The whole point: the codes lead, so nothing can trim them away and the
    // eye reaches the difference first.
    AMBIGUOUS_PAIRS.forEach((pair) => {
      const [a, b] = pairToOptions(pair);
      const sa = assignmentOptionLines(a).secondary;
      const sb = assignmentOptionLines(b).secondary;
      let i = 0;
      while (i < sa.length && sa[i] === sb[i]) i += 1;
      expect(i).toBeLessThan(10);
    });
  });

  test('the two-line form collides on none', () => {
    expect(collisions(twoLineLabel)).toBe(0);
  });
});

describe('the closed field', () => {
  test('stays one line and still carries the project code', () => {
    const [a] = pairToOptions(AMBIGUOUS_PAIRS[9]);
    expect(assignmentSelectedLabel(a)).toBe('Rajahmundry, Andhra Pradesh · IKF-S6-006');
    expect(assignmentSelectedLabel(a)).not.toContain('\n');
  });

  test('the two options of a pair read differently once chosen', () => {
    const [a, b] = pairToOptions(AMBIGUOUS_PAIRS[9]);
    expect(assignmentSelectedLabel(a)).not.toEqual(assignmentSelectedLabel(b));
  });
});

describe('an assignment with nothing to show', () => {
  test('no project renders a dash, not an empty second line', () => {
    expect(assignmentOptionLines({ city: 'Patna', state: 'Bihar' }).secondary).toBe('—');
  });

  test('no project leaves the closed field as the place alone', () => {
    expect(assignmentSelectedLabel({ city: 'Patna', state: 'Bihar' })).toBe('Patna, Bihar');
  });

  test('a missing assignment is empty, never the string undefined', () => {
    expect(assignmentSelectedLabel(null)).toBe('');
    expect(assignmentOptionLines(null)).toEqual({ primary: '', secondary: '' });
  });
});
