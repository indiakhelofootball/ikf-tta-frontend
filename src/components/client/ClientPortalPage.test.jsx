// The funder landing tab is the surface a renewal decision gets made on. It
// used to open with five facts the funder already knew -- funder, sanctioned,
// status, start, end -- and put what was actually delivered two tabs away.
import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
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
    activityPhoto: jest.fn(),
    athletes: jest.fn(),
  },
}));

const mockLogout = jest.fn();
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ logout: mockLogout }) }));

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
  clientAPI.athletes.mockResolvedValue([]);
});

test('the landing tab leads with what was delivered, in each deliverable own units', async () => {
  render(<ClientPortalPage />);

  expect(await screen.findByText('What has been delivered')).toBeInTheDocument();
  // Redesigned 27 Oct (owner: the section 'needs to be well made'): the title
  // and its target now sit on separate lines of one tile.
  expect(screen.getByText('Trials conducted')).toBeInTheDocument();
  expect(screen.getByText('Target 40')).toBeInTheDocument();
  expect(screen.getByText('Coaches trained')).toBeInTheDocument();
  expect(screen.getByText('Target 120')).toBeInTheDocument();
  expect(screen.getByText('65% of target')).toBeInTheDocument();
  expect(screen.getByText('Target met')).toBeInTheDocument();
});

test('nothing is summed across units', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  // 26 + 120 = 146 completed, of 40 + 120 = 160 promised. Neither figure means
  // anything, and neither may appear.
  expect(screen.queryByText(/146/)).not.toBeInTheDocument();
  expect(screen.queryByText(/\bof 160\b/)).not.toBeInTheDocument();
});

test('the grant facts stay on the landing tab, below the delivery', async () => {
  render(<ClientPortalPage />);

  expect((await screen.findAllByText('Acme Foundation')).length).toBeGreaterThan(1);
  expect(screen.getAllByText('\u20B99,21,000').length).toBeGreaterThan(0);
  expect(screen.getByText('Prepared for Acme Foundation')).toBeInTheDocument();
  expect(screen.getAllByText('Delivered by India Khelo Football').length).toBeGreaterThan(0);
});

test('no utilisation figure reaches the funder from this page', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

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
    await screen.findByText(/1 activity has taken place so far/i)
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
  await screen.findByText(/What has been delivered/i);

  // landing tab first
  expect(screen.getByRole('tab', { name: /Overview/i })).toHaveAttribute('aria-selected', 'true');

  fireEvent.click(screen.getByRole('tab', { name: /^Activities/i }));
  expect(await screen.findByText(/Trial at Bhilai/i)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /^Activities/i })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: /Overview/i })).toHaveAttribute('aria-selected', 'false');

  fireEvent.click(screen.getByRole('tab', { name: /^Reports/i }));
  expect(await screen.findByText(/q1\.pdf/i)).toBeInTheDocument();
});

test('every tab the funder is offered is reachable', async () => {
  render(<ClientPortalPage />);
  await screen.findByText(/What has been delivered/i);

  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(6);

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
  await screen.findByText(/What has been delivered/i);

  expect(brandVar()).toBe('#1B3A6B');
});

test('a funder with no colour recorded gets the neutral fallback, never a borrowed brand', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme Foundation CSR' });
  render(<ClientPortalPage />);
  await screen.findByText(/What has been delivered/i);

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
  expect(await screen.findByText('What has been delivered')).toBeInTheDocument();
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
  await screen.findByText('What has been delivered');
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
  expect(screen.getByText('Players screened')).toBeInTheDocument();
  expect(screen.getByText('Target 300')).toBeInTheDocument();
  expect(screen.getByText('Target exceeded')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: /Players screened/ }))
    .toHaveAttribute('aria-valuenow', '100');
});

test('a closed grant with nothing recorded is written in the past tense', async () => {
  clientAPI.project.mockResolvedValue([{ ...PROJECT, status: 'Closed' }]);
  clientAPI.activities.mockResolvedValue([]);
  clientAPI.reports.mockResolvedValue([]);
  clientAPI.deliverables.mockResolvedValue([]);
  render(<ClientPortalPage />);

  expect(await screen.findByText('This grant has closed. Nothing was recorded against it.'))
    .toBeInTheDocument();
  expect(screen.queryByText(/appear here as they happen/)).not.toBeInTheDocument();
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
  await screen.findByText('What has been delivered');

  act(() => {
    window.history.replaceState(null, '', '#reports');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByRole('tab', { name: /^Reports/ })).toHaveAttribute('aria-selected', 'true');
});

test('the tabs are a real tabs widget: labelled, linked to panels, arrow keys and roving tabindex', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  const list = screen.getByRole('tablist', { name: 'Your grant' });
  const tabs = within(list).getAllByRole('tab');
  const panel = screen.getByRole('tabpanel');
  expect(panel).toHaveAttribute('aria-labelledby', tabs[0].id);
  expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
  expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);

  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[1]).toHaveFocus();
  expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1]);

  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[5], { key: 'ArrowRight' });
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
  expect(tabs[5]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(tabs[5], { key: 'Home' });
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

test('Try again re-fetches only the certificate and shows it once it loads', async () => {
  clientAPI.certificate.mockRejectedValueOnce(httpError(500, {}));
  clientAPI.certificate.mockResolvedValueOnce({
    available: true, certificateVersion: 1, frozenAt: '2026-10-08T07:05:25Z',
    periodStart: '2026-04-01', periodEnd: '2027-03-31', lineItems: [],
  });
  window.history.replaceState(null, '', '#certificate');
  render(<ClientPortalPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('Utilisation Certificate')).toBeInTheDocument();
  expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument();
  expect(clientAPI.certificate).toHaveBeenCalledTimes(2);
  expect(clientAPI.project).toHaveBeenCalledTimes(1);
});

test.each(['blue', '#12'])('a brand colour %p that is not #RRGGBB leaves graphite in place', async (bad) => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: bad });
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(brandVar()).toBe('');
});

