// The REP report now receives slim rows: no logo or MoU contents, only
// hasLogo/hasMou and, for values that are not uploaded files, the stored text.
// Row logos are fetched when a row is opened; downloads fetch at the click.
import React from 'react';
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  Navigate: ({ to }) => <div>redirect to {to}</div>,
}), { virtual: true });

jest.mock('../../auth/AuthContext', () => ({ __esModule: true, useAuth: jest.fn() }));

jest.mock('../../services/api', () => ({
  reportsAPI: { socialMedia: jest.fn() },
  repAPI: { getFileBlob: jest.fn() },
}));

jest.mock('../../utils/downloadHelpers', () => ({
  ...jest.requireActual('../../utils/downloadHelpers'),
  downloadLogo: jest.fn(() => Promise.resolve()),
  downloadMOU: jest.fn(() => Promise.resolve()),
  saveBlob: jest.fn(),
}));

const { useAuth } = require('../../auth/AuthContext');
const { reportsAPI, repAPI } = require('../../services/api');
const { downloadLogo, downloadMOU, saveBlob } = require('../../utils/downloadHelpers');
const GrantedRoute = require('../../auth/GrantedRoute').default;
const SocialMediaReport = require('./SocialMediaReport').default;

const base = {
  contactName: 'C', phone: '9876543210', mouStatus: 'Signed', mouDocumentName: 'm.pdf',
  repLogoName: 'l.png', website: '', websiteNA: true, facebook: '', facebookNA: true,
  instagram: '', instagramNA: true, telegram: '', telegramNA: true,
};
const assignment = (id, city) => ({ id, trialSeason: 'Season 6', trialType: 'CSR', city });

