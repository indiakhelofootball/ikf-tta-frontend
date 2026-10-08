// A funder whose session ends -- sign-out, the 8-hour timer, or a stored
// session found expired on load -- must land on their own branded login, never
// TTA's staff login. The bug: every one of those paths cleared the stored user
// BEFORE asking which door to use, so the role read null and the answer was
// /login. The staff rows pin the path that must not change.
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: global.location.pathname }),
    Navigate: ({ to }) => require('react').createElement('div', { 'data-testid': 'navigate' }, to),
    Outlet: () => require('react').createElement('div', null, 'protected'),
  }),
  { virtual: true }
);

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { login: jest.fn(), verifyOTP: jest.fn() },
  permissionsAPI: { getMine: jest.fn() },
}));

jest.mock('../utils/adminStorage', () => ({
  __esModule: true,
  refreshAllFromAPI: jest.fn(),
  clearConfigCache: jest.fn(),
}));

const api = require('../services/api').default;
const { permissionsAPI } = require('../services/api');
const { refreshAllFromAPI } = require('../utils/adminStorage');
const { AuthProvider, useAuth } = require('./AuthContext');
const RoleBasedRoute = require('./RoleBasedRoute').default;
const RequireAuth = require('./RequireAuth').default;

const HOUR = 60 * 60 * 1000;
const realLocation = window.location;

const at = (pathname) => {
  delete window.location;
  window.location = { pathname, href: `http://localhost${pathname}` };
};

const seedSession = (role, { ageMs = 0 } = {}) => {
  localStorage.setItem('tta_token', 'tok');
  localStorage.setItem('tta_refresh', 'ref');
  localStorage.setItem('tta_login_time', (Date.now() - ageMs).toString());
  localStorage.setItem('tta_user', JSON.stringify({ id: 1, email: 'u@example.com', name: 'U', role }));
};

let auth;
function Probe() {
  auth = useAuth();
  return <button onClick={() => auth.logout()}>Sign out</button>;
}

const renderPortal = async (guard = 'role') => {
  render(
    <AuthProvider>
      <Probe />
      {guard === 'role' ? (
        <RoleBasedRoute allowedRoles={['CSR_CLIENT']}>
          <div>portal</div>
        </RoleBasedRoute>
      ) : (
        <RequireAuth />
      )}
    </AuthProvider>
  );
  // Flush the provider's async session restore.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {});
};

beforeEach(() => {
  localStorage.clear();
  permissionsAPI.getMine.mockResolvedValue({ isSuperAdmin: false, grants: {} });
  refreshAllFromAPI.mockResolvedValue(undefined);
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  window.alert.mockRestore();
});

afterAll(() => {
  window.location = realLocation;
});

describe('sign-out', () => {
  test('a funder signing out of /client (staff bundle) lands on their branded login', async () => {
    at('/client');
    seedSession('CSR_CLIENT');
    localStorage.setItem('tta_client_slug', 'acme');
    await renderPortal('role');
    expect(screen.getByText('portal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sign out'));

    expect(screen.getByTestId('navigate')).toHaveTextContent('/client/acme/login');
    expect(localStorage.getItem('tta_client_slug')).toBe('acme');
  });

  test('the same through RequireAuth', async () => {
    at('/client');
    seedSession('CSR_CLIENT');
    localStorage.setItem('tta_client_slug', 'acme');
    await renderPortal('auth');

    fireEvent.click(screen.getByText('Sign out'));

    expect(screen.getByTestId('navigate')).toHaveTextContent('/client/acme/login');
  });

  test('UNCHANGED: a staff user signing out goes to /login, and a stale funder slug is removed', async () => {
    at('/dashboard');
    seedSession('ADMIN');
    localStorage.setItem('tta_client_slug', 'acme');
    await renderPortal('auth');
    expect(screen.getByText('protected')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sign out'));

    expect(screen.getByTestId('navigate')).toHaveTextContent('/login');
    expect(localStorage.getItem('tta_client_slug')).toBeNull();
  });
});

describe('sign-in', () => {
  const backendSays = (role) =>
    api.login.mockResolvedValue({
      success: true,
      user: { id: 2, email: 'x@example.com', name: 'X', role },
      tokens: { access: 'a', refresh: 'r' },
    });

  test('a staff sign-in clears a funder slug, so it cannot route staff to a funder door', async () => {
    at('/login');
    localStorage.setItem('tta_client_slug', 'acme');
    backendSays('ADMIN');
    await renderPortal('auth');

    await act(async () => { await auth.login('x@example.com', 'pw'); });

    expect(localStorage.getItem('tta_client_slug')).toBeNull();
  });

  test('a funder sign-in keeps it', async () => {
    at('/client/acme/login');
    localStorage.setItem('tta_client_slug', 'acme');
    backendSays('CSR_CLIENT');
    await renderPortal('auth');

    await act(async () => { await auth.login('x@example.com', 'pw'); });

    expect(localStorage.getItem('tta_client_slug')).toBe('acme');
  });
});

describe('the 8-hour timer', () => {
  test('a funder is sent to the branded login with ?reason=expired, and no native alert', async () => {
    jest.useFakeTimers();
    at('/client');
    seedSession('CSR_CLIENT', { ageMs: 8 * HOUR - 1000 });
    localStorage.setItem('tta_client_slug', 'acme');
    await renderPortal('role');

    await act(async () => { jest.advanceTimersByTime(2000); });

    expect(window.location.href).toBe('/client/acme/login?reason=expired');
    expect(window.alert).not.toHaveBeenCalled();
  });

  test('UNCHANGED: staff still get the alert and /login', async () => {
    jest.useFakeTimers();
    at('/dashboard');
    seedSession('ADMIN', { ageMs: 8 * HOUR - 1000 });
    await renderPortal('auth');

    await act(async () => { jest.advanceTimersByTime(2000); });

    expect(window.alert).toHaveBeenCalledWith('Your session has expired. Please login again.');
    expect(window.location.href).toBe('/login');
  });
});

describe('a stored session found expired on load', () => {
  test('a funder goes to the branded login, not /login', async () => {
    at('/client');
    seedSession('CSR_CLIENT', { ageMs: 9 * HOUR });
    localStorage.setItem('tta_client_slug', 'acme');
    await renderPortal('role');

    expect(window.location.href).toBe('/client/acme/login?reason=expired');
  });

  test('UNCHANGED: staff go to /login', async () => {
    at('/dashboard');
    seedSession('ADMIN', { ageMs: 9 * HOUR });
    await renderPortal('auth');

    expect(window.location.href).toBe('/login');
  });
});
