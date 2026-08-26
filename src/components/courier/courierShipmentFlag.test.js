// Unit tests — pure logic, no component import.
// Covers "#9 — in courier everything went blank, repetitive": a shipment row
// without an items array threw inside getShipmentFlag during render, and the
// app-level ErrorBoundary blanked the whole page.
import { daysUntil, getShipmentFlag } from './courierShipmentFlag';

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('daysUntil', () => {
  test('no date is not a number of days', () => {
    expect(daysUntil('')).toBeNull();
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
  });

  test('a future date counts forward', () => {
    expect(daysUntil(inDays(10))).toBeGreaterThan(8);
    expect(daysUntil(inDays(10))).toBeLessThanOrEqual(11);
  });

  test('a past date counts negative', () => {
    expect(daysUntil(inDays(-10))).toBeLessThan(0);
  });
});

describe('getShipmentFlag — malformed rows must not throw', () => {
  test('THE BUG: a shipment with no items array returns a flag instead of throwing', () => {
    expect(() => getShipmentFlag({ status: 'Draft', snapTrialDate: inDays(10) })).not.toThrow();
    expect(getShipmentFlag({ status: 'Draft', snapTrialDate: inDays(10) })).toEqual({
      level: 'error', msg: expect.stringContaining('Not dispatched'),
    });
  });

  test('items explicitly null does not throw', () => {
    expect(() => getShipmentFlag({ status: 'Draft', items: null, snapTrialDate: inDays(10) })).not.toThrow();
  });

  test('an entirely empty object does not throw', () => {
    expect(() => getShipmentFlag({})).not.toThrow();
    expect(getShipmentFlag({})).toBeNull();
  });

  test('undefined does not throw', () => {
    expect(() => getShipmentFlag(undefined)).not.toThrow();
    expect(getShipmentFlag(undefined)).toBeNull();
  });
});

describe('getShipmentFlag — the flag rules themselves are unchanged', () => {
  const custom = [{ isCustom: true, productionStatus: 'Pending' }];
  const ready = [{ isCustom: true, productionStatus: 'Received from Printer' }];

  test('no trial date means no flag', () => {
    expect(getShipmentFlag({ status: 'Draft', items: custom, snapTrialDate: '' })).toBeNull();
  });

  test('terminal statuses never flag', () => {
    ['Delivered', 'Returned', 'Lost'].forEach(status => {
      expect(getShipmentFlag({ status, items: custom, snapTrialDate: inDays(1) })).toBeNull();
    });
  });

  test('unready custom items inside 60 days are an error', () => {
    const f = getShipmentFlag({ status: 'Dispatched', items: custom, snapTrialDate: inDays(30) });
    expect(f.level).toBe('error');
    expect(f.msg).toContain('Custom items not ready');
  });

  test('unready custom items inside 75 days are a warning', () => {
    const f = getShipmentFlag({ status: 'Dispatched', items: custom, snapTrialDate: inDays(70) });
    expect(f.level).toBe('warning');
    expect(f.msg).toContain('Custom items pending');
  });

  test('a draft inside 30 days is an error', () => {
    const f = getShipmentFlag({ status: 'Draft', items: ready, snapTrialDate: inDays(20) });
    expect(f.level).toBe('error');
    expect(f.msg).toContain('Not dispatched');
  });

  test('a draft inside 45 days is a warning', () => {
    const f = getShipmentFlag({ status: 'Draft', items: ready, snapTrialDate: inDays(40) });
    expect(f.level).toBe('warning');
    expect(f.msg).toContain('Dispatch soon');
  });

  test('a distant dispatched shipment with ready items has nothing to say', () => {
    expect(getShipmentFlag({ status: 'Dispatched', items: ready, snapTrialDate: inDays(200) })).toBeNull();
  });
});
