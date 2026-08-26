// Regression tests for "#7 / TC-CUR-06 — super admin could not delete a
// dispatched courier entry".
//
// The delete control sat inside the `status === 'Draft'` branch, gated on
// canEditCourier, so on Dispatched / In Transit / Delivered / Returned / Lost
// rows there was no delete for anyone — while courier/views.py:63-74 has always
// soft-deleted any status for a super admin and refused non-Draft for everyone
// else. The screen was stricter than the backend, with no way to reach the
// behaviour the backend already allowed.

import fs from 'fs';
import path from 'path';
import { canDeleteShipment, deleteShipmentTooltip } from './courierDeletePermission';

// Every status STATUS_CONFIG defines. The last test asserts this list still
// matches the component, so a new status cannot quietly escape the matrix.
const STATUSES = ['Draft', 'Dispatched', 'In Transit', 'Delivered', 'Returned', 'Lost'];
const NON_DRAFT = STATUSES.filter((s) => s !== 'Draft');

describe('canDeleteShipment — mirrors courier/views.py:63-74', () => {
  test.each(STATUSES)('super admin may delete a %s shipment', (status) => {
    expect(canDeleteShipment({ isSuper: true, canEditCourier: true, status })).toBe(true);
  });

  test.each(STATUSES)('super admin may delete a %s shipment even without edit rights', (status) => {
    // is_super_admin is checked on its own in the backend; edit rights are a
    // separate module grant and must not be able to take the delete away.
    expect(canDeleteShipment({ isSuper: true, canEditCourier: false, status })).toBe(true);
  });

  test('non-super with edit rights may delete a Draft', () => {
    expect(canDeleteShipment({ isSuper: false, canEditCourier: true, status: 'Draft' })).toBe(true);
  });

  test.each(NON_DRAFT)('THE REPORTED RULE: non-super may not delete a %s shipment', (status) => {
    expect(canDeleteShipment({ isSuper: false, canEditCourier: true, status })).toBe(false);
  });

  test.each(STATUSES)('no edit rights and not super means no delete on %s', (status) => {
    expect(canDeleteShipment({ isSuper: false, canEditCourier: false, status })).toBe(false);
  });

  test('missing grants are treated as absent, not as permission', () => {
    expect(canDeleteShipment({ status: 'Draft' })).toBe(false);
    expect(canDeleteShipment({ isSuper: undefined, canEditCourier: undefined, status: 'Dispatched' }))
      .toBe(false);
  });

  test('an unknown status is not a loophole for a non-super', () => {
    expect(canDeleteShipment({ isSuper: false, canEditCourier: true, status: 'Nonsense' })).toBe(false);
    expect(canDeleteShipment({ isSuper: false, canEditCourier: true, status: undefined })).toBe(false);
  });
});

describe('deleteShipmentTooltip', () => {
  test('a Draft delete reads as ordinary, a non-Draft names the rule being used', () => {
    expect(deleteShipmentTooltip('Draft')).toBe('Delete draft');
    expect(deleteShipmentTooltip('Dispatched')).toBe('Delete shipment (Dispatched) — super admin');
    expect(deleteShipmentTooltip('In Transit')).toBe('Delete shipment (In Transit) — super admin');
  });
});

// CourierManagementPage.jsx reaches react-router-dom through useGrants ->
// AuthContext, so CRA's Jest resolver cannot import it and the row cannot be
// rendered. The predicate alone cannot show WHERE the control sits, and the bug
// was entirely a placement bug — the gate was fine, it was nested inside the
// Draft branch. Reading the source is the only way to assert that.
describe('CourierManagementPage wiring', () => {
  const src = fs.readFileSync(path.join(__dirname, 'CourierManagementPage.jsx'), 'utf8');

  test('exactly ONE delete control per row', () => {
    // A super admin looking at a Draft satisfies both the old Draft-only gate
    // and the new one; two delete buttons on one row would be the obvious
    // wrong way to fix this.
    // (The other <DeleteIcon> in this file removes an item row inside the
    // shipment modal, so the shipment delete is counted by its handler.)
    const calls = src.match(/onClick=\{\(\) => handleDeleteShipment\(s\)\}/g) || [];
    expect(calls).toHaveLength(1);
  });

  test('the delete control is gated by the shared predicate, not an inline copy', () => {
    expect(src).toMatch(/canDeleteShipment\(\{\s*isSuper,\s*canEditCourier,\s*status:\s*s\.status\s*\}\)/);
    expect(src).not.toMatch(/isSuper \|\| \(canEditCourier && s\.status === 'Draft'\)/);
  });

  test('the delete control sits outside the Draft-only block', () => {
    // The original bug: the button was inside `{s.status === 'Draft' && (`, so
    // it could never render on a dispatched row whatever the gate said.
    const draftBlock = src.indexOf("{s.status === 'Draft' && (");
    const dispatchedBlock = src.indexOf("{['Dispatched', 'In Transit'].includes(s.status) && (");
    const deleteControl = src.indexOf('onClick={() => handleDeleteShipment(s)}');
    expect(draftBlock).toBeGreaterThan(-1);
    expect(dispatchedBlock).toBeGreaterThan(draftBlock);
    expect(deleteControl).toBeGreaterThan(dispatchedBlock);
  });

  test('the status matrix above covers every status the screen defines', () => {
    const block = src.match(/const STATUS_CONFIG = \{[\s\S]*?\n\};/);
    expect(block).not.toBeNull();
    const defined = [];
    const key = /^\s*('?)([A-Za-z ]+?)\1:\s*\{/gm;
    let m = key.exec(block[0]);
    while (m) { defined.push(m[2]); m = key.exec(block[0]); }
    expect(new Set(defined)).toEqual(new Set(STATUSES));
  });
});
