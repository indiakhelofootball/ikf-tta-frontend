// src/components/csr/CSRUtilisationPage.jsx
// Utilisation Certificate, across every grant — the fifth sidebar destination
// from the 28 May visual flow. One row per grant, each row the same figures the
// per-project certificate and its PDF report.
//
// WHAT THIS PAGE IS: the ledger. Every figure here comes from the server's
// certificate endpoint, never from a browser-side sum of expense tags — the
// endpoint already applies the 'Payment Done' rule, and a second implementation
// would eventually disagree with a document a funder has already filed.
//
// THE DEFECT THIS PAGE FIXES. `totalUtilised` counts only tags whose payment
// actually completed. Tags sitting at Draft, Sent to Accounts or Bounced come
// back in `excludedItems` and are counted NOWHERE. A screen that shows the total
// alone reports a number that is correct and a shortfall that is invisible — and
// a bounced payment is someone's job to fix. So both figures are on every row,
// and the excluded one is never collapsed into a footnote.
//
// SHAPE. One row per grant, in the same coloured table every other list in the
// module uses (.twrap / .lgrid / .lrow) — the owner's "tabulated everywhere with
// the coloured one". The four figures a card used to stack vertically are now
// four columns that line up down the page, which is the whole point of a ledger:
// you can compare grant to grant without reading each block in turn.
//
// WHAT STAYS ON THE ROW. `totalUtilised` and the excluded amount, per the defect
// note above — the excluded figure is a column, never a footnote. Sanctioned,
// the percentage, the line-item count and the out-of-period note are the
// second-order reading and open in the row's detail, the same disclosure the
// activities log uses.
//
// COLOUR is the table's now, not this page's: the identity band on the 4th cell
// marks which grant a row is about, and the head band is the module's. The one
// page-specific ink left is on the summary panel at the top, which is not a list
// and keeps its own treatment.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import useGrants from '../../auth/useGrants';
import { ttaProjectIdentity } from './CSRProjectDetailView';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { certificateFreezeState } from './csrContractRules';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const num = (v) => Number(v) || 0;
const rupees = (v) => `₹${num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// Five rows a page, fixed. The portfolio totals above the table are summed
// over the whole filtered set regardless — a ledger total that changed as you
// paged would be worse than useless.
const PAGE_SIZE = 5;


export default function CSRUtilisationPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();
  // Reading the certificate is unlocked by either grant — MODULE_DEPENDENCIES
  // maps 'csr' to read access on 'csr_certificate'. Tagging still needs the
  // stricter grant, and nothing on this page tags.
  const allowed = canView('csr_certificate') || canView('csr');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Which rows have their second-order figures open. A Set so several grants
  // can be compared at once without reopening the first.
  const [open, setOpen] = useState(() => new Set());
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const projects = asList(await csrAPI.projects.getAll());
      // One certificate request per grant. There is no bulk endpoint, and the
      // per-project one is the only server-authoritative source — so a failure
      // on one grant leaves that row marked unavailable rather than taking the
      // whole page down with it.
      const certs = await Promise.all(
        projects.map((p) => csrAPI.utilisationCertificate(p.id).catch(() => null)),
      );
      setRows(projects.map((p, i) => ({ project: p, cert: certs[i] })));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load utilisation.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { if (allowed) load(); }, [load, allowed]);
  useRefetchOnFocus(() => { if (allowed) load(true); });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ project }) => [project.name, project.clientName, ttaProjectIdentity(project)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, search]);

  // Portfolio totals. Both halves, for the same reason each row carries both.
  const totals = useMemo(() => visible.reduce((acc, { project, cert }) => {
    const excluded = (cert?.excludedItems || []).reduce((s, x) => s + num(x.amount), 0);
    return {
      sanctioned: acc.sanctioned + num(project.sanctionedAmount),
      utilised: acc.utilised + num(cert?.totalUtilised),
      excluded: acc.excluded + excluded,
      excludedCount: acc.excludedCount + (cert?.excludedItems || []).length,
    };
  }, { sanctioned: 0, utilised: 0, excluded: 0, excludedCount: 0 }), [visible]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // safePage, not page: a refetch can return fewer grants than the page being
  // read, and page 4 of a two-page ledger must never render as an empty table.
  const safePage = Math.min(page, pageCount);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeFrom = visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(safePage * PAGE_SIZE, visible.length);
  // A single row reads "Showing 1 of 1", not "Showing 1-1 of 1".
  const rangeLabel = rangeFrom === rangeTo ? `${rangeFrom}` : `${rangeFrom}-${rangeTo}`;

  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  // Searching starts the reader at the top of the new result set, rather than
  // on a page that set does not have.
  useEffect(() => { setPage(1); }, [search]);

  if (!allowed) {
    return <Alert severity="warning">You do not have access to the utilisation certificate.</Alert>;
  }

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          {/* "Work Utilisation", the client's own words on 26 Aug (19:53:
              "इसको work utilization लिख दो"). The certificate is what this
              screen PRODUCES; the utilisation of work is what it shows. */}
          <h2>Work Utilisation</h2>
          <p>
            Every grant, with what has actually been spent against it. Only
            expenses whose payment has completed are counted &mdash; anything
            tagged but still in flight is shown separately, never folded into
            the total.
          </p>
        </div>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && (
        <div className="panel utot">
          <div className="utot-v fig">{rupees(totals.utilised)}</div>
          <div className="utot-k">
            counted as utilised, of {rupees(totals.sanctioned)} sanctioned across{" "}
            {visible.length} {visible.length === 1 ? "grant" : "grants"}
          </div>
          {totals.excludedCount > 0 && (
            <div className="utot-warn">
              {rupees(totals.excluded)} tagged across {totals.excludedCount}{" "}
              {totals.excludedCount === 1 ? "expense" : "expenses"} is not
              counted &mdash; the payment has not completed.
            </div>
          )}
        </div>
      )}

      <div className="toolbar">
        <label className="sb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            placeholder="Search grant or funder"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          {/* Column order is set by the table's identity band, which lands on
              the 4th cell: the grant is what a row is about, so the grant name
              sits there. The funder still leads the row in .t1 — 26 Aug review,
              04:35, "BDSA तुम्हारा prime रहेगा" — and the grant name stays the
              secondary string, exactly as it was on the card. */}
          <div className="lgrid lgrid-head">
            {/* .lnum is the numeric-cell role: right-aligned, tabular figures.
                It goes on the heading as well as the cell, or the label floats
                left of the column of digits it names. Money reads right-aligned
                because that is how place value lines up for comparison down a
                column -- these figures end up in a funder's utilisation
                certificate and get checked against each other. */}
            {[
              { h: 'Utilised', num: true },
              { h: 'Funder' },
              { h: 'Not counted', num: true },
              { h: 'Grant' },
              { h: 'Certificate' },
            ].map(({ h, num }) => (
              <span key={h} className={num ? 'lnum' : undefined}>{h}</span>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <h3>{rows.length === 0 ? "No grants yet" : "No grants match"}</h3>
              {rows.length === 0
                ? "A utilisation certificate is drawn from the payments tagged to a grant."
                : "Clear the search."}
            </div>
          ) : pageRows.map(({ project, cert }) => {
            const freeze = certificateFreezeState(project);
            const sanctioned = num(project.sanctionedAmount);
            const utilised = num(cert?.totalUtilised);
            const excludedItems = cert?.excludedItems || [];
            const excluded = excludedItems.reduce((sum, x) => sum + num(x.amount), 0);
            const pct = sanctioned > 0 ? (utilised / sanctioned) * 100 : 0;
            const over = sanctioned > 0 && utilised > sanctioned;
            const funder = project.clientName || "Funder not recorded";
            const isOpen = open.has(project.id);
            const openGrant = () => navigate(`/csr/${project.id}`);

            return (
              <div className="lwrap" key={project.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className="lgrid lrow"
                  aria-label={`Open ${project.name}, funded by ${funder}`}
                  onClick={openGrant}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openGrant();
                    }
                  }}
                >
                  <span className="fig nowrap lnum">
                    {cert === null ? "Unavailable" : rupees(utilised)}
                  </span>
                  <span className="t1">{funder}</span>
                  {/* Both figures are on every row, per the defect note at the
                      top of this file: a total shown alone reports a correct
                      number and an invisible shortfall. This one is a column,
                      never a disclosure. */}
                  <span className="fig nowrap lnum">
                    {cert === null ? "—" : rupees(excluded)}
                  </span>
                  <span className="t2">{project.name}</span>
                  <span className="lend">
                    <span className={`pill ${freeze.frozen ? "frozen" : "closed"}`}>
                      {freeze.frozen ? `Frozen · v${freeze.version}` : "Live"}
                    </span>
                    <button
                      type="button"
                      className={`xpand${isOpen ? ' on' : ''}`}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} certificate figures for ${project.name}`}
                      onClick={(e) => { e.stopPropagation(); toggle(project.id); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                           strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </span>
                </div>

                {isOpen && (
                  <div className="ldetail">
                    {cert === null ? (
                      <div>
                        <span className="dk">Certificate</span>
                        <span className="dv">Figures are unavailable for this grant.</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="dk">Sanctioned</span>
                          <span className="dv fig">{rupees(sanctioned)}</span>
                        </div>
                        <div>
                          <span className="dk">Against sanction</span>
                          <span className="dv fig">
                            {sanctioned > 0
                              ? `${pct.toFixed(1)}%`
                              : "No sanctioned amount recorded"}
                            {over && " — over sanction"}
                          </span>
                        </div>
                        <div>
                          <span className="dk">Not counted</span>
                          <span className="dv">
                            {excludedItems.length === 1
                              ? `${rupees(excluded)} across 1 expense`
                              : `${rupees(excluded)} across ${excludedItems.length} expenses`}
                          </span>
                        </div>
                        <div>
                          <span className="dk">Line items on the certificate</span>
                          <span className="dv fig">{(cert.lineItems || []).length}</span>
                        </div>
                        {/* Which TTA project this grant funds. Neutral, not
                            inked: an identity is not money, a promise or a
                            decision. */}
                        <div>
                          <span className="dk">TTA project</span>
                          <span className="dv">{ttaProjectIdentity(project) || "Not linked yet"}</span>
                        </div>
                        {/* A tag outside the grant period is a third way for
                            money to go missing from the total. Reported, not
                            coloured: it is a period question, not an exception
                            to act on today. */}
                        <div>
                          <span className="dk">Outside the grant period</span>
                          <span className="dv">
                            {num(cert.outOfPeriodCount) > 0
                              ? `${cert.outOfPeriodCount} tagged ${
                                num(cert.outOfPeriodCount) === 1 ? "expense is" : "expenses are"
                              } not included${
                                (cert.periodStart || cert.periodEnd)
                                  ? ` (${cert.periodStart || "inception"} to ${cert.periodEnd || "date"})`
                                  : ""
                              }`
                              : "None"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {visible.length > 0 && (
            <div className="tfoot">
              {/* The count states what is on screen, then what it is a slice
                  of. The portfolio totals above stay over the whole filtered
                  set — only this line follows the page. */}
              <span className="cnt">
                Showing {rangeLabel} of {visible.length}
                {visible.length === rows.length
                  ? ` ${rows.length === 1 ? 'grant' : 'grants'}`
                  : ` matching, of ${rows.length} grants`}
              </span>
              {pageCount > 1 && (
                <nav className="tfoot-pager" aria-label="Pagination">
                  <button
                    type="button"
                    className="ghostbtn tight"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Previous
                  </button>
                  <span className="pgr-status" aria-live="polite">
                    Page {safePage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    className="ghostbtn tight"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage >= pageCount}
                  >
                    Next
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
