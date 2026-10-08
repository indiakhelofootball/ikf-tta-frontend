// The funder landing tab is the surface a renewal decision gets made on. It
// used to open with five facts the funder already knew -- funder, sanctioned,
// status, start, end -- and put what was actually delivered two tabs away.
import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  clientAPI: {
    project: jest.fn(),
    activities: jest.fn(),
    reports: jest.fn(),
    reportFile: jest.fn(),
    deliverables: jest.fn(),
    myBranding: jest.fn(),
    certificate: jest.fn(),
  },
}));

jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn() }) }));

// jsPDF is only reached by the certificate download; keep it out of the render.
jest.mock('jspdf', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jspdf-autotable', () => ({ __esModule: true, default: jest.fn() }));

import { clientAPI } from '../../services/api';
import ClientPortalPage from './ClientPortalPage';

const PROJECT = {
  id: 1, name: 'Grassroots 2026', clientName: 'Acme Foundation',
  sanctionedAmount: 921000, status: 'Active',
  startDate: '2026-04-01', endDate: '2027-03-31',
};

// Two deliverables in DIFFERENT units. This is the pair that makes a summed
// total wrong: 26 trials and 120 coaches is not 146 of anything.
const DELIVERABLES = [
  { id: 1, title: 'Trials conducted', targetCount: 40, completedCount: 26, status: 'In Progress' },
  { id: 2, title: 'Coaches trained', targetCount: 120, completedCount: 120, status: 'Completed' },
];

beforeEach(() => {
  // The selected tab lives in the hash, so one test's tab would otherwise be
  // the next test's landing tab.
  window.history.replaceState(null, '', window.location.pathname);
  clientAPI.project.mockResolvedValue([PROJECT]);
  clientAPI.activities.mockResolvedValue([{ id: 1, title: 'Trial at Bhilai', status: 'Completed' }]);
  clientAPI.reports.mockResolvedValue([{ id: 1, fileName: 'q1.pdf' }]);
  clientAPI.deliverables.mockResolvedValue(DELIVERABLES);
  clientAPI.myBranding.mockResolvedValue(null);
  clientAPI.certificate.mockResolvedValue({ available: false, reason: 'open' });
});

test('the landing tab leads with what was delivered, in each deliverable own units', async () => {
  render(<ClientPortalPage />);

  expect(await screen.findByText('Delivered so far')).toBeInTheDocument();
  expect(screen.getByText('Trials conducted')).toBeInTheDocument();
  expect(screen.getByText('Coaches trained')).toBeInTheDocument();
  expect(screen.getByText('of 40')).toBeInTheDocument();
  expect(screen.getByText('of 120')).toBeInTheDocument();
});

test('nothing is summed across units', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');

  // 26 + 120 = 146 completed, of 40 + 120 = 160 promised. Neither figure means
  // anything, and neither may appear.
  expect(screen.queryByText(/146/)).not.toBeInTheDocument();
  expect(screen.queryByText(/\bof 160\b/)).not.toBeInTheDocument();
});

test('the grant facts stay on the landing tab, below the delivery', async () => {
  render(<ClientPortalPage />);

  expect(await screen.findByText('Acme Foundation')).toBeInTheDocument();
  expect(screen.getByText('₹9,21,000')).toBeInTheDocument();
  expect(screen.getByText('Activities recorded')).toBeInTheDocument();
  expect(screen.getByText('Reports available')).toBeInTheDocument();
});

test('no utilisation figure reaches the funder from this page', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');

  // Financials are excluded from the funder payload by isolation policy. The
  // sanctioned amount is the funder's own contribution and is theirs to see;
  // what TTA has spent is not, and no label here may imply it.
  expect(screen.queryByText(/utilised/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/spent/i)).not.toBeInTheDocument();
});

test('with no deliverables loaded the tab still says where the grant stands', async () => {
  clientAPI.deliverables.mockResolvedValue([]);
  render(<ClientPortalPage />);

  expect(
    await screen.findByText(/1 activity has been recorded under this grant/i)
  ).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// The shell. Added when the portal was given a design (26 Aug review, 27:13 —
// "inside, the website isn't coming"): the tab bar stopped being MUI's <Tabs>
// and became plain buttons, and the brand colour started flowing through a CSS
// variable. Both are behaviour, and neither had a test.
// ---------------------------------------------------------------------------

test('the tabs actually switch — the bar is our own markup now, not MUI\'s', async () => {
  render(<ClientPortalPage />);
  await screen.findByText(/Delivered so far/i);

  // landing tab first
  expect(screen.getByRole('tab', { name: /My Project/i })).toHaveAttribute('aria-selected', 'true');

  fireEvent.click(screen.getByRole('tab', { name: /^Activities/i }));
  expect(await screen.findByText(/Trial at Bhilai/i)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /^Activities/i })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: /My Project/i })).toHaveAttribute('aria-selected', 'false');

  fireEvent.click(screen.getByRole('tab', { name: /^Reports/i }));
  expect(await screen.findByText(/q1\.pdf/i)).toBeInTheDocument();
});

