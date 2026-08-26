// Courier item quantity: what the box holds while you type, and what the API gets.
//
// Extracted from CourierManagementPage.jsx so it can be tested — that component
// imports useGrants -> AuthContext -> react-router-dom, which CRA's Jest
// resolver cannot load. Same reason courierDeletePermission.js is separate.
//
// This is the "#5 — quantity cannot be cleared" report. The field was a
// controlled type="number" whose onChange ran Number(e.target.value): backspacing
// to empty gives Number('') === 0, so the box re-rendered as 0 and could never be
// emptied, and typing after it left a stray leading zero.
//
// The fix is to let the field hold '' while editing and coerce only on blur and
// on save. Quantity therefore has TWO shapes and both are named here:
//   - editing shape: '' or a number, whatever keeps the box honest as you type
//   - wire shape:    always a number, because the API contract is unchanged

// What the box should hold after a keystroke. '' is a legitimate intermediate
// state — an operator halfway through replacing 12 with 3 has emptied the box.
export function sanitizeQuantityInput(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return '';
  const n = Number(s);
  if (!Number.isFinite(n)) return '';
  return n < 0 ? 0 : n;
}

// What a quantity means once editing stops. Empty means zero — the same value
// makeCourierItem gives Volunteer Tshirts — never NaN, which would reach the API.
export function normalizeQuantity(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n;
}

// The wire format is unchanged: every item leaves with a numeric quantity.
export function normalizeItemsForSave(items) {
  return (items || []).map((it) => ({ ...it, quantity: normalizeQuantity(it.quantity) }));
}

// The save guard. An empty quantity box mid-edit must not disable saving — only
// the two things that genuinely block a save do: a new shipment with no
// assignment, and a shipment with no item rows at all.
export function canSaveShipment({ editingId, assignmentId, items }) {
  if (!editingId && !assignmentId) return false;
  return (items || []).length > 0;
}