test('a near-white brand is darkened into a visible bar, not painted as given', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: '#F5F5F5 ' });
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(brandVar()).toMatch(/^#[0-9A-F]{6}$/i);
  expect(brandVar().toUpperCase()).not.toBe('#F5F5F5');
});

test('a brand legible as a bar but not as text gets its own text colour', async () => {
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme', primaryColor: '#486AFF' });
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  // eslint-disable-next-line testing-library/no-node-access
  const shell = document.querySelector('.cportal');
  expect(shell.style.getPropertyValue('--brand')).toBe('#486AFF');
  expect(shell.style.getPropertyValue('--brand-text')).not.toBe('');
  expect(shell.style.getPropertyValue('--brand-text').toUpperCase()).not.toBe('#486AFF');
});

// ---------------------------------------------------------------------------
// The Overview as a programme report (9 Oct redesign: B + D + E).
// ---------------------------------------------------------------------------

const FIELD = [
  { id: 1, title: 'District trial, Sector 56', activityType: 'Trial', location: 'Gurugram', startDate: '2026-09-14', status: 'Completed' },
  { id: 2, title: 'Coach certification', activityType: 'Training Programme', location: 'Faridabad', startDate: '2026-09-28', status: 'Completed' },
  { id: 3, title: 'Second trial', activityType: 'Trial', location: ' gurugram ', startDate: '2026-10-04', status: 'Completed' },
  { id: 4, title: 'Camp visit', activityType: 'Workshop', location: 'Sonipat', startDate: '2026-04-21', status: 'Completed' },
];

test('where and when lists each place once, most visited first, with its latest date', async () => {
  clientAPI.activities.mockResolvedValue(FIELD);
  render(<ClientPortalPage />);

  const places = within(await screen.findByRole('list', { name: 'Places reached' })).getAllByRole('listitem');
  expect(places.map((li) => li.textContent)).toEqual([
    expect.stringMatching(/^Gurugram22 activities · latest 4 Oct 2026$/),
    expect.stringMatching(/^Faridabad1/),
    expect.stringMatching(/^Sonipat1/),
  ]);
  expect(screen.getByRole('list', { name: 'Activities by month' })).toBeInTheDocument();
});

test('from the field shows the three latest activities and links to the rest', async () => {
  clientAPI.activities.mockResolvedValue(FIELD);
  render(<ClientPortalPage />);
  await screen.findByText('From the field');

  expect(screen.getByText('Second trial')).toBeInTheDocument();
  expect(screen.queryByText('Camp visit')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All activities (4 delivered · 0 upcoming)' }));
  expect(screen.getByRole('tab', { name: /^Activities/ })).toHaveAttribute('aria-selected', 'true');
  expect(await screen.findByText('Camp visit')).toBeInTheDocument();
});

test('the funder never reads our internal process wording', async () => {
  clientAPI.deliverables.mockResolvedValue([]);
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(screen.queryByText(/grant agreement is loaded/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /^Deliverables/ }));
  expect(await screen.findByText(/will be tracked here/)).toBeInTheDocument();
  expect(screen.queryByText(/grant agreement is loaded/i)).not.toBeInTheDocument();
});

test('with no dated or placed activities the where-and-when section is left out, not shown empty', async () => {
  clientAPI.project.mockResolvedValue([{ ...PROJECT, startDate: null, endDate: null }]);
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(screen.queryByText('Where and when')).not.toBeInTheDocument();
});

test('the latest activity photo leads the Overview, and recent activities become photo tiles', async () => {
  URL.createObjectURL = jest.fn(() => 'blob:photo');
  URL.revokeObjectURL = jest.fn();
  clientAPI.activityPhoto.mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  clientAPI.activities.mockResolvedValue([
    { ...FIELD[0], photos: [{ id: 7, version: 'a1' }] },
    { ...FIELD[2], photos: [] },
    FIELD[1],
  ]);
  render(<ClientPortalPage />);

  const hero = await screen.findByRole('figure');
  expect(within(hero).getByRole('img')).toHaveAttribute('alt', 'District trial, Sector 56');
  expect(hero).toHaveTextContent('Latest: District trial, Sector 56 · Gurugram · 14 Sep 2026');
  expect(clientAPI.activityPhoto).toHaveBeenCalledWith(1, 7, 'a1');
  // Grouped by month and activity since 27 Oct: the photo sits under its own
  // activity, numbered; Second trial has no photo and gets no broken image.
  expect(await screen.findByRole('img', { name: 'District trial, Sector 56, 1 of 1' })).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Second trial' })).not.toBeInTheDocument();
});

