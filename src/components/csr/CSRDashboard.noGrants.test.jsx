// With no open grant the dashboard's grant totals read "—", not a ₹0 that
// looks like a real figure. One open grant brings the rupee figures back.
// The figures carry no accessible names of their own, so they are read by the
// dashboard's own class names.
/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CSRDashboard from './CSRDashboard';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canView: () => true, canEdit: () => true }),
}));

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getAll: jest.fn() },
    deliverables: { getAll: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    utilisationCertificate: jest.fn(),
  },
}));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.deliverables.getAll.mockResolvedValue([]);
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.utilisationCertificate.mockResolvedValue({ totalUtilised: '0', excludedItems: [] });
});

const statValue = (label) => screen.getByText(label, { selector: '.stat-k' })
  .parentElement.querySelector('.stat-v').textContent;

test('no grants: the totals read "—" and no ₹0 appears', async () => {
  csrAPI.projects.getAll.mockResolvedValue([]);
  const { container } = render(<CSRDashboard />);
  await waitFor(() => expect(container.querySelector('.loading')).toBeNull());

  expect(statValue('Total Sanctioned')).toBe('—');
  expect(statValue('Utilised')).toBe('—');
  expect(statValue('Remaining')).toBe('—');
  expect(container.querySelector('.flow-total').textContent).toBe('—');
  expect(container.querySelector('.stat-pair').textContent).not.toMatch(/₹\s*0/);
});

test('one open grant: the rupee figures are back', async () => {
  csrAPI.projects.getAll.mockResolvedValue([
    { id: 1, name: 'G', clientName: 'F', sanctionedAmount: '10000', status: 'Active' },
  ]);
  const { container } = render(<CSRDashboard />);
  await waitFor(() => expect(container.querySelector('.loading')).toBeNull());

  expect(statValue('Total Sanctioned')).toMatch(/10,000/);
  expect(statValue('Remaining')).toMatch(/10,000/);
  expect(container.querySelector('.flow-total').textContent).toMatch(/10,000/);
});

test('a confirmed ₹0 grant shows ₹0, not "—"', async () => {
  csrAPI.projects.getAll.mockResolvedValue([
    { id: 1, name: 'G', clientName: 'F', sanctionedAmount: '0', status: 'Active' },
  ]);
  const { container } = render(<CSRDashboard />);
  await waitFor(() => expect(container.querySelector('.loading')).toBeNull());

  expect(statValue('Total Sanctioned')).not.toBe('—');
});
