// The funder landing tab is the surface a renewal decision gets made on. It
// used to open with five facts the funder already knew -- funder, sanctioned,
// status, start, end -- and put what was actually delivered two tabs away.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
