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
// COLOUR. Four inks, each doing exactly its own job:
//   moss   — money utilised, the counted total and the progress bar
//   indigo — the sanctioned amount: what the funder promised
//   clay   — tagged but not counted, and any overspend. Needs a decision.
//   teal   — the funder's name. The one outward-facing thing on the row.
//   plum   — a closed grant's frozen certificate: the figures no longer move.

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

  if (!allowed) {
    return <Alert severity="warning">You do not have access to the utilisation certificate.</Alert>;
  }

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Utilisation Certificate</h2>
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
      ) : visible.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h3>{rows.length === 0 ? "No grants yet" : "No grants match"}</h3>
            {rows.length === 0
              ? "A utilisation certificate is drawn from the payments tagged to a grant."
              : "Clear the search."}
          </div>
        </div>
      ) : (
        <div className="ucards">
          {visible.map(({ project, cert }) => {
            const freeze = certificateFreezeState(project);
            const sanctioned = num(project.sanctionedAmount);
            const utilised = num(cert?.totalUtilised);
            const excludedItems = cert?.excludedItems || [];
            const excluded = excludedItems.reduce((sum, x) => sum + num(x.amount), 0);
            const pct = sanctioned > 0 ? (utilised / sanctioned) * 100 : 0;
            const over = sanctioned > 0 && utilised > sanctioned;

            return (
              <button
                key={project.id}
                type="button"
                className="panel ucard"
                aria-label={`Open ${project.name}`}
                onClick={() => navigate(`/csr/${project.id}`)}
              >
                <span className="ucard-head">
                  <span className="ucard-id">
                    <span className="ucard-n">{project.name}</span>
                    <span className="ucard-f">{project.clientName || "Funder not recorded"}</span>
                    {/* Which TTA project this grant funds. Neutral, not inked:
                        an identity is not money, a promise or a decision. */}
                    {ttaProjectIdentity(project) && (
                      <span className="ucard-t">{ttaProjectIdentity(project)}</span>
                    )}
                  </span>
                  <span className={`pill ${freeze.frozen ? "frozen" : "closed"}`}>
                    {freeze.frozen ? `Frozen · v${freeze.version}` : "Live"}
                  </span>
                </span>

                {cert === null ? (
                  <span className="ucard-na">Certificate figures are unavailable for this grant.</span>
                ) : (
                  <>
                    <span className="ufigs">
                      <span className="ufig">
                        <span className={`uv fig ${over ? "over" : "good"}`}>{rupees(utilised)}</span>
                        <span className="uk">utilised, counted</span>
                      </span>
                      <span className="ufig">
                        <span className="uv fig">{rupees(sanctioned)}</span>
                        <span className="uk">sanctioned</span>
                      </span>
                      <span className="ufig">
                        <span className={`uv fig ${excluded > 0 ? "over" : ""}`}>{rupees(excluded)}</span>
                        <span className="uk">
                          {excludedItems.length === 1
                            ? "tagged, not counted (1 expense)"
                            : `tagged, not counted (${excludedItems.length} expenses)`}
                        </span>
                      </span>
                      <span className="ufig">
                        <span className="uv fig">{(cert.lineItems || []).length}</span>
                        <span className="uk">line items on the certificate</span>
                      </span>
                    </span>

                    {/* The bar reads against the sanctioned amount, so a grant
                        that has overspent shows a full clay bar rather than a
                        moss one that quietly stops at 100%. */}
                    <span className="utrack">
                      <span
                        className={`ufill ${over ? "over" : ""}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </span>
                    <span className="ucard-pc fig">
                      {sanctioned > 0
                        ? `${pct.toFixed(1)}% of the sanctioned amount`
                        : "No sanctioned amount recorded"}
                      {over && " — over sanction"}
                    </span>

                    {/* A tag outside the grant period is a third way for money
                        to go missing from the total. Reported, not coloured: it
                        is a period question, not an exception to act on today. */}
                    {num(cert.outOfPeriodCount) > 0 && (
                      <span className="ucard-oop">
                        {cert.outOfPeriodCount} tagged{" "}
                        {num(cert.outOfPeriodCount) === 1 ? "expense falls" : "expenses fall"}{" "}
                        outside the grant period
                        {(cert.periodStart || cert.periodEnd) &&
                          ` (${cert.periodStart || "inception"} to ${cert.periodEnd || "date"})`}
                        {" "}and is not included.
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