test('every tab the funder is offered is reachable', async () => {
  render(<ClientPortalPage />);
  await screen.findByText(/Delivered so far/i);

  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(5);

  // each one selects when clicked — a tab that renders but cannot be chosen is
  // worse than one that is absent
  tabs.forEach((t, i) => {
    fireEvent.click(t);
    expect(screen.getAllByRole('tab')[i]).toHaveAttribute('aria-selected', 'true');
  });
});

// THE WHITE-LABEL RULE. A funder's portal carries the FUNDER's colour. The
// internal CSR system is moss green and must never reach this surface, and one
// funder must never see another's brand. This is the same class of invariant as
// "no utilisation figure reaches the funder" above — policy, not decoration.
// Reading a CSS custom property needs the node — Testing Library has no query
// for "what inline style does the shell carry", and the white-label rule lives
// precisely in that style. Isolated here so the two tests below stay clean.
const brandVar = () => {
  // eslint-disable-next-line testing-library/no-node-access
  const shell = document.querySelector('.cportal');
  expect(shell).not.toBeNull();
  return shell.style.getPropertyValue('--brand');
};

test("the funder's own colour drives the portal", async () => {
  clientAPI.myBranding.mockResolvedValue({
    slug: 'acme', displayName: 'Acme Foundation CSR', primaryColor: '#1B3A6B',
  });
  render(<ClientPortalPage />);
  await screen.findByText(/Delivered so far/i);

  expect(brandVar()).toBe('#1B3A6B');
});

test('a funder with no colour recorded gets the neutral fallback, never a borrowed brand', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme Foundation CSR' });
  render(<ClientPortalPage />);
  await screen.findByText(/Delivered so far/i);

  // nothing inline: the stylesheet's graphite default holds, and in particular
  // no green leaks in from the internal system
  expect(brandVar()).toBe('');
});

// ---------------------------------------------------------------------------
// The 8 Oct pass: failure, identity, dates, reports, tabs.
// ---------------------------------------------------------------------------

const httpError = (status, data) => {
  const err = new Error(`Server error (${status}): check Django logs and REACT_APP_API_URL`);
  err.response = { status, data };
  return err;
};