test('a photo that fails to load is left out rather than shown broken', async () => {
  clientAPI.activityPhoto.mockRejectedValue(new Error('404'));
  clientAPI.activities.mockResolvedValue([{ ...FIELD[0], photos: [{ id: 7, version: 'a1' }] }]);
  render(<ClientPortalPage />);
  await screen.findByText('From the field');
  await waitFor(() => expect(clientAPI.activityPhoto).toHaveBeenCalled());
  expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// Owner decision D-016: the funder sees Planned and Completed activities, each
// labelled. Only Completed ones are delivered work: the Overview and its photos
// are built from those alone.
// ---------------------------------------------------------------------------

const PLANNED = {
  id: 5, title: 'Coaching clinic', activityType: 'Workshop', location: 'Rohtak',
  startDate: '2026-10-10', status: 'Planned', photos: [{ id: 9, version: 'p1' }],
};

test('a Planned activity is listed on the Activities tab, labelled Planned', async () => {
  clientAPI.activities.mockResolvedValue([...FIELD, PLANNED]);
  render(<ClientPortalPage />);
  fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));

  const rows = [
    ...within(await screen.findByRole('region', { name: 'Upcoming' })).getAllByRole('listitem'),
    ...within(screen.getByRole('region', { name: 'Delivered' })).getAllByRole('listitem'),
  ];
  const row = rows.find((li) => within(li).queryByText('Coaching clinic'));
  expect(within(row).getByText('Planned')).toBeInTheDocument();
  expect(within(row).queryByText('Completed')).not.toBeInTheDocument();
  const done = rows.find((li) => within(li).queryByText('Camp visit'));
  expect(within(done).getByText('Completed')).toBeInTheDocument();
});

test('the Overview counts, tiles, months and places leave a Planned activity out', async () => {
  clientAPI.deliverables.mockResolvedValue([]);
  clientAPI.activities.mockResolvedValue([...FIELD, PLANNED]);
  render(<ClientPortalPage />);
  await screen.findByText('From the field');

  expect(screen.getByText(/^4 activities have taken place so far\./)).toBeInTheDocument();
  expect(screen.queryByText('Coaching clinic')).not.toBeInTheDocument();
  const places = within(screen.getByRole('list', { name: 'Places reached' })).getAllByRole('listitem');
  expect(places.map((li) => li.textContent).some((t) => t.startsWith('Rohtak'))).toBe(false);
  const months = within(screen.getByRole('list', { name: 'Activities by month' })).getAllByRole('listitem');
  expect(months.find((li) => li.textContent.startsWith('Oct 2026'))).toHaveTextContent('1 held');
  // The link still names everything the Activities tab lists, in the one count.
  expect(screen.getByRole('button', { name: 'All activities (4 delivered · 1 upcoming)' })).toBeInTheDocument();
});

