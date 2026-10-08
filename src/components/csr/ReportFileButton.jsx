import React, { useState } from 'react';

import { csrAPI } from '../../services/api';
import { openDownloadedFile } from '../../utils/reportFile';

// The download action for a report's uploaded copy, in a row that is itself
// clickable — so the click stops here and never opens the row.
export default function ReportFileButton({ report, onError }) {
  const [busy, setBusy] = useState(false);
  if (!report?.hasFile) return null;
  const name = report.uploadedFileName || 'report';

  const download = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      openDownloadedFile(await csrAPI.reportFile.download(report.id), name);
    } catch (err) {
      if (onError) onError(err?.message || 'Could not download the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="t1file"
      title={`Download ${name}`}
      aria-label={`Download uploaded file ${name}`}
      onClick={download}
      onKeyDown={(e) => e.stopPropagation()}
      disabled={busy}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <path d="M7 10l5 5 5-5M12 15V3" />
      </svg>
    </button>
  );
}
