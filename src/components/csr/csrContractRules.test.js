import {
  deliverableRollup,
  deliverableProgress,
  filterContracts,
  fieldErrorsFrom,
  certificateFreezeState,
  contractLabel,
  formatAmount,
} from './csrContractRules';

describe('deliverableRollup', () => {
  test('reports no deliverables for an empty or missing list', () => {
    expect(deliverableRollup([])).toBe('No deliverables');
    expect(deliverableRollup(undefined)).toBe('No deliverables');
  });

  test('is Completed only when every deliverable is done', () => {
    expect(deliverableRollup([{ status: 'Completed' }, { status: 'Completed' }])).toBe('Completed');
    expect(deliverableRollup([{ status: 'Completed' }, { status: 'Pending' }])).toBe('In Progress');
  });

  test('is Pending only when nothing has started', () => {
    expect(deliverableRollup([{ status: 'Pending' }, { status: 'Pending' }])).toBe('Pending');
    expect(deliverableRollup([{ status: 'Pending' }, { status: 'In Progress' }])).toBe('In Progress');
  });
});

describe('deliverableProgress', () => {
  test('counts completed against the total', () => {
    expect(deliverableProgress([
      { status: 'Completed' }, { status: 'Pending' }, { status: 'Completed' }, { status: 'Pending' },
    ])).toEqual({ total: 4, completed: 2, percent: 50 });
  });

  test('does not divide by zero', () => {
    expect(deliverableProgress([])).toEqual({ total: 0, completed: 0, percent: 0 });
  });
});

describe('filterContracts', () => {
  const contracts = [
    { id: 1, reference: 'GC-001', title: 'School kits', deliverables: [{ status: 'Completed' }] },
    { id: 2, reference: 'GC-002', title: 'Coaching camp', deliverables: [{ status: 'Pending' }] },
    { id: 3, reference: 'GC-003', title: 'Equipment', deliverables: [] },
  ];

  test('matches reference and title case-insensitively', () => {
    expect(filterContracts(contracts, { search: 'coaching' }).map((c) => c.id)).toEqual([2]);
    expect(filterContracts(contracts, { search: 'gc-003' }).map((c) => c.id)).toEqual([3]);
  });

  test('filters on the deliverable rollup', () => {
    expect(filterContracts(contracts, { progress: 'Completed' }).map((c) => c.id)).toEqual([1]);
    expect(filterContracts(contracts, { progress: 'No deliverables' }).map((c) => c.id)).toEqual([3]);
  });

  test('returns everything with no filters applied', () => {
    expect(filterContracts(contracts)).toHaveLength(3);
  });
});

describe('fieldErrorsFrom', () => {
  test('pulls a rejected link out of a DRF 400 body', () => {
    const err = new Error('contractDriveLink: Enter a valid http or https URL.');
    err.response = { status: 400, data: { contractDriveLink: ['Enter a valid http or https URL.'] } };
    expect(fieldErrorsFrom(err, ['contractDriveLink', 'amount'])).toEqual({
      contractDriveLink: 'Enter a valid http or https URL.',
    });
  });

  test('is empty when the error carries no field detail', () => {
    expect(fieldErrorsFrom(new Error('Network down'), ['contractDriveLink'])).toEqual({});
    expect(fieldErrorsFrom(null, ['contractDriveLink'])).toEqual({});
  });
});

describe('certificateFreezeState', () => {
  test('reads as Live while nothing is frozen', () => {
    const s = certificateFreezeState({ certificateFrozenAt: null, certificateVersion: 0 });
    expect(s.frozen).toBe(false);
    expect(s.label).toBe('Live');
  });

  test('reports the version once frozen', () => {
    const s = certificateFreezeState({
      certificateFrozenAt: '2026-08-01T10:00:00Z',
      certificateVersion: 2,
    });
    expect(s.frozen).toBe(true);
    expect(s.label).toBe('Frozen · v2');
    expect(s.frozenAtLabel).not.toBe('');
  });

  test('tolerates a missing project', () => {
    expect(certificateFreezeState(undefined).frozen).toBe(false);
  });
});

describe('labels', () => {
  test('falls back from reference to title to id', () => {
    expect(contractLabel({ reference: 'GC-1', title: 'X', id: 9 })).toBe('GC-1');
    expect(contractLabel({ title: 'X', id: 9 })).toBe('X');
    expect(contractLabel({ id: 9 })).toBe('Contract #9');
  });

  test('renders an em dash rather than a bogus zero', () => {
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount('')).toBe('—');
    expect(formatAmount(0)).toBe('₹0');
  });
});