test('a server failure shows one sentence and a Retry that re-runs the load, never the raw error', async () => {
  clientAPI.activities.mockRejectedValueOnce(httpError(500, {}));
  render(<ClientPortalPage />);

  expect(await screen.findByText(/We couldn.t load your grant just now/)).toBeInTheDocument();
  expect(screen.queryByText(/Django|REACT_APP_API_URL|Server error/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Delivered so far')).toBeInTheDocument();
  expect(clientAPI.project).toHaveBeenCalledTimes(2);
});

test('a funder with no grant linked gets the friendly empty state, not the failure', async () => {
  const noGrant = httpError(403, { code: 'no_project', detail: 'No project linked.' });
  for (const fn of ['project', 'activities', 'reports', 'deliverables']) {
    clientAPI[fn].mockRejectedValue(noGrant);
  }
  render(<ClientPortalPage />);

  expect(await screen.findByText('No grant is linked to your account yet.')).toBeInTheDocument();
  expect(screen.getByText(/Ask your India Khelo Football programme contact to link it/)).toBeInTheDocument();
  expect(screen.queryByText(/couldn.t load/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
});

test('the grant is named as the page heading, inside main, and in the document title', async () => {
  const before = document.title;
  const { unmount } = render(<ClientPortalPage />);

  const h1 = await screen.findByRole('heading', { level: 1, name: 'Grassroots 2026' });
  expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toBe(h1);
  expect(document.title).toBe('Grassroots 2026 · CSR Portal');

  unmount();
  expect(document.title).toBe(before);
});

test('the document title prefers the funder display name', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme Foundation CSR' });
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');
  expect(document.title).toBe('Acme Foundation CSR · CSR Portal');
});

test('the grant period is one human range, not two ISO dates', async () => {
  render(<ClientPortalPage />);
  expect(await screen.findByText('1 Apr 2026 – 31 Mar 2027')).toBeInTheDocument();
  expect(screen.queryByText(/2026-04-01/)).not.toBeInTheDocument();
});

test('delivery above target reads "318 of 300" with a note, and the bar stops at full', async () => {
  clientAPI.deliverables.mockResolvedValue([
    { id: 9, title: 'Players screened', targetCount: 300, completedCount: 318, status: 'In Progress' },
  ]);
  render(<ClientPortalPage />);

  expect(await screen.findByText('318')).toBeInTheDocument();
  expect(screen.getByText('of 300')).toBeInTheDocument();
  expect(screen.getByText('Target exceeded')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: /Players screened/ }))
    .toHaveAttribute('aria-valuenow', '100');
});

test('a closed grant with nothing recorded is written in the past tense, and counts read 0', async () => {
  clientAPI.project.mockResolvedValue([{ ...PROJECT, status: 'Closed' }]);
  clientAPI.activities.mockResolvedValue([]);
  clientAPI.reports.mockResolvedValue([]);
  clientAPI.deliverables.mockResolvedValue([]);
  render(<ClientPortalPage />);

  expect(await screen.findByText('This grant has closed. Nothing was recorded against it.'))
    .toBeInTheDocument();
  expect(screen.queryByText(/appear here as they happen/)).not.toBeInTheDocument();
  // The figure sits beside its label; an em dash here once read as "unknown".
  // eslint-disable-next-line testing-library/no-node-access
  expect(screen.getByText('Activities recorded').previousSibling).toHaveTextContent(/^0$/);
  expect(screen.queryByText('—')).not.toBeInTheDocument();
});

test('reports are listed by title with type and a human date, falling back to the file name', async () => {
  clientAPI.reports.mockResolvedValue([
    {
      id: 1, title: 'Quarter one summary', reportType: 'Quarterly', fileName: 'q1.pdf',
      fileUrl: 'https://files.example/q1.pdf', createdAt: '2026-10-08',
    },
    { id: 2, title: '  ', fileName: 'field-notes.pdf', fileUrl: '', createdAt: '2026-09-01' },
  ]);
  window.history.replaceState(null, '', '#reports');
  render(<ClientPortalPage />);

  const link = await screen.findByRole('link', { name: 'Quarter one summary' });
  expect(link).toHaveAttribute('href', 'https://files.example/q1.pdf');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link.getAttribute('rel')).toMatch(/noopener/);
  expect(screen.getByRole('link', { name: 'Open Quarter one summary' })).toHaveTextContent('Open');
  expect(screen.getByText('Quarterly · 8 Oct 2026')).toBeInTheDocument();
  expect(screen.queryByText('q1.pdf')).not.toBeInTheDocument();

  expect(screen.getByText('field-notes.pdf')).toBeInTheDocument();
  expect(screen.getByText('File not attached yet')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'field-notes.pdf' })).not.toBeInTheDocument();
});

test('an uploaded report opens through the authenticated client endpoint, not a link', async () => {
  clientAPI.reports.mockResolvedValue([
    { id: 7, title: 'Pune trial report', fileName: '', fileUrl: '', hasFile: true, createdAt: '2026-10-08' },
    {
      id: 8, title: 'Drive report', fileName: '', fileUrl: 'https://files.example/d.pdf',
      hasFile: false, createdAt: '2026-10-08',
    },
  ]);
  const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  clientAPI.reportFile.mockResolvedValue({ blob, contentType: 'application/pdf', fileName: 'pune.pdf' });
  const opened = {};
  const openSpy = jest.spyOn(window, 'open').mockReturnValue(opened);
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:pune');
  URL.revokeObjectURL = jest.fn();
  window.history.replaceState(null, '', '#reports');
  try {
    render(<ClientPortalPage />);
    const open = await screen.findByRole('button', { name: 'Open Pune trial report' });
    expect(screen.queryByRole('link', { name: 'Pune trial report' })).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(open); });

    expect(clientAPI.reportFile).toHaveBeenCalledWith(7);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(openSpy).toHaveBeenCalledWith('blob:pune', '_blank');
    expect(opened.opener).toBeNull();

    // A link-only report keeps the plain link and never calls the file endpoint.
    expect(screen.getByRole('link', { name: 'Open Drive report' }))
      .toHaveAttribute('href', 'https://files.example/d.pdf');
    expect(clientAPI.reportFile).toHaveBeenCalledTimes(1);
  } finally {
    openSpy.mockRestore();
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  }
});