// Same three REPs in both shapes. Alpha has two uploaded files; Bravo a bare
// filename for a logo and a whitespace MoU (shown, but counted missing);
// Charlie nothing.
const STORED = {
  Alpha: { logo: 'data:image/png;base64,AAAA', mou: 'data:application/pdf;base64,BBBB' },
  Bravo: { logo: 'Budge-Budge logo.png', mou: '   ' },
  Charlie: { logo: '', mou: '' },
};
const present = (v) => v.trim() !== '';
const NAMES = ['Alpha', 'Bravo', 'Charlie'];
const fullRows = () => NAMES.map((name, i) => ({
  ...base, id: i + 1, repName: name, updatedAt: `2026-10-0${i + 1}T00:00:00Z`,
  repLogoUrl: STORED[name].logo, mouDocumentUrl: STORED[name].mou,
  cityAssignments: i === 2 ? [] : [assignment(10 + i, i ? 'Delhi' : 'Ambala')],
}));
const slimRows = () => fullRows().map(({ repLogoUrl, mouDocumentUrl, ...row }) => ({
  ...row,
  hasLogo: present(repLogoUrl),
  hasMou: present(mouDocumentUrl),
  repLogoText: repLogoUrl.startsWith('data:') ? '' : repLogoUrl,
  mouDocumentText: mouDocumentUrl.startsWith('data:') ? '' : mouDocumentUrl,
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const card = (name) => screen.getByText(name).closest('.MuiPaper-root');
const open = (name) => fireEvent.click(within(card(name)).getByRole('button', { name: /^more$/i }));

beforeEach(() => {
  jest.clearAllMocks();
  reportsAPI.socialMedia.mockResolvedValue({ reps: slimRows() });
  repAPI.getFileBlob.mockImplementation(() => Promise.resolve(new Blob(['x'])));
  global.URL.createObjectURL = jest.fn(() => 'blob:fetched');
  global.URL.revokeObjectURL = jest.fn();
});

async function renderLoaded() {
  const view = render(<SocialMediaReport />);
  await screen.findByText('Alpha');
  return view;
}

describe('one request per visit', () => {
  const as = (role, perms, permsLoading) => useAuth.mockReturnValue({
    user: { email: 'u@x.com', role }, isAuthenticated: true, perms, permsLoading,
  });
  const route = () => (
    <GrantedRoute module="report_social_media"><SocialMediaReport /></GrantedRoute>
  );

  test.each([
    ['SUPER_ADMIN', { isSuperAdmin: true, grants: {} }],
    ['ADMIN', { isSuperAdmin: false, grants: { report_social_media: { can_view: true } } }],
  ])('%s: the grants landing after the page opened does not fetch the report again', async (role, perms) => {
    as(role, null, true);
    const { rerender } = render(route());
    as(role, perms, false);
    rerender(route());
    await screen.findByText('Alpha');
    as(role, { ...perms }, false); // the focus refetch of the grants
    rerender(route());
    await act(async () => {});
    expect(reportsAPI.socialMedia).toHaveBeenCalledTimes(1);
  });
});

describe('counts and rows are what the full rows gave', () => {
  test('header counts and gap counts are identical for full and slim rows', async () => {
    reportsAPI.socialMedia.mockResolvedValue({ reps: fullRows() });
    const full = render(<SocialMediaReport />);
    await screen.findByText('Alpha');
    const header = (c) => c.querySelector('h5').parentElement.textContent;
    const fullHeader = header(full.container);
    full.unmount();

    reportsAPI.socialMedia.mockResolvedValue({ reps: slimRows() });
    const slim = await renderLoaded();
    expect(header(slim.container)).toBe(fullHeader);
    expect(fullHeader).toContain('3 REPs');
    expect(screen.getByText('1 missing logo')).toBeInTheDocument();
    expect(screen.getByText('2 missing MoU')).toBeInTheDocument();
  });

  test('each row offers the same download buttons as before', async () => {
    await renderLoaded();
    const buttons = (name) => within(card(name)).queryAllByRole('button', { name: /^download/i })
      .map((b) => b.getAttribute('aria-label'));
    expect(buttons('Alpha')).toEqual(['Download MOU', 'Download logo']);
    // Whitespace MoU and a bare-filename logo were truthy, so they had buttons.
    expect(buttons('Bravo')).toEqual(['Download MOU', 'Download logo']);
    expect(buttons('Charlie')).toEqual([]);
  });

  test('nothing is fetched until a row is opened or a download is clicked', async () => {
    await renderLoaded();
    await act(async () => {});
    expect(repAPI.getFileBlob).not.toHaveBeenCalled();
  });
});

describe('row logo', () => {
  test('a grey placeholder while loading, then the fetched logo', async () => {
    const d = deferred();
    repAPI.getFileBlob.mockReturnValueOnce(d.promise);
    await renderLoaded();
    open('Alpha');
    const placeholder = within(card('Alpha')).getByRole('status', { name: 'Loading logo' });
    expect(placeholder).toBeInTheDocument();
    expect(repAPI.getFileBlob).toHaveBeenCalledWith(1, 'logo', '2026-10-01T00:00:00Z');
    await act(async () => d.resolve(new Blob(['png'])));
    expect(within(card('Alpha')).getByAltText('Logo')).toHaveAttribute('src', 'blob:fetched');
    expect(within(card('Alpha')).queryByRole('status', { name: 'Loading logo' })).toBeNull();
  });

  test("on failure \"Couldn't load\" with a Retry that fetches only the logo again", async () => {
    repAPI.getFileBlob.mockRejectedValueOnce(new Error('500'));
    await renderLoaded();
    open('Alpha');
    expect(await within(card('Alpha')).findByText("Couldn't load")).toBeInTheDocument();
    fireEvent.click(within(card('Alpha')).getByRole('button', { name: 'Retry' }));
    expect(await within(card('Alpha')).findByAltText('Logo')).toHaveAttribute('src', 'blob:fetched');
    expect(repAPI.getFileBlob.mock.calls).toEqual([
      [1, 'logo', '2026-10-01T00:00:00Z'], [1, 'logo', '2026-10-01T00:00:00Z'],
    ]);
  });

  test('a stored filename shows as before and is not fetched; no file shows nothing', async () => {
    await renderLoaded();
    open('Bravo');
    open('Charlie');
    expect(within(card('Bravo')).getByAltText('Logo')).toHaveAttribute('src', 'Budge-Budge logo.png');
    expect(within(card('Charlie')).queryByAltText('Logo')).toBeNull();
    expect(within(card('Charlie')).queryByRole('status')).toBeNull();
    await act(async () => {});
    expect(repAPI.getFileBlob).not.toHaveBeenCalled();
  });
});

describe('downloads fetch at the click', () => {
  test('row Download shows "Downloading…" and is disabled until the file is saved', async () => {
    const d = deferred();
    repAPI.getFileBlob.mockReturnValueOnce(d.promise);
    await renderLoaded();
    fireEvent.click(within(card('Alpha')).getByRole('button', { name: 'Download logo' }));
    const busy = within(card('Alpha')).getByRole('button', { name: 'Downloading…' });
    expect(busy).toBeDisabled();
    expect(repAPI.getFileBlob).toHaveBeenCalledWith(1, 'logo', '2026-10-01T00:00:00Z');
    const blob = new Blob(['png']);
    await act(async () => d.resolve(blob));
    expect(saveBlob).toHaveBeenCalledWith(blob, 'Ambala-Alpha-Logo.png');
    expect(within(card('Alpha')).getByRole('button', { name: 'Download logo' })).toBeEnabled();
  });

  test('a failed row download names the file and Retry fetches it again', async () => {
    repAPI.getFileBlob.mockRejectedValueOnce(new Error('network'));
    await renderLoaded();
    fireEvent.click(within(card('Alpha')).getByRole('button', { name: 'Download MOU' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't download Alpha MoU.");
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'MOU-Season 6-CSR-Ambala.pdf'));
    expect(repAPI.getFileBlob).toHaveBeenCalledTimes(2);
  });

  test('a stored filename downloads through the old helper, as before', async () => {
    await renderLoaded();
    fireEvent.click(within(card('Bravo')).getByRole('button', { name: 'Download logo' }));
    await waitFor(() => expect(downloadLogo).toHaveBeenCalledWith(
      expect.objectContaining({ repName: 'Bravo', repLogoUrl: 'Budge-Budge logo.png' }), 'Delhi'));
    expect(repAPI.getFileBlob).not.toHaveBeenCalled();
  });

  test('Download Selected counts files, names the failures, and retries only those', async () => {
    jest.useFakeTimers();
    try {
      const gates = [deferred(), deferred()];
      repAPI.getFileBlob
        .mockReturnValueOnce(gates[0].promise)   // Alpha logo
        .mockReturnValueOnce(gates[1].promise);  // Alpha MoU
      render(<SocialMediaReport />);
      await act(async () => {});
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      fireEvent.click(screen.getByRole('button', { name: /Download Selected/ }));

      const button = () => screen.getByRole('button', { name: /^Download(ing| Selected)/ });
      expect(button()).toHaveTextContent('Downloading 1 of 4…');
      expect(button()).toBeDisabled();
      await act(async () => gates[0].resolve(new Blob(['a'])));
      expect(button()).toHaveTextContent('Downloading 2 of 4…');
      await act(async () => gates[1].reject(new Error('500')));
      await act(async () => { jest.advanceTimersByTime(500); });
      await act(async () => {});

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Downloaded 3 file(s) from 3 REP(s).');
      expect(alert).toHaveTextContent("Couldn't download Alpha MoU.");
      expect(alert).toHaveTextContent('had no logo: Charlie');
      expect(downloadLogo).toHaveBeenCalledTimes(1);   // Bravo's filename logo
      expect(downloadMOU).toHaveBeenCalledTimes(1);    // Bravo's whitespace MoU
      expect(button()).toHaveTextContent('Download Selected (3)');

      fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
      await act(async () => {});
      expect(repAPI.getFileBlob).toHaveBeenCalledTimes(3);
      expect(repAPI.getFileBlob).toHaveBeenLastCalledWith(1, 'mou', '2026-10-01T00:00:00Z');
      expect(await screen.findByRole('alert')).toHaveTextContent('Downloaded 1 file(s).');
    } finally {
      jest.useRealTimers();
    }
  });
});
