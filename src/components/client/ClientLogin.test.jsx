// The funder's front door: what it says when the link is wrong or the session
// ended, what it remembers after sign-in, and what the browser tab is called.
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { clientAPI } from '../../services/api';
import ClientLogin from './ClientLogin';

let mockSearch = '';
let mockSlug = 'acme';
const mockNavigate = jest.fn();
jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useParams: () => ({ slug: mockSlug }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: `/client/${mockSlug}/login`, search: mockSearch }),
  }),
  { virtual: true }
);

jest.mock('../../services/api', () => ({ clientAPI: { brandingBySlug: jest.fn() } }));

const mockLogin = jest.fn();
let mockSession = { isAuthenticated: false, user: null };
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, ...mockSession }),
}));

const ACME = { displayName: 'Acme Foundation', primaryColor: '#1D4ED8', logoUrl: '/logos/acme.png' };
const notFound = () => Object.assign(new Error('Not found.'), { response: { status: 404 } });

let signedInRole = 'CSR_CLIENT';

const signIn = async () => {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'f@acme.org' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  // The label returns once login() has settled and the slug decision is made.
  await screen.findByRole('button', { name: 'Sign In' });
};

beforeEach(() => {
  localStorage.clear();
  mockLogin.mockReset();
  mockNavigate.mockClear();
  mockSearch = '';
  mockSlug = 'acme';
  mockSession = { isAuthenticated: false, user: null };
  // The real login() stores the signed-in user before resolving.
  mockLogin.mockImplementation(async () => {
    localStorage.setItem('tta_user', JSON.stringify({ role: signedInRole }));
    return { success: true };
  });
  signedInRole = 'CSR_CLIENT';
  document.title = 'TTA — Trial Tracking App';
});

describe('a portal link that does not resolve', () => {
  test('says so above a form that still works', async () => {
    mockSlug = 'doesnotexist';
    clientAPI.brandingBySlug.mockRejectedValue(notFound());
    render(<ClientLogin />);

    expect(
      await screen.findByText("This portal link isn't recognised. Use the link from your invitation email.")
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  test('a funder signing in there does not overwrite their stored slug', async () => {
    mockSlug = 'doesnotexist';
    localStorage.setItem('tta_client_slug', 'acme');
    clientAPI.brandingBySlug.mockRejectedValue(notFound());
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    await signIn();

    expect(mockLogin).toHaveBeenCalled();
    expect(localStorage.getItem('tta_client_slug')).toBe('acme');
  });

  test('a server error is not reported as a bad link', async () => {
    clientAPI.brandingBySlug.mockRejectedValue(
      Object.assign(new Error('boom'), { response: { status: 500 } })
    );
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    expect(screen.queryByText(/isn't recognised/)).not.toBeInTheDocument();
  });

  test('a recognised slug is stored on sign-in', async () => {
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    await signIn();

    expect(localStorage.getItem('tta_client_slug')).toBe('acme');
    expect(mockNavigate).toHaveBeenCalledWith('/client', { replace: true });
  });

  test('a staff account signing in on a funder door leaves no funder slug behind', async () => {
    signedInRole = 'ADMIN';
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    await signIn();

    expect(mockLogin).toHaveBeenCalled();
    expect(localStorage.getItem('tta_client_slug')).toBeNull();
  });
});

test('an ended session explains itself in the page', async () => {
  mockSearch = '?reason=expired';
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);

  expect(await screen.findByText('Your session ended. Sign in again.')).toBeInTheDocument();
});

test('no session message on a plain visit', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  await screen.findByRole('button', { name: 'Sign In' });

  expect(screen.queryByText('Your session ended. Sign in again.')).not.toBeInTheDocument();
});

test('a logo that fails to load falls back to the initial and name', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  const logo = await screen.findByRole('img', { name: 'Acme Foundation' });

  fireEvent.error(logo);

  expect(screen.queryByRole('img', { name: 'Acme Foundation' })).not.toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();
});

describe('someone already signed in in this browser', () => {
  const STAFF_NOTE = "You're signed in to TTA as staff. Sign in with the client's account to view their portal.";

  test('a funder session goes straight to the portal', async () => {
    mockSession = { isAuthenticated: true, user: { role: 'CSR_CLIENT' } };
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    expect(mockNavigate).toHaveBeenCalledWith('/client', { replace: true });
    expect(screen.queryByText(STAFF_NOTE)).not.toBeInTheDocument();
  });

  test('a staff session stays on the door, told to use the client account', async () => {
    mockSession = { isAuthenticated: true, user: { role: 'SUPER_ADMIN' } };
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);

    expect(await screen.findByText(STAFF_NOTE)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  test('signing in as the funder from there opens the portal', async () => {
    mockSession = { isAuthenticated: true, user: { role: 'ADMIN' } };
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);
    await screen.findByRole('button', { name: 'Sign In' });

    await signIn();

    expect(mockLogin).toHaveBeenCalledWith('f@acme.org', 'pw');
    expect(localStorage.getItem('tta_client_slug')).toBe('acme');
    expect(mockNavigate).toHaveBeenCalledWith('/client', { replace: true });
  });
});

test('the branded hero is a labelled landmark, not loose content', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  await screen.findByRole('button', { name: 'Sign In' });

  // hidden: the hero is display:none below the lg breakpoint, and jsdom has no
  // viewport to lift that.
  expect(
    screen.getByRole('complementary', { name: 'Acme Foundation CSR Portal', hidden: true })
  ).toBeInTheDocument();
});

test('the form sits in a main landmark', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  const main = await screen.findByRole('main');

  expect(main).toContainElement(screen.getByRole('button', { name: 'Sign In' }));
});

describe('document title', () => {
  test('names the funder once branding loads', async () => {
    clientAPI.brandingBySlug.mockResolvedValue(ACME);
    render(<ClientLogin />);

    await waitFor(() => expect(document.title).toBe('Acme Foundation · CSR Portal'));
  });

  test('is CSR Portal when the link is not recognised', async () => {
    clientAPI.brandingBySlug.mockRejectedValue(notFound());
    render(<ClientLogin />);

    await waitFor(() => expect(document.title).toBe('CSR Portal'));
  });
});

test('the show-password button is a 44px target', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  const toggle = await screen.findByRole('button', { name: 'Show password' });

  const style = window.getComputedStyle(toggle);
  expect(style.width).toBe('44px');
  expect(style.height).toBe('44px');
});

test('buttons get a focus ring in the legible accent, not the global amber', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(null);
  render(<ClientLogin />);
  await screen.findByRole('button', { name: 'Sign In' });

  // Emotion inserts rules through the CSSOM, so the <style> text is empty.
  const css = Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules).map((r) => r.cssText))
    .join('\n')
    .replace(/\s+/g, '');
  // Unbranded: the ring is the page ink (#111827), 17:1 on the canvas.
  expect(css).toMatch(/\.MuiButtonBase-root:focus-visible\{outline:2pxsolid#111827;outline-offset:2px;\}/);
  expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^}]*\{[^}]*;transition:none;\}/);
});

test('with a logo, the funder is still named on the form side, which is all a phone shows', async () => {
  clientAPI.brandingBySlug.mockResolvedValue(ACME);
  render(<ClientLogin />);
  const main = await screen.findByRole('main');
  expect(within(main).getByRole('img', { name: 'Acme Foundation' })).toBeInTheDocument();
  expect(within(main).getByText('Acme Foundation')).toBeInTheDocument();
  expect(screen.queryByText('CSR Portal')).not.toBeInTheDocument();
});