test('an uploaded report that fails to load says so on its row', async () => {
  clientAPI.reports.mockResolvedValue([
    { id: 7, title: 'Pune trial report', fileUrl: '', hasFile: true, createdAt: '2026-10-08' },
  ]);
  clientAPI.reportFile.mockRejectedValue(new Error('Not found.'));
  window.history.replaceState(null, '', '#reports');
  render(<ClientPortalPage />);
  const open = await screen.findByRole('button', { name: 'Open Pune trial report' });
  await act(async () => { fireEvent.click(open); });
  expect(screen.getByRole('alert')).toHaveTextContent('The file could not be opened. Please try again.');
});

test('the selected tab is kept in the hash, so a reload lands on it', async () => {
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  expect(await screen.findByText('Trial at Bhilai')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /^Activities/ })).toHaveAttribute('aria-selected', 'true');

  fireEvent.click(screen.getByRole('tab', { name: /^Deliverables/ }));
  expect(window.location.hash).toBe('#deliverables');
});

test('Back and Forward move between tabs through the hash', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');

  act(() => {
    window.history.replaceState(null, '', '#reports');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByRole('tab', { name: /^Reports/ })).toHaveAttribute('aria-selected', 'true');
});

test('the tabs are a real tabs widget: labelled, linked to panels, arrow keys and roving tabindex', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');

  const list = screen.getByRole('tablist', { name: 'Your grant' });
  const tabs = within(list).getAllByRole('tab');
  const panel = screen.getByRole('tabpanel');
  expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
  expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
  expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1, -1]);

  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[1]).toHaveFocus();
  expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1, -1]);

  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[4], { key: 'ArrowRight' });
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
  expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[4], { key: 'Home' });
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
});

test('the certificate shows its facts and line items with human dates and whole rupees', async () => {
  clientAPI.certificate.mockResolvedValue({
    available: true, certificateVersion: 2, frozenAt: '2026-10-08T07:05:25.027649Z',
    utilisationType: 'Final', sanctionedAmount: '921000.00', totalUtilised: '900000.00',
    periodStart: '2026-04-01', periodEnd: '2027-03-31',
    lineItems: [{ note: 'Coaching kits', amount: '1234.50', date: '2026-06-15' }],
  });
  window.history.replaceState(null, '', '#certificate');
  render(<ClientPortalPage />);

  expect(await screen.findByText('Utilisation Certificate')).toBeInTheDocument();
  expect(screen.getByText('Final')).toBeInTheDocument();
  expect(screen.getByText('₹9,21,000')).toBeInTheDocument();
  expect(screen.getByText('₹9,00,000')).toBeInTheDocument();
  expect(screen.getByText('1 Apr 2026 – 31 Mar 2027')).toBeInTheDocument();
  expect(screen.getByText('Coaching kits')).toBeInTheDocument();
  expect(screen.getByText('15 Jun 2026')).toBeInTheDocument();
  expect(screen.getByText('₹1,234.50')).toBeInTheDocument();
  expect(screen.getByText(/figures fixed on \d{1,2} Oct 2026/)).toBeInTheDocument();
  expect(screen.queryByText(/T07:05|\d+\/\d+\/2026/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Download PDF/ })).toBeInTheDocument();
});

test('a certificate failure keeps its own message and leaves the rest of the portal up', async () => {
  clientAPI.certificate.mockRejectedValue(httpError(500, {}));
  window.history.replaceState(null, '', '#certificate');
  render(<ClientPortalPage />);

  expect(await screen.findByText(/The certificate could not be loaded just now/)).toBeInTheDocument();
  expect(screen.queryByText(/couldn.t load your grant/)).not.toBeInTheDocument();
});

test.each(['blue', '#12'])('a brand colour %p that is not #RRGGBB leaves graphite in place', async (bad) => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: bad });
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');
  expect(brandVar()).toBe('');
});

test('a near-white brand is darkened into a visible bar, not painted as given', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: '#F5F5F5 ' });
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');
  expect(brandVar()).toMatch(/^#[0-9A-F]{6}$/i);
  expect(brandVar().toUpperCase()).not.toBe('#F5F5F5');
});

test('a brand legible as a bar but not as text gets its own text colour', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: '#486AFF' });
  render(<ClientPortalPage />);
  await screen.findByText('Delivered so far');
  // eslint-disable-next-line testing-library/no-node-access
  const shell = document.querySelector('.cportal');
  expect(shell.style.getPropertyValue('--brand')).toBe('#486AFF');
  expect(shell.style.getPropertyValue('--brand-text')).not.toBe('');
  expect(shell.style.getPropertyValue('--brand-text').toUpperCase()).not.toBe('#486AFF');
});
