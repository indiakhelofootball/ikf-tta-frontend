// The funder landing tab is the surface a renewal decision gets made on. It
// used to open with five facts the funder already knew -- funder, sanctioned,
// status, start, end -- and put what was actually delivered two tabs away.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  clientAPI: {
    project: jest.fn(),
    activities: jest.fn(),
    reports: jest.fn(),
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