test('no photo is requested for a Planned activity', async () => {
  URL.createObjectURL = jest.fn(() => 'blob:photo');
  URL.revokeObjectURL = jest.fn();
  clientAPI.activityPhoto.mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  clientAPI.activities.mockResolvedValue([
    { ...FIELD[0], photos: [{ id: 7, version: 'a1' }] },
    PLANNED,
  ]);
  render(<ClientPortalPage />);

  const hero = await screen.findByRole('figure');
  expect(hero).toHaveTextContent('Latest: District trial, Sector 56');
  expect(clientAPI.activityPhoto).toHaveBeenCalledWith(1, 7, 'a1');
  expect(clientAPI.activityPhoto).not.toHaveBeenCalledWith(5, expect.anything(), expect.anything());
  expect(clientAPI.activityPhoto).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------------------
// D-018: the Activities tab split into Upcoming and Delivered, one count
// everywhere, a silent re-check on return to the tab, and "Updated <time>".
// ---------------------------------------------------------------------------

const PLANNED_2 = {
  id: 6, title: 'Girls camp', activityType: 'Camp', location: 'Panipat',
  startDate: '2026-11-02', status: 'Planned',
};

test('the Activities tab lists Upcoming (Planned) first, then Delivered (Completed)', async () => {
  clientAPI.activities.mockResolvedValue([FIELD[0], PLANNED, FIELD[1], PLANNED_2]);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  const up = await screen.findByRole('region', { name: 'Upcoming' });
  const done = screen.getByRole('region', { name: 'Delivered' });
  expect(within(up).getByRole('heading', { level: 2, name: 'Upcoming' })).toBeInTheDocument();
  expect(within(done).getByRole('heading', { level: 2, name: 'Delivered' })).toBeInTheDocument();
  const upRows = within(up).getAllByRole('listitem');
  expect(upRows).toHaveLength(2);
  expect(within(upRows[0]).getByText('Coaching clinic')).toBeInTheDocument();
  expect(within(upRows[1]).getByText('Girls camp')).toBeInTheDocument();
  expect(within(done).getAllByRole('listitem')).toHaveLength(2);
  expect(within(done).getByText('District trial, Sector 56')).toBeInTheDocument();
  expect(within(done).getByText('Coach certification')).toBeInTheDocument();
  // Upcoming comes first on the page.
  const sections = screen.getAllByRole('region');
  expect(sections.indexOf(up)).toBeLessThan(sections.indexOf(done));
});

test('with only delivered activities there is no empty Upcoming section', async () => {
  clientAPI.activities.mockResolvedValue(FIELD);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  expect(await screen.findByRole('region', { name: 'Delivered' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Upcoming' })).not.toBeInTheDocument();
  expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
});

test('with only upcoming activities there is no empty Delivered section', async () => {
  clientAPI.activities.mockResolvedValue([PLANNED]);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  expect(await screen.findByRole('region', { name: 'Upcoming' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Delivered' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Nothing published yet/)).not.toBeInTheDocument();
});

test('the Activities tab label carries the same count as the Overview link', async () => {
  clientAPI.activities.mockResolvedValue([...FIELD, PLANNED]);
  render(<ClientPortalPage />);
  await screen.findByText('From the field');

  expect(screen.getByRole('tab', { name: 'Activities (4 delivered · 1 upcoming)' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Activities (5)' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'All activities (4 delivered · 1 upcoming)' })).toBeInTheDocument();
});

test('a single delivered activity is counted, with nothing upcoming', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(screen.getByRole('tab', { name: 'Activities (1 delivered · 0 upcoming)' })).toBeInTheDocument();
});

test('the empty Activities tab no longer says activities are never scheduled in advance', async () => {
  clientAPI.activities.mockResolvedValue([]);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  expect(await screen.findByText(
    'Nothing published yet. Trials, workshops and training sessions under this grant appear here, both those coming up and those delivered.',
  )).toBeInTheDocument();
  expect(screen.queryByText(/not scheduled in advance/)).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Activities (0 delivered · 0 upcoming)' })).toBeInTheDocument();
});

test('the header says when the page was last updated, not today\'s date', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  expect(screen.getByText(/^Programme report for Acme Foundation · Updated \d{1,2}:\d{2} (am|pm)$/))
    .toBeInTheDocument();
  expect(screen.queryByText(/as of/)).not.toBeInTheDocument();
});

// The hook keeps 30 seconds between checks, timed from mount; step the clock
// past that and return to the tab.
const returnToTab = (afterMs) => {
  const real = Date.now();
  const spy = jest.spyOn(Date, 'now').mockReturnValue(real + afterMs);
  act(() => { window.dispatchEvent(new Event('focus')); });
  spy.mockRestore();
};

test('returning to the tab re-checks quietly: no spinner, the page stays up, then the new data shows', async () => {
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);
  expect(await screen.findByText('Trial at Bhilai')).toBeInTheDocument();
  expect(clientAPI.activities).toHaveBeenCalledTimes(1);

  let release;
  clientAPI.activities.mockReturnValueOnce(new Promise((r) => { release = r; }));
  returnToTab(31 * 1000);

  expect(clientAPI.activities).toHaveBeenCalledTimes(2);
  // While the check runs the page keeps what it had, and shows no spinner.
  expect(screen.getByText('Trial at Bhilai')).toBeInTheDocument();
  // eslint-disable-next-line testing-library/no-node-access
  expect(document.querySelector('.cloading')).toBeNull();

  await act(async () => {
    release([
      { id: 1, title: 'Trial at Bhilai', status: 'Completed' },
      { id: 2, title: 'Trial at Durg', status: 'Planned' },
    ]);
  });
  expect(await screen.findByText('Trial at Durg')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Activities (1 delivered · 1 upcoming)' })).toBeInTheDocument();
});

test('a quiet re-check that fails leaves the page exactly as it was', async () => {
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);
  expect(await screen.findByText('Trial at Bhilai')).toBeInTheDocument();
  const updated = screen.getByText(/· Updated /).textContent;

  clientAPI.activities.mockRejectedValueOnce(httpError(500, {}));
  clientAPI.certificate.mockRejectedValueOnce(httpError(500, {}));
  returnToTab(31 * 1000);
  await waitFor(() => expect(clientAPI.activities).toHaveBeenCalledTimes(2));
  await act(async () => {});

  expect(screen.getByText('Trial at Bhilai')).toBeInTheDocument();
  expect(screen.queryByText(/couldn.t load your grant/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  expect(screen.getByText(/· Updated /).textContent).toBe(updated);
});

test('returning to the tab within 30 seconds does not re-check', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  returnToTab(10 * 1000);
  expect(clientAPI.project).toHaveBeenCalledTimes(1);
  expect(clientAPI.activities).toHaveBeenCalledTimes(1);
});

test('the funder keeps their own account controls and sees no preview banner', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  expect(screen.getAllByText('Change password').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sign out').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
  expect(screen.queryByText(/^Preview/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
});

// D-018 owner answer: with the grant's switch on, the funder also receives
// Cancelled and date-passed Planned activities; each gets its own section.
const OVERDUE = {
  id: 8, title: 'Village clinic', activityType: 'Clinic', location: 'Sonipat',
  startDate: '2026-09-01', status: 'Planned', datePassed: true,
};
const CANCELLED = {
  id: 9, title: 'Rained-off trial', activityType: 'Trial', location: 'Karnal',
  startDate: '2026-09-05', status: 'Cancelled', datePassed: false,
};

test('overdue Planned and Cancelled get their own sections, not Upcoming or Delivered', async () => {
  clientAPI.activities.mockResolvedValue([FIELD[0], PLANNED, OVERDUE, CANCELLED]);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  const up = await screen.findByRole('region', { name: 'Upcoming' });
  const awaiting = screen.getByRole('region', { name: 'Awaiting update' });
  const done = screen.getByRole('region', { name: 'Delivered' });
  const cancelled = screen.getByRole('region', { name: 'Cancelled' });
  expect(within(up).queryByText('Village clinic')).not.toBeInTheDocument();
  expect(within(awaiting).getByText('Village clinic')).toBeInTheDocument();
  expect(within(awaiting).getByText('Planned')).toBeInTheDocument();
  expect(within(cancelled).getByText('Rained-off trial')).toBeInTheDocument();
  expect(within(done).queryByText('Rained-off trial')).not.toBeInTheDocument();
  const sections = screen.getAllByRole('region');
  expect(sections.map((s) => s.getAttribute('aria-labelledby'))).toEqual([
    'cp-acts-upcoming', 'cp-acts-awaiting', 'cp-acts-delivered', 'cp-acts-cancelled',
  ]);
  expect(screen.getByRole('tab', { name: /Activities/ }))
    .toHaveTextContent('1 delivered · 1 upcoming · 1 awaiting update · 1 cancelled');
});

test('without the switch (no such activities) neither extra section appears', async () => {
  clientAPI.activities.mockResolvedValue([FIELD[0], PLANNED]);
  window.history.replaceState(null, '', '#activities');
  render(<ClientPortalPage />);

  await screen.findByRole('region', { name: 'Upcoming' });
  expect(screen.queryByRole('region', { name: 'Awaiting update' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Cancelled' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Activities/ })).toHaveTextContent('1 delivered · 1 upcoming');
});

test('D-019: the funder sees the cities their grant funds, and each activity city', async () => {
  clientAPI.project.mockResolvedValue([{
    ...PROJECT, cities: [{ name: 'Pune', state: 'MH' }, { name: 'Wardha', state: 'MH' }],
  }]);
  clientAPI.activities.mockResolvedValue([
    { id: 1, title: 'Trial at Pune', status: 'Completed', city: 'Pune', location: 'Balewadi Ground', startDate: '2026-05-02' },
  ]);
  render(<ClientPortalPage />);
  expect((await screen.findAllByText('Pune, Wardha')).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Pune, Balewadi Ground/).length).toBeGreaterThan(0);
});

test('D-019: a grant with no cities shows no Cities line', async () => {
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');
  expect(screen.queryByText('Cities')).not.toBeInTheDocument();
});

test('the Overview summary cards leave out Target Cities when the grant has none', async () => {
  clientAPI.athletes.mockResolvedValue([
    { id: 1, fullName: 'Aarav Patel', position: 'Forward', category: 'U17', status: 'Shortlisted' },
  ]);
  render(<ClientPortalPage />);
  expect(await screen.findByText('Total Grant Amount')).toBeInTheDocument();
  expect(screen.getByText('Athletes Scouted')).toBeInTheDocument();
  // 27 Oct: an empty "0 / No cities assigned" card was clutter, not a fact.
  expect(screen.queryByText('Target Cities')).not.toBeInTheDocument();
  expect(screen.getByText('Audit & Certification')).toBeInTheDocument();
});

test('a grant with cities shows the Target Cities card', async () => {
  clientAPI.project.mockResolvedValue([{ ...PROJECT, cities: [{ id: 1, name: 'Pune' }] }]);
  render(<ClientPortalPage />);
  expect(await screen.findByText('Target Cities')).toBeInTheDocument();
});

test('the programme description sits in Programme details, not at the top of the Overview', async () => {
  clientAPI.project.mockResolvedValue([{ ...PROJECT, description: 'What this grant does.' }]);
  render(<ClientPortalPage />);
  const details = await screen.findByRole('region', { name: 'Programme details' });
  expect(within(details).getByText('What this grant does.')).toBeInTheDocument();
});

test('the Athletes tab shows scouted beneficiaries and search works', async () => {
  clientAPI.athletes.mockResolvedValue([
    { id: 101, fullName: 'Rohan Sharma', position: 'Midfielder', category: 'U17', status: 'Scholarship Awarded' },
    { id: 102, fullName: 'Simran Kaur', position: 'Defender', category: 'U19', status: 'Shortlisted' },
  ]);
  render(<ClientPortalPage />);
  await screen.findByText(/What has been delivered/i);

  fireEvent.click(screen.getByRole('tab', { name: /^Athletes/i }));
  expect(await screen.findByText('Rohan Sharma')).toBeInTheDocument();
  expect(screen.getByText('Simran Kaur')).toBeInTheDocument();
  expect(screen.getByText('Midfielder')).toBeInTheDocument();
  expect(screen.getByText('U19')).toBeInTheDocument();
  expect(screen.getByText('Scholarship Awarded')).toBeInTheDocument();
  expect(screen.getByText('Shortlisted')).toBeInTheDocument();

  // Test search
  const searchInput = screen.getByPlaceholderText(/Search by name/i);
  fireEvent.change(searchInput, { target: { value: 'Rohan' } });
  expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
  expect(screen.queryByText('Simran Kaur')).not.toBeInTheDocument();
});

test('switching Financial Year loads that year projects and updates state', async () => {
  const P2026 = { id: 1, name: 'Project 2026', clientName: 'Acme', sanctionedAmount: 1000000, startDate: '2026-09-01', financialYear: '2026-27' };
  const P2025 = { id: 2, name: 'Project 2025', clientName: 'Acme', sanctionedAmount: 800000, startDate: '2025-09-01', financialYear: '2025-26' };
  clientAPI.project.mockResolvedValue([P2026, P2025]);

  render(<ClientPortalPage />);
  expect(await screen.findByRole('heading', { level: 1, name: 'Project 2026' })).toBeInTheDocument();

  // Switch to FY 2025-26
  const fy2025Btn = screen.getByRole('button', { name: /2025-26/i });
  expect(fy2025Btn).toBeInTheDocument();
  fireEvent.click(fy2025Btn);

  expect(clientAPI.project).toHaveBeenCalledWith(2);
});

test('D-026: the funder sees an athlete name, position, category and status, nothing more', async () => {
  // Even if the server ever sends more, the table has no place to put it.
  clientAPI.athletes.mockResolvedValue([
    {
      id: 101, fullName: 'Rohan Sharma', position: 'Midfielder', category: 'U17', status: 'Shortlisted',
      dob: '2009-05-04', age: 17, jerseyNumber: 10, gender: 'Male', city: 'Zirakpur', cityName: 'Zirakpur',
      notes: 'Weak left foot', photo: 'x.jpg',
    },
  ]);
  render(<ClientPortalPage />);
  await screen.findByText(/What has been delivered/i);
  fireEvent.click(screen.getByRole('tab', { name: /^Athletes/i }));

  const table = await screen.findByRole('table');
  expect(within(table).getAllByRole('columnheader').map((h) => h.textContent))
    .toEqual(['Athlete Name', 'Position', 'Category', 'Status']);
  const row = within(table).getAllByRole('row')[1];
  expect(within(row).getAllByRole('cell').map((c) => c.textContent))
    .toEqual(['Rohan Sharma', 'Midfielder', 'U17', 'Shortlisted']);
  expect(screen.queryByText(/2009/)).not.toBeInTheDocument();
  expect(screen.queryByText('#10')).not.toBeInTheDocument();
  expect(screen.queryByText('Male')).not.toBeInTheDocument();
  expect(screen.queryByText('Zirakpur')).not.toBeInTheDocument();
  expect(screen.queryByText('Weak left foot')).not.toBeInTheDocument();
});

test('an athlete with no category shows a dash, not a band worked out from a birth date', async () => {
  clientAPI.athletes.mockResolvedValue([
    { id: 1, fullName: 'Aarav Patel', position: 'Forward', category: '', status: 'Participated', dob: '2010-01-01', age: 16 },
  ]);
  render(<ClientPortalPage />);
  await screen.findByText(/What has been delivered/i);
  fireEvent.click(screen.getByRole('tab', { name: /^Athletes/i }));

  const row = within(await screen.findByRole('table')).getAllByRole('row')[1];
  expect(within(row).getAllByRole('cell')[2]).toHaveTextContent(/^—$/);
});

test('signing out keeps the funder door and leaves the page where it is, never /csr/login', async () => {
  mockLogout.mockClear();
  localStorage.removeItem('tta_client_slug');
  clientAPI.myBranding.mockResolvedValue({ slug: 'acme', displayName: 'Acme Foundation CSR' });
  // jsdom cannot navigate; a page assigning location.href to another path logs
  // "Not implemented: navigation" instead. Either way the page must not try.
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  const before = window.location.pathname;
  render(<ClientPortalPage />);
  await screen.findByText('Acme Foundation CSR');

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('tta_client_slug')).toBe('acme');
  expect(window.location.pathname).toBe(before);
  const navigated = errors.mock.calls.some((args) => args.some((a) => /navigation/i.test(String(a?.message || a))));
  expect(navigated).toBe(false);
  errors.mockRestore();
  localStorage.removeItem('tta_client_slug');
});

test('signing out with no remembered door still does not send a funder to /csr/login', async () => {
  mockLogout.mockClear();
  localStorage.removeItem('tta_client_slug');
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  const before = window.location.pathname;
  render(<ClientPortalPage />);
  await screen.findByText('What has been delivered');

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('tta_client_slug')).toBeNull();
  expect(window.location.pathname).toBe(before);
  const navigated = errors.mock.calls.some((args) => args.some((a) => /navigation/i.test(String(a?.message || a))));
  expect(navigated).toBe(false);
  errors.mockRestore();
});

test('returning to the tab refreshes the chosen grant itself and keeps the chosen year', async () => {
  const P2026 = { id: 1, name: 'Project 2026', clientName: 'Acme', startDate: '2026-09-01', financialYear: '2026-27' };
  const P2025 = { id: 2, name: 'Project 2025', clientName: 'Acme', startDate: '2025-09-01', financialYear: '2025-26' };
  clientAPI.project.mockResolvedValue([P2026, P2025]);
  render(<ClientPortalPage />);
  await screen.findByRole('heading', { level: 1, name: 'Project 2026' });
  fireEvent.click(screen.getByRole('button', { name: /2025-26/i }));
  await screen.findByRole('heading', { level: 1, name: 'Project 2025' });

  clientAPI.project.mockResolvedValue([P2026, { ...P2025, name: 'Project 2025 (closed)' }]);
  returnToTab(31 * 1000);

  expect(await screen.findByRole('heading', { level: 1, name: 'Project 2025 (closed)' })).toBeInTheDocument();
  expect(clientAPI.project).toHaveBeenLastCalledWith(2);
});

// D-027: Vardhman's login belongs to the new grant, which has nothing delivered
// yet; landing on it looked like the portal had no data at all.
const OWN_EMPTY = { id: 8, name: 'Football for All', clientName: 'Vardhman Steel', status: 'Active', startDate: '2026-09-01', financialYear: 'FY 2026-27' };
const PILOT = { id: 10, name: 'Ludhiana Pilot', clientName: 'Vardhman Steel', status: 'Closed', startDate: '2025-12-02', financialYear: 'FY 2025-26' };
const byYear = (forOwn, forPilot) => (pid) => Promise.resolve(pid === PILOT.id ? forPilot : forOwn);

test('a grant with nothing delivered yet opens on the latest earlier year', async () => {
  clientAPI.project.mockResolvedValue([OWN_EMPTY, PILOT]);
  clientAPI.activities.mockImplementation(byYear([], [{ id: 5, title: 'Trials Day 1', status: 'Completed' }]));
  clientAPI.deliverables.mockImplementation(byYear([], []));
  clientAPI.athletes.mockImplementation(byYear([], [{ id: 1, fullName: 'Rajvir Singh', category: 'U17', position: 'Center Back', status: 'Shortlisted' }]));
  clientAPI.reports.mockImplementation(byYear([{ id: 4, title: 'client_status' }], []));
  render(<ClientPortalPage />);
  expect(await screen.findByRole('heading', { name: 'Ludhiana Pilot' })).toBeInTheDocument();
  expect(clientAPI.athletes).toHaveBeenCalledWith(PILOT.id);
  expect(screen.getByRole('button', { name: 'FY 2026-27' })).toBeInTheDocument();
});

test('a grant with something delivered stays on its own year', async () => {
  clientAPI.project.mockResolvedValue([OWN_EMPTY, PILOT]);
  clientAPI.activities.mockImplementation(byYear([{ id: 7, title: 'Workshop', status: 'Completed' }], []));
  render(<ClientPortalPage />);
  expect(await screen.findByRole('heading', { name: 'Football for All' })).toBeInTheDocument();
  await act(async () => {});
  expect(clientAPI.athletes).not.toHaveBeenCalledWith(PILOT.id);
});

// A target the documents set but nobody has reported a figure for. Drawn as 0 it
// told the funder "Not started"; all anyone knows is that no figure was entered.
test('a target with no result recorded says so, never 0 or Not started', async () => {
  clientAPI.deliverables.mockResolvedValue([
    { id: 9, title: 'Vardhman Steel placements (target 2-4 hires)', targetCount: null, completedCount: null, status: 'Pending' },
    { id: 10, title: 'Formal club trials secured', targetCount: 5, completedCount: null, status: 'Pending' },
  ]);
  render(<ClientPortalPage />);
  expect((await screen.findAllByText('No result recorded yet')).length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('Not started')).toBeNull();
  expect(screen.queryByRole('progressbar', { name: 'Progress for Formal club trials secured' })).toBeNull();
});

describe('D-030: a finished year shows everything the documents contain', () => {
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  let n = 0;
  beforeEach(() => {
    n = 0;
    URL.createObjectURL = jest.fn(() => `blob:p${(n += 1)}`);
    URL.revokeObjectURL = jest.fn();
    clientAPI.activityPhoto.mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  });
  afterEach(() => {
    // Unmount first: the gallery revokes its URLs on unmount, and jsdom has no
    // revokeObjectURL of its own to fall back to.
    require('@testing-library/react').cleanup();
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  });

  const TRIAL = {
    id: 9, title: 'Trials - Day 1', status: 'Completed', date: '2025-12-27',
    description: 'Physical screening and technical drills.\nReel: https://www.instagram.com/reel/abc/',
    photos: [{ id: 1, version: 'v1' }, { id: 2, version: 'v2' }, { id: 3, version: 'v3' }],
  };

  test('an activity shows what happened, with its links clickable', async () => {
    clientAPI.activities.mockResolvedValue([TRIAL]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));
    expect(await screen.findByText(/Physical screening and technical drills\./)).toBeInTheDocument();
    // Shown as site and page, linking to the full address.
    expect(screen.getByRole('link', { name: 'instagram.com/reel/abc' }))
      .toHaveAttribute('href', 'https://www.instagram.com/reel/abc/');
  });

  test('an activity card shows its photos without a click', async () => {
    clientAPI.activities.mockResolvedValue([TRIAL]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));
    const gallery = await screen.findByRole('list', { name: 'Photos: Trials - Day 1' });
    await waitFor(() => expect(within(gallery).getAllByRole('img')).toHaveLength(3));
    [1, 2, 3].forEach((id) => expect(clientAPI.activityPhoto).toHaveBeenCalledWith(9, id, `v${id}`));
    expect(screen.queryByRole('button', { name: /^See all/ })).not.toBeInTheDocument();
  });

  test('a card shows four photos, and See all opens every one', async () => {
    const many = { ...TRIAL, photos: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, version: `v${i + 1}` })) };
    clientAPI.activities.mockResolvedValue([many]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));
    const first = await screen.findByRole('list', { name: 'Photos: Trials - Day 1' });
    await waitFor(() => expect(within(first).getAllByRole('img')).toHaveLength(4));
    fireEvent.click(screen.getByRole('button', { name: 'See all 8 photos' }));
    await waitFor(() => expect(
      within(screen.getByRole('list', { name: 'Photos: Trials - Day 1' })).getAllByRole('img'),
    ).toHaveLength(8));
  });

  test('a planned activity shows no photos', async () => {
    clientAPI.activities.mockResolvedValue([{ ...TRIAL, status: 'Planned' }]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));
    await screen.findByText('Trials - Day 1');
    expect(screen.queryByRole('list', { name: /^Photos/ })).not.toBeInTheDocument();
    expect(clientAPI.activityPhoto).not.toHaveBeenCalled();
  });

  test('each activity carries its kind as a coloured label', async () => {
    clientAPI.activities.mockResolvedValue([{ ...TRIAL, activityType: 'Trial' }, { ...TRIAL, id: 10, title: 'Coaching', activityType: 'Training', photos: [] }]);
    const { container } = render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Activities/ }));
    await screen.findByText('Coaching');
    const tones = Object.fromEntries([...container.querySelectorAll('.ccards > .crow')].map((li) => [
      li.querySelector('.crow-t').textContent, [...li.classList].find((c) => c.startsWith('ctone-')),
    ]));
    expect(tones).toEqual({ 'Trials - Day 1': 'ctone-1', Coaching: 'ctone-2' });
  });

  test('a report shows the date printed on it, not the day it was uploaded', async () => {
    clientAPI.reports.mockResolvedValue([
      { id: 4, title: 'Progress Report - Part 1', reportType: 'Trial', hasFile: true,
        createdAt: '2026-10-26T10:00:00Z', documentDate: 'December 2025' },
    ]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Reports/ }));
    expect(await screen.findByText('Trial · December 2025')).toBeInTheDocument();
    expect(screen.queryByText(/26 Oct 2026/)).not.toBeInTheDocument();
  });

  test('a report with no printed date still shows its upload date', async () => {
    clientAPI.reports.mockResolvedValue([
      { id: 4, title: 'Notes', reportType: 'Trial', hasFile: true, createdAt: '2026-10-26T10:00:00Z', documentDate: '' },
    ]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Reports/ }));
    expect(await screen.findByText('Trial · 26 Oct 2026')).toBeInTheDocument();
  });

  test('the grant shows the day the money was received', async () => {
    clientAPI.project.mockResolvedValue([{ ...PROJECT, fundsReceivedOn: '2025-12-02' }]);
    render(<ClientPortalPage />);
    expect(await screen.findByText('Received')).toBeInTheDocument();
    expect(screen.getByText('2 Dec 2025')).toBeInTheDocument();
  });

  test('with no received date recorded the line is left out', async () => {
    render(<ClientPortalPage />);
    await screen.findByText('What has been delivered');
    expect(screen.queryByText('Received')).not.toBeInTheDocument();
  });
});

