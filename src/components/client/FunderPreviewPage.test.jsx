// "Preview as funder" (D-018): staff see the funder portal for one grant, fed
// by one staff call, read-only, with a banner and a way back.
import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '5' }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  withBrandImages: (b) => b,
  clientAPI: {
    project: jest.fn(),
    activities: jest.fn(),
    reports: jest.fn(),
    reportFile: jest.fn(),
    deliverables: jest.fn(),
    myBranding: jest.fn(),
    certificate: jest.fn(),
    activityPhoto: jest.fn(),
  },
  csrAPI: {
    funderView: jest.fn(),
    activityPhotos: { file: jest.fn() },
    reportFile: { download: jest.fn() },
  },
}));

jest.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock('jspdf', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jspdf-autotable', () => ({ __esModule: true, default: jest.fn() }));

import { clientAPI, csrAPI } from '../../services/api';
import FunderPreviewPage from './FunderPreviewPage';

const VIEW = {
  project: {
    id: 5, name: 'Grassroots 2026', clientName: 'Acme Foundation', sanctionedAmount: 921000,
    status: 'Active', startDate: '2026-04-01', endDate: '2027-03-31',
  },
  activities: [
    { id: 11, title: 'District trial', activityType: 'Trial', location: 'Gurugram', startDate: '2026-09-14', status: 'Completed', photos: [{ id: 7, version: 'a1' }] },
    { id: 12, title: 'Coaching clinic', activityType: 'Workshop', location: 'Rohtak', startDate: '2026-11-10', status: 'Planned' },
  ],
  reports: [{ id: 21, title: 'Quarter one summary', hasFile: true, createdAt: '2026-10-08' }],
  deliverables: [],
  athletes: [],
  certificate: { available: false, reason: 'open', endDate: '2027-03-31' },
  branding: { slug: 'acme', displayName: 'Acme Foundation CSR', primaryColor: '#1B3A6B' },
};

beforeEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
  mockNavigate.mockReset();
  csrAPI.funderView.mockReset();
  csrAPI.funderView.mockResolvedValue(VIEW);
  csrAPI.activityPhotos.file.mockReset();
  csrAPI.activityPhotos.file.mockResolvedValue({ blob: new Blob(['x'], { type: 'image/jpeg' }) });
  csrAPI.reportFile.download.mockReset();
  URL.createObjectURL = jest.fn(() => 'blob:photo');
  URL.revokeObjectURL = jest.fn();
});

test('the preview is fed by one staff call, never the funder endpoints', async () => {
  render(<FunderPreviewPage />);
  expect(await screen.findByRole('heading', { level: 1, name: 'Grassroots 2026' })).toBeInTheDocument();

  expect(csrAPI.funderView).toHaveBeenCalledTimes(1);
  expect(csrAPI.funderView).toHaveBeenCalledWith('5');
  Object.values(clientAPI).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  // The funder's branding and counts come through it.
  expect(screen.getByText('Acme Foundation CSR')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Activities (1 delivered · 1 upcoming)' })).toBeInTheDocument();
});

test('a banner names the grant and Back returns to the grant page', async () => {
  render(<FunderPreviewPage />);
  const banner = await screen.findByRole('complementary', { name: 'Preview' });
  await waitFor(() => expect(banner)
    .toHaveTextContent('Preview — this is what the funder of Grassroots 2026 sees'));

  fireEvent.click(within(banner).getByRole('button', { name: 'Back' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/5');
});

test('the preview is read-only: no Change password, Sign out or account menu', async () => {
  render(<FunderPreviewPage />);
  await screen.findByRole('heading', { level: 1, name: 'Grassroots 2026' });

  expect(screen.queryByText('Change password')).not.toBeInTheDocument();
  expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument();
});

test('photos in the preview come from the staff photo endpoint', async () => {
  render(<FunderPreviewPage />);
  // The large top photo was removed 27 Oct; the photo now sits under its activity.
  expect(await screen.findByRole('img', { name: /^District trial, 1 of \d+$/ })).toBeInTheDocument();

  expect(csrAPI.activityPhotos.file).toHaveBeenCalledWith(11, 7);
  expect(clientAPI.activityPhoto).not.toHaveBeenCalled();
});

test('report files in the preview open through the staff report-file endpoint', async () => {
  const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  csrAPI.reportFile.download.mockResolvedValue({ blob, contentType: 'application/pdf', fileName: 'q1.pdf' });
  const openSpy = jest.spyOn(window, 'open').mockReturnValue({});
  window.history.replaceState(null, '', '#reports');
  try {
    render(<FunderPreviewPage />);
    const open = await screen.findByRole('button', { name: 'Open Quarter one summary' });
    await act(async () => { fireEvent.click(open); });

    expect(csrAPI.reportFile.download).toHaveBeenCalledWith(21);
    expect(clientAPI.reportFile).not.toHaveBeenCalled();
  } finally {
    openSpy.mockRestore();
  }
});

test('the certificate tab in the preview shows what the funder would see', async () => {
  window.history.replaceState(null, '', '#certificate');
  render(<FunderPreviewPage />);
  expect(await screen.findByText(/Your utilisation certificate is issued when this grant closes, on 31 Mar 2027/))
    .toBeInTheDocument();
  expect(csrAPI.funderView).toHaveBeenCalledTimes(1);
});

test('a failed preview load still shows the banner and its Back button', async () => {
  csrAPI.funderView.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500, data: {} } }));
  render(<FunderPreviewPage />);

  expect(await screen.findByText(/We couldn.t load your grant just now/)).toBeInTheDocument();
  const banner = screen.getByRole('complementary', { name: 'Preview' });
  expect(banner).toHaveTextContent('Preview — this is what the funder of this grant sees');
  fireEvent.click(within(banner).getByRole('button', { name: 'Back' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/5');
});
