// Unit tests — pure logic, no component import.
// Covers "#5 — while editing numbers in courier it automatically starts with 0,
// even after backspace it doesn't work".
import {
  sanitizeQuantityInput, normalizeQuantity, normalizeItemsForSave, canSaveShipment,
} from './courierItemQuantity';

describe('sanitizeQuantityInput — what the box holds while typing', () => {
  test('THE BUG: backspacing to empty leaves the box empty, not 0', () => {
    expect(sanitizeQuantityInput('')).toBe('');
  });

  test('a whitespace-only box is still empty', () => {
    expect(sanitizeQuantityInput('   ')).toBe('');
  });

  test('typing a digit after clearing gives that digit, not a leading zero', () => {
    expect(sanitizeQuantityInput('3')).toBe(3);
    expect(String(sanitizeQuantityInput('3'))).not.toBe('03');
  });

  test('multi-digit entry is kept whole', () => {
    expect(sanitizeQuantityInput('120')).toBe(120);
  });

  test('an explicit zero is a real value and survives', () => {
    expect(sanitizeQuantityInput('0')).toBe(0);
  });

  test('a negative quantity clamps to zero', () => {
    expect(sanitizeQuantityInput('-4')).toBe(0);
  });

  test('junk that a number input can still emit does not become NaN', () => {
    expect(sanitizeQuantityInput('e')).toBe('');
    expect(sanitizeQuantityInput('--')).toBe('');
  });

  test('null and undefined read as empty', () => {
    expect(sanitizeQuantityInput(null)).toBe('');
    expect(sanitizeQuantityInput(undefined)).toBe('');
  });
});

describe('normalizeQuantity — what a quantity means once editing stops', () => {
  test('an empty box settles to 0 on blur', () => {
    expect(normalizeQuantity('')).toBe(0);
  });

  test('numbers pass through unchanged', () => {
    expect(normalizeQuantity(7)).toBe(7);
    expect(normalizeQuantity('7')).toBe(7);
  });

  test('never returns NaN', () => {
    expect(normalizeQuantity('abc')).toBe(0);
    expect(normalizeQuantity(NaN)).toBe(0);
    expect(normalizeQuantity(undefined)).toBe(0);
  });

  test('negatives clamp to zero', () => {
    expect(normalizeQuantity(-2)).toBe(0);
  });
});

describe('normalizeItemsForSave — the wire format stays numeric', () => {
  test('an item left empty mid-edit reaches the API as a number', () => {
    const out = normalizeItemsForSave([
      { name: 'Cones', quantity: '', remarks: '' },
      { name: 'Bibs', quantity: 4 },
    ]);
    expect(out[0].quantity).toBe(0);
    expect(typeof out[0].quantity).toBe('number');
    expect(out[1].quantity).toBe(4);
  });

  test('every other field on the item is preserved', () => {
    const out = normalizeItemsForSave([
      { name: 'Banner', quantity: '', isCustom: true, productionStatus: 'Sent for Printing', remarks: 'x', zeroReason: '' },
    ]);
    expect(out[0]).toEqual({
      name: 'Banner', quantity: 0, isCustom: true,
      productionStatus: 'Sent for Printing', remarks: 'x', zeroReason: '',
    });
  });

  test('no item leaves with a NaN quantity', () => {
    const out = normalizeItemsForSave([{ name: 'A', quantity: 'e' }, { name: 'B', quantity: undefined }]);
    out.forEach(i => expect(Number.isNaN(i.quantity)).toBe(false));
  });

  test('an empty or missing list is handled', () => {
    expect(normalizeItemsForSave([])).toEqual([]);
    expect(normalizeItemsForSave(undefined)).toEqual([]);
  });

  test('the input array is not mutated', () => {
    const input = [{ name: 'A', quantity: '' }];
    normalizeItemsForSave(input);
    expect(input[0].quantity).toBe('');
  });
});

describe('canSaveShipment — an empty box must not break the save button', () => {
  test('a new shipment with an assignment and items can save even mid-edit', () => {
    expect(canSaveShipment({ editingId: null, assignmentId: 'a1', items: [{ quantity: '' }] })).toBe(true);
  });

  test('a new shipment with no assignment cannot save', () => {
    expect(canSaveShipment({ editingId: null, assignmentId: '', items: [{ quantity: 1 }] })).toBe(false);
  });

  test('an edit does not need a live assignment', () => {
    expect(canSaveShipment({ editingId: 9, assignmentId: '', items: [{ quantity: 1 }] })).toBe(true);
  });

  test('no item rows at all still blocks the save', () => {
    expect(canSaveShipment({ editingId: 9, assignmentId: 'a1', items: [] })).toBe(false);
    expect(canSaveShipment({ editingId: 9, assignmentId: 'a1', items: undefined })).toBe(false);
  });
});
