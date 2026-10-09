// The colour fields are free text that lands on the funder portal as CSS, so
// a value that is not #RRGGBB must not save.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRBrandingPage from './CSRBrandingPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    branding: { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    brandingImage: { upload: jest.fn(), remove: jest.fn() },
    projects: { getAll: jest.fn() },
  },
  brandImageUrl: (slug, kind, v) => `/img/${slug}/${kind}?v=${v}`,
}));

// jsdom has no canvas or blob URLs; the trimming itself is covered by
// brandImage.test.js, so here it reports a trimmed, well-sized logo.
jest.mock('./brandImage', () => ({
  ...jest.requireActual('./brandImage'),
  trimLogo: jest.fn(async (f) => ({ file: f, width: 400, height: 120, trimmed: true })),
}));
global.URL.createObjectURL = jest.fn(() => 'blob:preview');

const { csrAPI } = require('../../services/api');

const ROW = {
  id: 4, projectId: 11, slug: 'acme', displayName: 'Acme Foundation',
  logoUrl: '', loginImageUrl: '', primaryColor: '#2C6A4F', secondaryColor: '', isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.branding.getAll.mockResolvedValue([ROW]);
  csrAPI.projects.getAll.mockResolvedValue([{ id: 11, name: 'Grassroots Football' }]);
  csrAPI.branding.update.mockResolvedValue({});
});

async function openEdit() {
  render(<CSRBrandingPage />);
  await userEvent.click(await screen.findByRole('button', { name: /edit branding acme foundation/i }));
  return screen.getByLabelText('Primary colour');
}

test('a colour that is not six hex digits shows an error and does not save', async () => {
  const primary = await openEdit();
  await userEvent.clear(primary);
  await userEvent.type(primary, 'blue');
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

  expect(await screen.findByText('Use a 6-digit hex colour, e.g. #2C6A4F.')).toBeInTheDocument();
  expect(csrAPI.branding.update).not.toHaveBeenCalled();
});

test('a short hex is refused too', async () => {
  await openEdit();
  const secondary = screen.getByLabelText('Secondary colour');
  await userEvent.type(secondary, '#12');
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

  expect(await screen.findByText('Use a 6-digit hex colour, e.g. #2C6A4F.')).toBeInTheDocument();
  expect(csrAPI.branding.update).not.toHaveBeenCalled();
});

test('a colour typed without # in lower case saves as #RRGGBB', async () => {
  const primary = await openEdit();
  await userEvent.clear(primary);
  await userEvent.type(primary, '0b5fff');
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

  await waitFor(() => expect(csrAPI.branding.update).toHaveBeenCalled());
  const payload = csrAPI.branding.update.mock.calls[0][1];
  expect(payload.primaryColor).toBe('#0B5FFF');
  expect(payload.secondaryColor).toBe('');
});

test('each colour field carries a swatch bound to its value', async () => {
  await openEdit();
  const swatch = screen.getByLabelText('Primary colour swatch');
  expect(swatch).toHaveAttribute('type', 'color');
  expect(swatch).toHaveValue('#2c6a4f');
  expect(screen.getByLabelText('Secondary colour swatch')).toHaveAttribute('type', 'color');
});

test('a primary colour too light for text says so; a dark one does not', async () => {
  const note = 'Too light for text on white; the portal will use a darker shade of it for text.';
  const primary = await openEdit();
  expect(screen.queryByText(note)).toBeNull();

  await userEvent.clear(primary);
  await userEvent.type(primary, '#486AFF');
  expect(screen.getByText(note)).toBeInTheDocument();
});

test('a new branding suggests its link from the display name until the link is edited', async () => {
  render(<CSRBrandingPage />);
  await userEvent.click(await screen.findByRole('button', { name: /^new$/i }));
  await userEvent.type(screen.getByLabelText('Display name'), 'DLF Foundation');
  expect(screen.getByLabelText('Slug (URL key)')).toHaveValue('dlf');
  expect(screen.getByText('Invitation link: /client/dlf/login. It locks once the funder signs in.')).toBeInTheDocument();
});

test('the link cannot be edited once a funder has signed in', async () => {
  csrAPI.branding.getAll.mockResolvedValue([{ ...ROW, slugLocked: true }]);
  await openEdit();
  expect(screen.getByLabelText('Slug (URL key)')).toBeDisabled();
  expect(screen.getByText(/Locked: a funder has already signed in/)).toBeInTheDocument();
});

test('a picked logo is uploaded after the branding saves, and the preview shows it', async () => {
  const { trimLogo } = require('./brandImage');
  trimLogo.mockImplementation(async (f) => ({ file: f, width: 400, height: 120, trimmed: true }));
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  await openEdit();
  const logo = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' });
  await userEvent.upload(screen.getByLabelText('Logo file'), logo);
  expect(await screen.findByText('Empty edges were trimmed.')).toBeInTheDocument();
  expect(screen.getByText(/logo\.png, 1 KB, uploaded when you save/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
  await waitFor(() => expect(csrAPI.brandingImage.upload).toHaveBeenCalledWith(4, 'logo', logo));
  expect(csrAPI.branding.update).toHaveBeenCalled();
});

test('an SVG logo is refused before anything is sent', async () => {
  await openEdit();
  const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
  await userEvent.upload(screen.getByLabelText('Logo file'), svg, { applyAccept: false });
  expect(await screen.findByRole('alert')).toHaveTextContent('Upload a PNG, JPG or WEBP image.');
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
  await waitFor(() => expect(csrAPI.branding.update).toHaveBeenCalled());
  expect(csrAPI.brandingImage.upload).not.toHaveBeenCalled();
});

test('removing an uploaded logo deletes it on save', async () => {
  csrAPI.branding.getAll.mockResolvedValue([{ ...ROW, logoFile: { name: 'old.png', size: 2048, version: 'abc' } }]);
  await openEdit();
  expect(screen.getByText('old.png, 2 KB')).toBeInTheDocument();
  await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
  await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
  await waitFor(() => expect(csrAPI.brandingImage.remove).toHaveBeenCalledWith(4, 'logo'));
});