describe('D-032: a missed target of a finished year reads Not delivered', () => {
  const MISSED = { id: 7, title: 'Formal club trial opportunities secured', targetCount: 5, completedCount: null, status: 'Not Delivered', dueDate: '2026-03-31' };

  test('the Overview says Not delivered, not that no result was recorded', async () => {
    clientAPI.deliverables.mockResolvedValue([MISSED]);
    render(<ClientPortalPage />);
    expect(await screen.findByText('Not delivered')).toBeInTheDocument();
    expect(screen.queryByText('No result recorded yet')).not.toBeInTheDocument();
  });

  test('the Deliverables tab labels it once, with no Pending anywhere', async () => {
    clientAPI.deliverables.mockResolvedValue([MISSED]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Deliverables/ }));
    expect(await screen.findByText('Not Delivered')).toBeInTheDocument();
    expect(screen.queryByText('Not delivered')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });

  test('a target with no result and no Not Delivered mark still says no result was recorded', async () => {
    clientAPI.deliverables.mockResolvedValue([{ ...MISSED, status: 'Pending' }]);
    render(<ClientPortalPage />);
    expect(await screen.findByText('No result recorded yet')).toBeInTheDocument();
    expect(screen.queryByText('Not delivered')).not.toBeInTheDocument();
  });
});

