// Who may delete a shipment, and what the control says.
//
// Extracted from CourierManagementPage.jsx so it can be tested: that component
// imports useGrants -> AuthContext -> react-router-dom, which CRA's Jest
// resolver cannot load, so anything left inside it is untestable. Same reason
// paymentAuditTotals.js, tdsDueDate.js and csrContractRules.js are separate
// modules.
//
// This is the "#7 / TC-CUR-06 — super admin cannot delete a dispatched entry"
// report. The delete control used to live inside the `status === 'Draft'`
// block gated on canEditCourier, so no delete existed on Dispatched / In
// Transit / Delivered / Returned / Lost rows for anyone, super admin included.
//
// The rule below mirrors courier/views.py:63-74, which soft-deletes any status
// for a super admin and returns 400 "Only Draft shipments can be deleted." to
// everyone else. Showing a control the backend refuses, or hiding one it
// accepts, are the two ways this drifts — so the predicate is stated once.
export const canDeleteShipment = ({ isSuper, canEditCourier, status }) => {
  if (isSuper) return true;
  return Boolean(canEditCourier) && status === 'Draft';
};

// Deletion is a soft delete either way — the row moves to the Deleted view and
// a super admin can restore it. The tooltip names which of the two rules the
// viewer is using, so a non-Draft delete does not read as an ordinary one.
export const deleteShipmentTooltip = (status) => (
  status === 'Draft' ? 'Delete draft' : `Delete shipment (${status}) — super admin`
);
