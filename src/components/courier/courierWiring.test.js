// WIRING tests — not unit tests.
//
// CourierManagementPage.jsx and GrantedRoute.jsx both reach react-router-dom,
// which CRA's Jest resolver cannot load, so neither can be imported here. These
// read the source and assert that the fixed logic is actually wired in — the
// unit tests in courierItemQuantity.test.js / courierShipmentFlag.test.js prove
// the logic is right, these prove the components use it.
import fs from 'fs';
import path from 'path';

const courierSrc = fs.readFileSync(
  path.join(__dirname, 'CourierManagementPage.jsx'), 'utf8'
);
const grantedSrc = fs.readFileSync(
  path.join(__dirname, '..', '..', 'auth', 'GrantedRoute.jsx'), 'utf8'
);

describe('#5 — the quantity field is wired to the sanitizer', () => {
  test('the quantity onChange no longer coerces with Number(e.target.value)', () => {
    expect(courierSrc).not.toMatch(/'quantity',\s*Number\(e\.target\.value\)/);
  });

  test('the quantity onChange runs sanitizeQuantityInput', () => {
    expect(courierSrc).toMatch(/onChange\(index,\s*'quantity',\s*sanitizeQuantityInput\(e\.target\.value\)\)/);
  });

  test('the quantity field coerces on blur', () => {
    expect(courierSrc).toMatch(/onBlur=\{e => onChange\(index,\s*'quantity',\s*normalizeQuantity\(e\.target\.value\)\)\}/);
  });

  test('the save path normalizes items before they reach the API', () => {
    expect(courierSrc).toMatch(/normalizeItemsForSave\(fItems\)/);
    // Field-by-field rather than a literal call shape, so adding a field (the
    // expectedUpdatedAt optimistic-lock token) does not fail a test whose point
    // is that the NORMALIZED array is what reaches the API.
    expect(courierSrc).toMatch(
      /courierAPI\.update\(editingId,\s*\{[\s\S]{0,200}?items: itemsForSave[\s\S]{0,200}?\}\)/
    );
    expect(courierSrc).toMatch(/itemsForSave\.map\(\(it, i\) => \(\{ \.\.\.it, order: i \}\)\)/);
    // The raw editing-shape array must not be what the API is handed. (The one
    // remaining `items: fItems` is the canSaveShipment guard, which wants the
    // editing shape.)
    expect(courierSrc).not.toMatch(/courierAPI\.(create|update)\([\s\S]{0,120}items: fItems/);
  });

  test('#6 — the save sends the optimistic-lock token it loaded', () => {
    // Tracker row #6 (Nirja): "item added separately was missing". Saving
    // replaces the whole item list, so without this token a stale tab silently
    // deletes another user's item. The server enforces it; the form must send
    // it or the guard never engages.
    expect(courierSrc).toMatch(/setLoadedUpdatedAt\(s\.updatedAt \|\| ''\)/);
    expect(courierSrc).toMatch(/expectedUpdatedAt: loadedUpdatedAt/);
  });

  test('the save guard is the shared predicate, so an empty box cannot block it', () => {
    expect(courierSrc).toMatch(/canSaveShipment\(\{ editingId, assignmentId: fAsgId, items: fItems \}\)/);
  });

  test('the quantity helpers are imported from the tested module', () => {
    expect(courierSrc).toMatch(/from '\.\/courierItemQuantity'/);
  });
});

describe('#9a — getShipmentFlag no longer reads items without a fallback', () => {
  test('the unguarded shipment.items access is gone from the page', () => {
    expect(courierSrc).not.toMatch(/shipment\.items\.some/);
    // Every items access on an object must go through a `|| []` first — a bare
    // `x.items.some(...)` anywhere in this file is the same defect again.
    expect(courierSrc).not.toMatch(/\w\.items\.(some|map|filter|reduce|length)/);
  });

  test('the flag helpers are imported from the tested module', () => {
    expect(courierSrc).toMatch(/import \{ daysUntil, getShipmentFlag \} from '\.\/courierShipmentFlag'/);
  });

  test('the page no longer defines its own copies', () => {
    expect(courierSrc).not.toMatch(/function getShipmentFlag/);
    expect(courierSrc).not.toMatch(/function daysUntil/);
  });
});

describe('#9b — GrantedRoute shows a loading state instead of a blank screen', () => {
  test('the permsLoading branch does not return null', () => {
    const branch = grantedSrc.slice(grantedSrc.indexOf('if (permsLoading)'));
    expect(branch).toMatch(/if \(permsLoading\) \{\s*return \(/);
    expect(branch).not.toMatch(/if \(permsLoading\) \{\s*return null;/);
  });

  test('the loading branch renders a progress indicator', () => {
    expect(grantedSrc).toMatch(/CircularProgress/);
    expect(grantedSrc).toMatch(/role="status"/);
  });

  test('the deliberate legacy-role fallback is untouched — admins are not locked out', () => {
    expect(grantedSrc).toMatch(/return fallbackRoles\.includes\(user\.role\)\s*\?\s*children\s*:\s*<Navigate to="\/unauthorized" replace \/>;/);
    expect(grantedSrc).toMatch(/fallbackRoles = \[ROLES\.SUPER_ADMIN, ROLES\.ADMIN\]/);
  });

  test('the super-admin and unauthenticated short-circuits still come first', () => {
    const iAuth = grantedSrc.indexOf('if (!isAuthenticated)');
    const iSuper = grantedSrc.indexOf('if (isSuper)');
    const iLoading = grantedSrc.indexOf('if (permsLoading)');
    expect(iAuth).toBeGreaterThan(-1);
    expect(iAuth).toBeLessThan(iSuper);
    expect(iSuper).toBeLessThan(iLoading);
  });
});
