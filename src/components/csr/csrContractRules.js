// src/components/csr/csrContractRules.js
//
// Pure logic for the CSR grant-contract screens. Kept out of the components so
// it can be unit-tested: anything that imports a CSR component transitively
// reaches react-router-dom v7, whose exports map CRA's Jest resolver cannot
// read. Same reason as src/components/bank/tdsDueDate.js.

// 'Not Delivered' is deliberately distinct from 'Pending': pending is work that
// has not happened YET, not-delivered is work that was promised and did not
// happen. Collapsing the two hides a broken promise inside a normal backlog,
// which is exactly what the 26 Aug review objected to (1051s: "If it is not
// delivered, then it will be a particular row"). Matches migration 0011.
export const DELIVERABLE_STATUSES = [
  'Pending', 'In Progress', 'Completed', 'Not Delivered', 'Cancelled',
];

// The two that mean something went wrong. A row in either state is rendered as
// an error rather than as one more status chip — 1067s: "if it is cancelled,
// then it will be an error".
export const FAILED_STATUSES = ['Not Delivered', 'Cancelled'];

export const CONTRACT_PROGRESS_FILTERS = [
  'All',
  'No deliverables',
  'Pending',
  'In Progress',
  'Completed',
];

// One label for a contract's whole deliverable set. "Completed" only when every
// deliverable is done, so a contract can never read as finished while work is
// outstanding.
export const deliverableRollup = (deliverables = []) => {
  const list = Array.isArray(deliverables) ? deliverables : [];
  if (list.length === 0) return 'No deliverables';
  // A failure outranks everything else. Checked FIRST, before the every()
  // clauses, because a contract with one cancelled deliverable and four in
  // flight is not "In Progress" — that label is how a broken promise stayed
  // invisible on the collapsed card while the expanded list showed it in red.
  // 26 Aug review, 1064s: "Where will it be shown?"
  if (list.some((d) => FAILED_STATUSES.includes(d.status))) return 'Attention';
  if (list.every((d) => d.status === 'Completed')) return 'Completed';
  if (list.every((d) => d.status === 'Pending')) return 'Pending';
  return 'In Progress';
};

export const deliverableProgress = (deliverables = []) => {
  const list = Array.isArray(deliverables) ? deliverables : [];
  const total = list.length;
  const completed = list.filter((d) => d.status === 'Completed').length;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
};

export const formatAmount = (value) =>
  value == null || value === '' || Number.isNaN(Number(value))
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN')}`;

export const contractLabel = (contract) =>
  contract?.reference || contract?.title || `Contract #${contract?.id ?? ''}`.trim();

export const filterContracts = (contracts = [], { search = '', progress = 'All' } = {}) => {
  const q = search.trim().toLowerCase();
  return (Array.isArray(contracts) ? contracts : []).filter((c) => {
    if (progress !== 'All' && deliverableRollup(c.deliverables) !== progress) return false;
    if (!q) return true;
    return [c.reference, c.title, c.projectName, c.notes]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
};

// DRF answers a rejected contractDriveLink with 400 and { contractDriveLink:
// ["..."] }. api.js flattens the first entry into error.message and keeps the
// raw body on error.response.data, so the field can be marked on the form
// instead of the reason vanishing into a toast.
export const fieldErrorsFrom = (error, fields = []) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const out = {};
  fields.forEach((f) => {
    const raw = data[f];
    if (Array.isArray(raw) && raw.length) out[f] = String(raw[0]);
    else if (typeof raw === 'string') out[f] = raw;
  });
  return out;
};

export const formatFrozenAt = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// A frozen certificate is a different document from a live one: its figures no
// longer move. The UI has to say which of the two the operator is looking at.
export const certificateFreezeState = (project) => {
  const frozenAt = project?.certificateFrozenAt || null;
  const version = Number(project?.certificateVersion) || 0;
  const frozen = Boolean(frozenAt);
  return {
    frozen,
    version,
    frozenAt,
    frozenAtLabel: formatFrozenAt(frozenAt),
    label: frozen ? `Frozen · v${version}` : 'Live',
    description: frozen
      ? `Figures were locked on ${formatFrozenAt(frozenAt)} and no longer change.`
      : 'Figures update as expenses are tagged and payments complete.',
  };
};