describe('the Overview photo grid', () => {
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;
  let n = 0;
  beforeEach(() => {
    n = 0;
    URL.createObjectURL = jest.fn(() => `blob:g${(n += 1)}`);
    URL.revokeObjectURL = jest.fn();
    clientAPI.activityPhoto.mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  });
  afterEach(() => {
    require('@testing-library/react').cleanup();
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  });
  const photos = (base, k) => Array.from({ length: k }, (_, i) => ({ id: base + i, version: `v${base + i}` }));
  const DAY2 = { id: 2, title: 'Day 2', status: 'Completed', date: '2025-12-28', photos: photos(20, 8) };
  const DAY1 = { id: 1, title: 'Day 1', status: 'Completed', date: '2025-12-27', photos: photos(10, 8) };
  const TRAINING = { id: 3, title: 'Training', status: 'Completed', startDate: '2026-01-01', endDate: '2026-03-31', photos: [] };

  test('groups photos by month, then activity, oldest first, four from each', async () => {
    clientAPI.activities.mockResolvedValue([TRAINING, DAY2, DAY1]);
    render(<ClientPortalPage />);
    await waitFor(() => expect(clientAPI.activityPhoto).toHaveBeenCalledTimes(8));
    expect(await screen.findByRole('heading', { name: 'December 2025' })).toBeInTheDocument();
    const lists = await screen.findAllByRole('list', { name: /^Photos from / });
    expect(lists.map((l) => l.getAttribute('aria-label'))).toEqual(['Photos from Day 1', 'Photos from Day 2']);
    await waitFor(() => expect(within(lists[0]).getAllByRole('img')).toHaveLength(4));
  });

  test('See all opens the activity with every one of its photos', async () => {
    clientAPI.activities.mockResolvedValue([DAY1]);
    render(<ClientPortalPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'See all 8 photos' }));
    expect(screen.getByRole('tab', { name: /^Activities/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('list', { name: 'Photos: Day 1' })).toBeInTheDocument();
  });
});

test('achieved targets are tiles and missed ones are listed apart, under one Not delivered heading', async () => {
  clientAPI.deliverables.mockResolvedValue([
    { id: 1, title: 'Camp attendance', targetCount: 200, completedCount: 200, status: 'Completed' },
    { id: 2, title: 'Club trials', targetCount: 5, completedCount: null, status: 'Not Delivered' },
    { id: 3, title: 'Placements', targetCount: null, completedCount: null, status: 'Not Delivered' },
  ]);
  const { container } = render(<ClientPortalPage />);
  expect(await screen.findByRole('heading', { name: 'Not delivered' })).toBeInTheDocument();
  expect(container.querySelectorAll('.cout')).toHaveLength(1);
  const missed = [...container.querySelectorAll('.cmiss')].map((li) => li.textContent);
  expect(missed).toEqual(['Club trialsTarget 5', 'Placements']);
  expect(screen.queryByText('—')).not.toBeInTheDocument();
});
