/**
 * Shared PDF builder for the Utilisation Certificate.
 *
 * Two screens download this document:
 *  - ClientPortalPage (funder side) — reads only what /api/client/certificate/
 *    returns, which is a server-side allowlist with no vendor names and no
 *    payment ids. That is a deliberate isolation boundary, not an oversight,
 *    and this module must not let the frontend reach around it.
 *  - CSRProjectDetailPage (internal side) — reads the fuller
 *    /csr/projects/:id/utilisation-certificate/ payload, which legitimately
 *    carries a Source column per line item and an out-of-period count.
 *
 * Both were near-duplicate inline functions before this file existed. The
 * difference between them is modelled explicitly with a `variant`, not
 * papered over: `funder` renders a fixed two-column table and never reads
 * `x.source` off a line item even if one is present on the object handed in.
 * `internal` renders the extra Source column and the out-of-period note.
 *
 * This is a document that gets filed, so nothing here computes a total —
 * every figure printed is one the server already computed.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const CERTIFICATE_VARIANTS = ['funder', 'internal'];

/** Indian grouping, 2dp, INR label — `formatMoney(150000)` → `INR 1,50,000.00`. */
export function formatMoney(value) {
  const n = Number(value || 0);
  return `INR ${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * A grant with an open-ended period ("periodStart"/"periodEnd" both null,
 * which the backend explicitly allows) reads as an open range, never as the
 * literal string "null" or a parsed "Invalid Date".
 */
export function formatPeriod(cert, { openText } = {}) {
  const { periodStart, periodEnd } = cert || {};
  if (!periodStart && !periodEnd) {
    return openText || 'Period: not stated on the project';
  }
  return `Period: ${periodStart || 'project inception'} to ${periodEnd || 'date'}`;
}

/**
 * A line item's own date, as the server sent it (`YYYY-MM-DD`) or an em dash.
 * Printed verbatim rather than reformatted: this is a filed document, the
 * server already decided which date each line carries, and re-parsing an ISO
 * date in the browser is how a certificate ends up a day out in one timezone.
 * A certificate frozen before this field existed has no `date` on its lines,
 * and must still print.
 */
export function formatLineDate(value) {
  return value || '—';
}

/** Filesystem-safe file stem: strips characters Windows/macOS/Linux all reject. */
export function sanitizeFileNamePart(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');
  return cleaned || 'grant';
}

/**
 * `utilisation_certificate_<project>_<projectId>_v<version>.pdf` — the id and
 * version keep two projects that happen to share a display name, or two
 * versions of the same certificate, from silently overwriting one another in
 * a downloads folder.
 */
export function certificateFileName(cert) {
  const stem = sanitizeFileNamePart(cert?.projectName);
  const id = cert?.projectId != null ? `_${cert.projectId}` : '';
  const version = cert?.certificateVersion != null ? `_v${cert.certificateVersion}` : '';
  return `utilisation_certificate_${stem}${id}${version}.pdf`;
}

/**
 * Builds the jsPDF document for one certificate. Pure with respect to the
 * DOM — nothing here saves a file, so it is testable by inspecting the calls
 * made against the mocked jsPDF instance.
 *
 * @param {Object} cert     the certificate payload from either endpoint
 * @param {Object} opts
 * @param {'funder'|'internal'} [opts.variant]  which side is rendering
 */
// The table is split out as a pure function because it carries the isolation
// guarantee, and a guarantee that can only be checked through a mocked PDF
// library is a guarantee nobody can check. jspdf-autotable ships an `exports`
// map with no CJS entry, so jest registers a mock for it under a different key
// than this module resolves — the mock silently never applies. Returning the
// spec instead lets the funder/internal split be asserted directly.
export function buildCertificateTable(cert, { variant = 'funder' } = {}) {
  const isInternal = variant === 'internal';
  const c = cert || {};
  const lineItems = Array.isArray(c.lineItems) ? c.lineItems : [];
  // The Date column is on BOTH variants. The document already states the grant
  // period it is filed for; without a date per line, a reader has to take on
  // trust that every line falls inside it. It is served to the funder
  // deliberately (client_serializers.CLIENT_CERTIFICATE_LINE_FIELDS) — it is
  // the date of their own grant spend, not a payment reference and not a
  // vendor, so it crosses none of the lines the funder variant exists to hold.
  const head = isInternal
    ? [['Date', 'Source', 'Note', 'Amount']]
    : [['Date', 'Expense', 'Amount']];
  // The funder variant reads only `date`, `note` and `amount` off each line
  // item — structurally incapable of surfacing a vendor/source/payment field
  // even when the object handed in happens to carry one.
  const body = lineItems.length > 0
    ? lineItems.map((x) => (isInternal
      ? [formatLineDate(x.date), x.source || 'Manual', x.note || '', formatMoney(x.amount)]
      : [formatLineDate(x.date), x.note || 'Expense', formatMoney(x.amount)]))
    : [isInternal
      ? ['—', '—', 'No expenses are recorded against this grant.', formatMoney(0)]
      : ['—', 'No expenses are recorded against this grant.', formatMoney(0)]];
  return { head, body };
}

export function buildCertificateDoc(cert, { variant = 'funder' } = {}) {
  const isInternal = variant === 'internal';
  const c = cert || {};
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Utilisation Certificate', 14, 18);
  doc.setFontSize(10);

  let y = 28;
  const line = (text) => { doc.text(text, 14, y); y += 6; };

  // The kind of certificate, directly under the title. Printed only when the
  // grant has one: a certificate frozen before the type existed, or a grant
  // nobody typed, omits the line rather than printing a blank or "null".
  const certificateType = typeof c.utilisationType === 'string' ? c.utilisationType.trim() : '';
  if (certificateType) line(`Certificate type: ${certificateType}`);

  line(`Project: ${c.projectName || ''}`);
  line(`${isInternal ? 'Client / Funder' : 'Funder'}: ${c.clientName || ''}`);
  line(`${isInternal ? 'Sanctioned' : 'Contribution'}: ${formatMoney(c.sanctionedAmount)}`);
  line(`Total Utilised: ${formatMoney(c.totalUtilised)}`);
  line(formatPeriod(c, {
    openText: isInternal
      ? 'Period: not stated on the project — covers all tagged expenses'
      : undefined,
  }));

  // A certificate that does not say whether it is frozen, and as of when, is
  // a statutory document with no way to tell a filed copy from a moving one.
  // The funder endpoint only ever serves a frozen snapshot (the project must
  // be Closed for it to exist at all), so a funder cert with no explicit
  // `frozen` flag is treated as frozen; the internal side carries the flag
  // because it can legitimately show a still-live total.
  const frozen = isInternal ? Boolean(c.frozen) : (c.frozen !== false);
  const frozenAtText = c.frozenAt
    ? new Date(c.frozenAt).toLocaleString('en-IN')
    : 'project close';
  const stamp = frozen
    ? `Frozen v${c.certificateVersion ?? '—'} — figures as at ${frozenAtText}`
    : 'Live — figures may still change';
  line(stamp);

  // Out-of-period exclusions are internal-only information: the funder
  // payload has no such field, and even if it somehow carried one, the
  // funder variant must not print it.
  if (isInternal && Number(c.outOfPeriodCount) > 0) {
    line(`${c.outOfPeriodCount} tagged expense(s) fall outside this period and are not included.`);
  }

  autoTable(doc, { startY: y + 4, ...buildCertificateTable(c, { variant }) });

  return doc;
}

/** Builds the document and triggers the browser download. */
export function downloadCertificatePdf(cert, opts = {}) {
  const doc = buildCertificateDoc(cert, opts);
  doc.save(certificateFileName(cert));
  return doc;
}

export default downloadCertificatePdf;
