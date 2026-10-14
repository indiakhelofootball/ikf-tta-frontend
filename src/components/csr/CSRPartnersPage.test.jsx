import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRPartnersPage from './CSRPartnersPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: { partnerRecords: { getAll: jest.fn() } },
}));

let mockCanEdit = true;
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canView: () => true, canEdit: () => mockCanEdit }),
}));

const { csrAPI } = require('../../services/api');

const PARTNER = {
  id: 5, vendorNameId: 31, name: 'A1 Classes', serviceType: 'Coaching',
  partnerCategoryId: 7, partnerCategoryName: 'Life Skills',
  isActive: true, activityCount: 3, contactCount: 1,
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockCanEdit = true;
  csrAPI.partnerRecords.getAll.mockResolvedValue({ results: [
    PARTNER,
    { ...PARTNER, id: 6, name: 'Kick Academy', isActive: false, activityCount: 0, contactCount: 0 },
  ] });
});

test('lists each partner with its type, counts and state', async () => {
  render(<CSRPartnersPage />);
  expect(await screen.findByText('A1 Classes')).toBeInTheDocument();
  expect(screen.getByText('Kick Academy')).toBeInTheDocument();
  expect(screen.getAllByText('Life Skills')).toHaveLength(2);
  expect(screen.getByText('3 activities')).toBeInTheDocument();
  expect(screen.getByText('1 contact')).toBeInTheDocument();
  expect(screen.getByText('Active')).toBeInTheDocument();
  expect(screen.getByText('Inactive')).toBeInTheDocument();
});

test('a row opens the partner page', async () => {
  render(<CSRPartnersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open A1 Classes' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/partners/5');
});

test('Add partner shows with CSR edit and is hidden without it', async () => {
  const { unmount } = render(<CSRPartnersPage />);
  await screen.findByText('A1 Classes');
  expect(screen.getByRole('button', { name: /add partner/i })).toBeInTheDocument();
  unmount();

  mockCanEdit = false;
  render(<CSRPartnersPage />);
  await screen.findByText('A1 Classes');
  expect(screen.queryByRole('button', { name: /add partner/i })).toBeNull();
});

test('search narrows the list', async () => {
  render(<CSRPartnersPage />);
  await screen.findByText('A1 Classes');
  fireEvent.change(screen.getByLabelText('Search partners'), { target: { value: 'kick' } });
  expect(screen.queryByText('A1 Classes')).toBeNull();
  expect(screen.getByText('Kick Academy')).toBeInTheDocument();
});

test('an empty list says how to add a partner', async () => {
  csrAPI.partnerRecords.getAll.mockResolvedValue([]);
  render(<CSRPartnersPage />);
  expect(await screen.findByText(
    'No partners yet. Add a vendor from the TTA vendor list as a CSR partner.',
  )).toBeInTheDocument();
});
