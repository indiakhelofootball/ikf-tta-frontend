import React, { useState } from 'react';

// Shown under a Planned activity whose date has passed (the server's
// needsUpdate). Completed and Cancelled each save the status alone; a new
// date needs the full form.
export default function DatePassedPrompt({ activity, onSetStatus, onChangeDate }) {
  const [busy, setBusy] = useState(false);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await onSetStatus(activity, status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ldetail">
      <div className="dfull" role="group" aria-label={`Date passed for ${activity.title}`}>
        <span className="dv">Date passed — did this happen?</span>
        <div className="pform-actions">
          <button
            type="button" className="ghostbtn tight" disabled={busy}
            onClick={() => setStatus('Completed')}
          >
            Mark completed
          </button>
          <button
            type="button" className="ghostbtn tight" disabled={busy}
            onClick={() => setStatus('Cancelled')}
          >
            Cancelled
          </button>
          <button
            type="button" className="ghostbtn tight" disabled={busy}
            onClick={() => onChangeDate(activity)}
          >
            Change date
          </button>
        </div>
      </div>
    </div>
  );
}
