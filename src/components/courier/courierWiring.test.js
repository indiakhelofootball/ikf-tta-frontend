// WIRING tests — not unit tests.
//
// CourierManagementPage.jsx and GrantedRoute.jsx both reach react-router-dom,
// which CRA's Jest resolver cannot load, so neither can be imported here. These
// read the source and assert that the fixed logic is actually wired in — the
// unit tests in courierItemQuantity.test.js / courierShipmentFlag.test.js prove
// the logic is right, these prove the components use it.
//
// G20: they used to assert on the raw text, whitespace and all, so
// `npm run format` (prettier, a documented project command) could redden the
// whole file with the behaviour completely unchanged — a false alarm that
// teaches people to distrust the suite. Everything now goes through
// `normalise()` below, which erases exactly what prettier is free to change
// and nothing else, so an assertion can only fail when the WIRING changed.
import fs from 'fs';
import path from 'path';

// Prettier (v3, no config in this repo → defaults) may reflow lines, re-indent,
// switch ' to ", add parentheses round a single arrow parameter, and add
// trailing commas. None of that alters behaviour, so none of it may alter a
// match. It does NOT reorder or rename anything, which is what these guard.
const normalise = (src) =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/'/g, '"')            // quote style: prettier's default is "
    .replace(/\s+/g, '')           // line breaks and indentation
    .replace(/\((\w+)\)=>/g, '$1=>') // arrowParens: (e) => vs e =>
    .replace(/,(?=[)\]}])/g, '');  // trailing commas

const read = (...parts) =>
  normalise(fs.readFileSync(path.join(__dirname, ...parts), 'utf8'));

const courierSrc = read('CourierManagementPage.jsx');
const grantedSrc = read('..', '..', 'auth', 'GrantedRoute.jsx');

// Assert on a snippet written the way it reads in the file; it is normalised
// the same way the source is, so the two can only disagree on substance.
const wires = (src, snippet) => src.includes(normalise(snippet));

describe('#5 — the quantity field is wired to the sanitizer', () => {
  test('the quantity onChange no longer coerces with Number(e.target.value)', () => {
    expect(wires(courierSrc, "'quantity', Number(e.target.value)")).toBe(false);
  });

  test('the quantity onChange runs sanitizeQuantityInput', () => {
    expect(
      wires(courierSrc, "onChange(index, 'quantity', sanitizeQuantityInput(e.target.value))")
    ).toBe(true);
  });

  test('the quantity field coerces on blur', () => {
    expect(
      wires(courierSrc, "onBlur={e => onChange(index, 'quantity', normalizeQuantity(e.target.value))}")
    ).toBe(true);
  });

  test('the save path normalizes items before they reach the API', () => {
    expect(wires(courierSrc, 'normalizeItemsForSave(fItems)')).toBe(true);
    // Field-by-field rather than a literal call shape, so adding a field (the
    // expectedUpdatedAt optimistic-lock token) does not fail a test whose point
    // is that the NORMALIZED array is what reaches the API.
    expect(courierSrc).toMatch(
      /courierAPI\.update\(editingId,\{.{0,200}?items:itemsForSave.{0,200}?\}\)/
    );
    expect(wires(courierSrc, 'itemsForSave.map((it, i) => ({ ...it, order: i }))')).toBe(true);
    // The raw editing-shape array must not be what the API is handed. (The one
    // remaining `items: fItems` is the canSaveShipment guard, which wants the
    // editing shape.)
    expect(courierSrc).not.toMatch(/courierAPI\.(create|update)\(.{0,120}items:fItems/);
  });

  test('#6 — the save sends the optimistic-lock token it loaded', () => {
    // Tracker row #6 (Nirja): "item added separately was missing". Saving
    // replaces the whole item list, so without this token a stale tab silently
    // deletes another user's item. The server enforces it; the form must send
    // it or the guard never engages.
    expect(wires(courierSrc, "setLoadedUpdatedAt(s.updatedAt || '')")).toBe(true);
    expect(wires(courierSrc, 'expectedUpdatedAt: loadedUpdatedAt')).toBe(true);
  });

  test('the save guard is the shared predicate, so an empty box cannot block it', () => {
    expect(
      wires(courierSrc, 'canSaveShipment({ editingId, assignmentId: fAsgId, items: fItems })')
    ).toBe(true);
  });

  test('the quantity helpers are imported from the tested module', () => {
    expect(wires(courierSrc, "from './courierItemQuantity'")).toBe(true);
  });
});

describe('#9a — getShipmentFlag no longer reads items without a fallback', () => {
  test('the unguarded shipment.items access is gone from the page', () => {
    expect(wires(courierSrc, 'shipment.items.some')).toBe(false);
    // Every items access on an object must go through a `|| []` first — a bare
    // `x.items.some(...)` anywhere in this file is the same defect again. A
    // guarded read normalises to `(x.items||[]).some(`, so it cannot match.
    const unguarded = courierSrc.match(/\w\.items\.(some|map|filter|reduce|forEach|length)/g);
    expect(unguarded || []).toEqual([]);
  });

  test('the flag helpers are imported from the tested module', () => {
    expect(
      wires(courierSrc, "import { daysUntil, getShipmentFlag } from './courierShipmentFlag'")
    ).toBe(true);
  });

  test('the page no longer defines its own copies', () => {
    expect(wires(courierSrc, 'function getShipmentFlag')).toBe(false);
    expect(wires(courierSrc, 'function daysUntil')).toBe(false);
  });
});

describe('#9b — GrantedRoute shows a loading state instead of a blank screen', () => {
  test('the permsLoading branch does not return null', () => {
    const branch = grantedSrc.slice(grantedSrc.indexOf('if(permsLoading)'));
    expect(branch).toMatch(/if\(permsLoading\)\{return\(/);
    expect(branch).not.toMatch(/if\(permsLoading\)\{returnnull;/);
  });

  test('the loading branch renders a progress indicator', () => {
    expect(wires(grantedSrc, 'CircularProgress')).toBe(true);
    expect(wires(grantedSrc, 'role="status"')).toBe(true);
  });

  test('the deliberate legacy-role fallback is untouched — admins are not locked out', () => {
    // Asserted as structure, not as a one-line ternary: prettier is entitled to
    // split this across lines and to wrap the JSX branch in parentheses, and
    // neither changes who gets let in. What must hold is that the condition is
    // the fallbackRoles membership test, and that passing it yields `children`
    // while failing it yields the /unauthorized redirect — in that order.
    const ternary = grantedSrc.match(
      /returnfallbackRoles\.includes\(user\.role\)\?(.{0,200}?);/
    );
    expect(ternary).not.toBeNull();
    const branches = ternary[1];
    const iChildren = branches.indexOf('children');
    const iRedirect = branches.indexOf('<Navigateto="/unauthorized"replace/>');
    expect(iChildren).toBeGreaterThan(-1);
    expect(iRedirect).toBeGreaterThan(-1);
    expect(iChildren).toBeLessThan(iRedirect);
    expect(wires(grantedSrc, 'fallbackRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN]')).toBe(true);
  });

  test('the super-admin and unauthenticated short-circuits still come first', () => {
    const iAuth = grantedSrc.indexOf('if(!isAuthenticated)');
    const iSuper = grantedSrc.indexOf('if(isSuper)');
    const iLoading = grantedSrc.indexOf('if(permsLoading)');
    expect(iAuth).toBeGreaterThan(-1);
    expect(iAuth).toBeLessThan(iSuper);
    expect(iSuper).toBeLessThan(iLoading);
  });
});
