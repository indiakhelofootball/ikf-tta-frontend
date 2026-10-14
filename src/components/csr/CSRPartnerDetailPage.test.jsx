import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRPartnerDetailPage from './CSRPartnerDetailPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '5' }),
  useLocation: () => ({ state: null }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: { partnerRecords: { getById: jest.fn(), delivered: jest.fn(), delete: jest.fn() } },
}));

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canView: () => true, canEdit: () => true }),
}));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.partnerRecords.getById.mockResolvedValue({
    id: 5, vendorNameId: 31, name: 'A1 Classes', serviceType: 'Coaching',
    partnerCategoryId: 7, partnerCategoryName: 'Life Skills',
    address: '12 MG Road, Pune', isActive: true, activityCount: 1, contactCount: 0,
  });
  csrAPI.partnerRecords.delivered.mockResolvedValue({
    activities: [{
      id: 41, title: 'Life skills camp', projectId: 11, projectName: 'Khelo Girls',
      activityType: 'Workshop', startDate: '2026-09-09', status: 'Completed', city: 'Pune',
    }],
    contacts: [],
  });
});

test('shows the partner, what it delivered, and its TTA service type', async () => {
  render(<CSRPartnerDetailPage />);
  expect(await screen.findByRole('heading', { name: 'A1 Classes' })).toBeInTheDocument();
  expect(screen.getByText('TTA service type: Coaching')).toBeInTheDocument();
  expect(screen.getByText('Life Skills')).toBeInTheDocument();
  expect(screen.getByText('Workshop')).toBeInTheDocument();
  expect(screen.getByText('Khelo Girls')).toBeInTheDocument();
  expect(screen.getByText('No contacts represent this partner yet.')).toBeInTheDocument();
});

test('an activity title opens its grant on the Activities tab', async () => {
  render(<CSRPartnerDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Life skills camp' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { tab: 2 } });
});

test('a partner in use cannot be removed and the server says why', async () => {
  const detail = "This partner is named on 1 activity, so it can't be removed. Make it inactive instead.";
  const err = new Error(detail);
  err.response = { status: 409, data: { detail } };
  csrAPI.partnerRecords.delete.mockRejectedValue(err);

  render(<CSRPartnerDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

  expect(await screen.findByText(detail)).toBeInTheDocument();
  expect(csrAPI.partnerRecords.delete).toHaveBeenCalledWith('5');
  await waitFor(() => expect(mockNavigate).not.toHaveBeenCalledWith('/csr/partners'));
});
