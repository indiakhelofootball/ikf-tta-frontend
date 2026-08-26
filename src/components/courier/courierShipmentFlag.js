// The urgency flag shown on a shipment row, and the day maths behind it.
//
// Extracted from CourierManagementPage.jsx for the usual reason (that component
// pulls in react-router-dom transitively and cannot be imported in a test), and
// for a specific one: this is the "#9 — courier page goes completely blank"
// report.
//
// getShipmentFlag read `shipment.items.some(...)` with no fallback, unlike every
// other item access in that file, which all read `(s.items || [])`. A shipment
// row that arrives without an items array therefore threw during render, and the
// app-level ErrorBoundary blanked the WHOLE page rather than one row. The
// fallback below matches how the rest of the file already reads items.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export function getShipmentFlag(shipment) {
  const days = daysUntil(shipment?.snapTrialDate);
  if (days === null) return null;
  if (['Delivered', 'Returned', 'Lost'].includes(shipment?.status)) return null;
  const hasUnreadyCustom = (shipment?.items || []).some(
    i => i.isCustom && i.productionStatus !== 'Received from Printer'
  );
  if (hasUnreadyCustom && days <= 60) return { level: 'error', msg: `Custom items not ready — trial in ${days}d` };
  if (shipment?.status === 'Draft' && days <= 30) return { level: 'error', msg: `Not dispatched — trial in ${days}d` };
  if (hasUnreadyCustom && days <= 75) return { level: 'warning', msg: `Custom items pending — trial in ${days}d` };
  if (shipment?.status === 'Draft' && days <= 45) return { level: 'warning', msg: `Dispatch soon — trial in ${days}d` };
  return null;
}
