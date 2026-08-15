// Which login screen an expired session returns to.
//
// Three platforms share one bundle and one auth engine, but they have three
// separate front doors:
//   /login               TTA operations staff
//   /csr/login           the internal CSR office team
//   /client/:slug/login  the external corporate funder, branded per client
//
// So "your session expired" cannot mean one fixed destination. Sending a CSR
// operator to TTA's door, or a funder to an internal page that does not exist in
// their bundle at all, is how a recoverable timeout turns into a dead end.
//
// This lives in its own module rather than in AuthContext because services/api.js
// needs the same rule on a failed token refresh, and api.js is imported BY
// AuthContext — putting it there would create a cycle.

export const CSR_CLIENT_ROLE = 'CSR_CLIENT';

// The role must be read BEFORE the session data is cleared, or the funder branch
// can never fire.
export function storedRole() {
  try {
    return JSON.parse(localStorage.getItem('tta_user'))?.role || null;
  } catch {
    return null; // no stored user / corrupt entry
  }
}

export function expiredSessionLoginPath(role = storedRole()) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  // Path is tested first, and safely: a funder never browses /csr, so the two
  // rules cannot collide.
  if (path === '/csr' || path.startsWith('/csr/')) return '/csr/login';
  if (role === CSR_CLIENT_ROLE) {
    const slug = localStorage.getItem('tta_client_slug');
    return slug ? `/client/${slug}/login` : '/client';
  }
  return '/login';
}

export function redirectToLoginDoor(role = storedRole()) {
  if (typeof window === 'undefined') return;
  const target = expiredSessionLoginPath(role);
  // Never redirect to where we already are — otherwise a failed request made
  // from a login screen reloads it in a loop.
  if (window.location.pathname !== target) window.location.href = target;
}
