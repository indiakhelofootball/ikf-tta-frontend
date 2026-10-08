// Which door a session returns to. The funder rows are the defect: sign-out and
// expiry clear the stored user first, so the role reads null and the funder was
// sent to TTA's staff login. The staff rows pin the path that must not move.
import { expiredSessionLoginPath, redirectToLoginDoor } from './loginDoor';

const realLocation = window.location;

const at = (pathname) => {
  delete window.location;
  window.location = { pathname, href: `http://localhost${pathname}` };
};

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  window.location = realLocation;
});

describe('staff paths are unchanged', () => {
  test('no role, no slug -> /login', () => {
    at('/dashboard');
    expect(expiredSessionLoginPath(null)).toBe('/login');
  });

  test('a staff role -> /login, even with a funder slug left in storage', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/client');
    expect(expiredSessionLoginPath('ADMIN')).toBe('/login');
    expect(expiredSessionLoginPath('SUPER_ADMIN')).toBe('/login');
  });

  test('a staff page with no role keeps /login, slug or not', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/dashboard');
    expect(expiredSessionLoginPath(null)).toBe('/login');
  });

  test('/csr pages go to the CSR door', () => {
    at('/csr/projects');
    expect(expiredSessionLoginPath(null)).toBe('/csr/login');
  });

  test('a staff expiry redirect is plain /login with no query', () => {
    at('/dashboard');
    redirectToLoginDoor('ADMIN');
    expect(window.location.href).toBe('/login');
  });
});

describe('a funder always returns to their own door', () => {
  test('role CSR_CLIENT -> the branded login', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/client');
    expect(expiredSessionLoginPath('CSR_CLIENT')).toBe('/client/acme/login');
  });

  test('after sign-out (role already cleared) on the portal -> the branded login', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/client');
    expect(expiredSessionLoginPath(null)).toBe('/client/acme/login');
  });

  test('an expiry redirect carries ?reason=expired for the in-page message', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/client');
    redirectToLoginDoor('CSR_CLIENT');
    expect(window.location.href).toBe('/client/acme/login?reason=expired');
  });

  test('already on the door: no redirect, so a failing request cannot loop', () => {
    localStorage.setItem('tta_client_slug', 'acme');
    at('/client/acme/login');
    redirectToLoginDoor('CSR_CLIENT');
    expect(window.location.href).toBe('http://localhost/client/acme/login');
  });
});
