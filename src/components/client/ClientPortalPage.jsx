import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Button, CircularProgress, IconButton, Menu, MenuItem } from '@mui/material';
import { Download as DownloadIcon, Menu as MenuIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { openDownloadedFile } from '../../utils/reportFile';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom, { brandCssVars } from './clientTheme';
import { formatDate, formatRange, formatCount, formatRupees } from './clientFormat';
import { grantProgress, monthStrip, placesReached, latestFirst, activityDate } from './clientReport';
import '../../styles/clientPortal.css';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

// The five tabs, keyed by the word that goes in the URL hash. The hash is the
// tab's address: a funder who reloads on Reports, or presses Back, stays where
// they were instead of being thrown to the landing tab.
const TABS = [
  { key: 'project', label: () => 'Overview' },
  { key: 'activities', label: (c) => `Activities (${formatCount(c.activities)})` },
  { key: 'reports', label: (c) => `Reports (${formatCount(c.reports)})` },
  { key: 'deliverables', label: (c) => `Deliverables (${formatCount(c.deliverables)})` },
  { key: 'certificate', label: () => 'Certificate' },
];
const TAB_KEYS = TABS.map((t) => t.key);

const tabFromHash = () => {
  const key = (window.location.hash || '').replace(/^#/, '');
  return TAB_KEYS.includes(key) ? key : 'project';
};

const deliverablePercent = (d) => {
  const target = Number(d.targetCount) || 0;
  if (target <= 0) return null;
  return Math.min(100, Math.round(((Number(d.completedCount) || 0) / target) * 100));
};

// A funder whose login has no grant linked gets 403 with code "no_project" from
// every /api/client/ call. That is an account still being set up, not a fault,
// so it takes the friendly empty state rather than the failure one. api.js puts
// the parsed body on err.response.data.
const isNoGrant = (err) => {
  const res = err?.response;
  if (!res || res.status !== 403) return false;
  const data = res.data || {};
  return data.code === 'no_project' || data.detail?.code === 'no_project';
};

// The funder's copy of the Utilisation Certificate. Everything printed here
// comes from the server's frozen snapshot — nothing is summed in the browser,
// because this is the document that gets filed and a second implementation of
// the total would eventually disagree with the one on record. The 'funder'
// variant is what enforces the isolation boundary — see certificatePdf.js.
const downloadCertificate = (cert) => downloadCertificatePdf(cert, { variant: 'funder' });

const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

// One deliverable as a row. The same row on the landing tab and on the
// Deliverables tab, so the two cannot drift apart; `detailed` adds the due
// date and the stored status.
//
// The stored status is shown exactly as recorded — a label is a product
// decision. What the row adds is the arithmetic: completed above target is
// shown as '318 of 300' with a note, and the bar stops at full rather than
// overflowing its track.
function DeliverableRow({ d, detailed }) {
  const percent = deliverablePercent(d);
  const target = Number(d.targetCount) || 0;
  const done = Number(d.completedCount) || 0;
  const exceeded = target > 0 && done > target;
  const due = detailed ? formatDate(d.dueDate) : '';
  return (
    <li className="crow crow-wrap">
      <div className="crow-main">
        <div className="crow-t">{d.title}</div>
        {due && <div className="crow-s">Due {due}</div>}
      </div>
      <div className="crow-end">
        <div>
          <span className="cfig">{formatCount(done)}</span>
          {d.targetCount != null && (
            <span className="crow-s"> of {formatCount(d.targetCount)}</span>
          )}
        </div>
        {exceeded && <div className="cnote">Target exceeded</div>}
        {detailed && d.status && (
          <span className={`cpill${d.status === 'Completed' ? ' ok' : ''}`}>{d.status}</span>
        )}
      </div>
      {percent != null && (
        <div
          className="ctrack"
          role="progressbar"
          aria-label={`Progress for ${d.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="cfill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  );
}

// One deliverable on the Overview, written as a line of a report: the figure
// large, then what it counts against what was promised. Still one unit per
// line, never a total.
const deliveryNote = (done, target, percent) => {
  if (target <= 0) return '';
  if (done > target) return 'Target exceeded';
  if (done === target) return 'Target met';
  if (done === 0) return 'Not started';
  return `${percent}% of target`;
};

function LedgerRow({ d }) {
  const percent = deliverablePercent(d);
  const target = Number(d.targetCount) || 0;
  const done = Number(d.completedCount) || 0;
  const note = deliveryNote(done, target, percent);
  return (
    <li className="cled">
      <div className="cled-n">{formatCount(done)}</div>
      <div className="cled-b">
        <div className="cled-t">
          {d.title}{target > 0 ? `, against a target of ${formatCount(target)}.` : '.'}
        </div>
        {note && <div className="cled-s">{note}</div>}
        {percent != null && (
          <div
            className="ctrack"
            role="progressbar"
            aria-label={`Progress for ${d.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="cfill" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}

function IkfMark() {
  return (
    <span className="cikf">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="3" />
      </svg>
      Delivered by India Khelo Football
    </span>
  );
}

function EmptyPanel({ title, children }) {
  return (
    <div className="cpanel">
      <div className="cempty">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  const { logout } = useAuth();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [fileBusy, setFileBusy] = useState(null);
  const [fileErrors, setFileErrors] = useState({});
  const [deliverables, setDeliverables] = useState([]);
  const [brand, setBrand] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [noGrant, setNoGrant] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [certAttempt, setCertAttempt] = useState(0);
  const [tab, setTab] = useState(tabFromHash);
  const [pwOpen, setPwOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const tabRefs = useRef({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setNoGrant(false);
    (async () => {
      try {
        // Branding is fetched FIRST and on its own, not inside the Promise.all
        // below. It decides the funder's colours and logo -- the one thing on
        // this page whose job is to look like it was made for them -- and
        // bundling it with four data calls meant the brand could not paint
        // until the slowest query returned.
        clientAPI.myBranding()
          .then((b) => { if (active) setBrand(b && b.slug ? b : null); })
          .catch(() => { /* unbranded is a valid state; the default theme holds */ });

        const [p, acts, reps, dels] = await Promise.all([
          clientAPI.project(), clientAPI.activities(), clientAPI.reports(),
          clientAPI.deliverables(),
        ]);
        if (!active) return;
        setProject(asList(p)[0] || null);
        setActivities(asList(acts));
        setReports(asList(reps));
        setDeliverables(asList(dels));
      } catch (e) {
        // The raw message is never shown. api.js writes for developers — a 500
        // reads "check Django logs ... REACT_APP_API_URL" — and a funder can do
        // nothing with that except lose confidence. They get one sentence and a
        // Retry that re-runs this whole load.
        if (!active) return;
        if (isNoGrant(e)) setNoGrant(true);
        else setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [attempt]);

  // The certificate is fetched on its own for the same reason branding is: it
  // is behind a tab, nothing above the fold waits on it, and a failure here
  // must not blank the whole portal. Its own effect so the tab's Try again
  // re-fetches the certificate alone; the page-level Retry still re-runs it.
  useEffect(() => {
    let active = true;
    setCert(null);
    clientAPI.certificate()
      .then((c) => { if (active) setCert(c); })
      .catch(() => { if (active) setCert({ available: false, reason: 'error' }); });
    return () => { active = false; };
  }, [attempt, certAttempt]);

  // Back, Forward and a hand-edited hash all arrive here.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const title = brand?.displayName || project?.name || 'CSR Portal';

  useEffect(() => {
    const previous = document.title;
    const name = brand?.displayName || project?.name;
    document.title = name ? `${name} · CSR Portal` : 'CSR Portal';
    return () => { document.title = previous; };
  }, [brand?.displayName, project?.name]);

  // On a phone the tab row scrolls sideways; a tab chosen by hash (a reload on
  // #certificate) must be brought into view, not left past the edge.
  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [tab, loading]);

  const selectTab = useCallback((key) => {
    setTab(key);
    if (window.location.hash !== `#${key}`) window.location.hash = key;
  }, []);

  // WAI-ARIA tabs with automatic activation: arrows move between tabs and
  // select as they go; Home and End jump to the ends. Only the selected tab is
  // in the Tab order (roving tabindex), so Tab leaves the row in one press.
  const onTabKeyDown = (e) => {
    const i = TAB_KEYS.indexOf(tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TAB_KEYS[(i + 1) % TAB_KEYS.length];
    else if (e.key === 'ArrowLeft') next = TAB_KEYS[(i - 1 + TAB_KEYS.length) % TAB_KEYS.length];
    else if (e.key === 'Home') next = TAB_KEYS[0];
    else if (e.key === 'End') next = TAB_KEYS[TAB_KEYS.length - 1];
    if (!next) return;
    e.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  // The funder's own colour drives every accent below, through CSS variables.
  // Only a real #RRGGBB is accepted; anything else leaves the stylesheet's
  // graphite in place, never a borrowed brand and never CSS's idea of 'blue'.
  const cssVars = brandCssVars(brand?.primaryColor);
  const closed = project?.status === 'Closed';
  const counts = {
    activities: activities.length, reports: reports.length, deliverables: deliverables.length,
  };

  // The Overview is written as a programme report for the funder, read top to
  // bottom: what was delivered, where and when, the latest from the field, the
  // latest reports. A CSR head lifts lines from it into their own board report,
  // so it states facts in sentences rather than as a dashboard.
  //
  // NEVER SUM ACROSS UNITS. 26 trials and 120 coaches is not 146 of anything.
  // Each deliverable keeps its own line; months and places count activities,
  // which are one kind of thing. No utilisation figure appears: financials are
  // excluded from the funder payload by isolation policy.
  const renderProject = () => {
    const progress = grantProgress(project.startDate, project.endDate);
    const months = monthStrip(project.startDate, project.endDate, activities);
    const places = placesReached(activities);
    const recent = latestFirst(activities, activityDate).slice(0, 3);
    const recentReports = latestFirst(reports, (r) => r.createdAt).slice(0, 3);
    const n = activities.length;
    const dayFact = !progress ? null
      : progress.state === 'running' ? `Day ${formatCount(progress.day)} of ${formatCount(progress.total)}`
        : progress.state === 'upcoming' ? `Starts ${formatDate(project.startDate)}`
          : `Ended ${formatDate(project.endDate)}`;

    return (
      <article className="creport">
        {project.description && <p className="cdek">{project.description}</p>}

        <dl className="cline">
          <div><dt>Funder</dt><dd>{project.clientName || 'Not recorded'}</dd></div>
          <div><dt>Sanctioned</dt><dd className="cnum">{formatRupees(project.sanctionedAmount)}</dd></div>
          <div><dt>Period</dt><dd>{formatRange(project.startDate, project.endDate) || 'Not set'}</dd></div>
          <div><dt>Status</dt><dd>{project.status || 'Not recorded'}</dd></div>
          {dayFact && <div><dt>Progress</dt><dd className="cnum">{dayFact}</dd></div>}
        </dl>

        <section aria-labelledby="cp-delivered">
          <h2 className="csec" id="cp-delivered">What has been delivered</h2>
          {deliverables.length === 0 ? (
            <p className="clede">
              {n > 0
                ? closed
                  ? `${formatCount(n)} activit${n === 1 ? 'y' : 'ies'} took place under this grant.`
                  : `${formatCount(n)} activit${n === 1 ? 'y has' : 'ies have'} taken place so far. The targets this grant commits to will be set out here, each against what has been delivered.`
                : closed
                  ? 'This grant has closed. Nothing was recorded against it.'
                  : 'Nothing has been recorded against this grant yet. Activities and delivery progress appear here as they happen.'}
            </p>
          ) : (
            <ul className="cledger">
              {deliverables.map((d) => <LedgerRow key={d.id} d={d} />)}
            </ul>
          )}
        </section>

        {(months.length > 0 || places.length > 0) && (
          <section aria-labelledby="cp-where">
            <h2 className="csec" id="cp-where">Where and when</h2>
            {months.length > 0 && (
              <ol className="cmonths" aria-label="Activities by month">
                {months.map((m) => (
                  <li key={m.key} className={`cmo ${m.state}`}>
                    <span className="cmo-m">{m.label}<span className="cmo-y"> {m.year}</span></span>
                    <span className="cmo-bars" aria-hidden="true">
                      {Array.from({ length: Math.min(m.count, 6) }, (_, i) => <i key={i} />)}
                    </span>
                    <span className="cmo-c">
                      {m.count > 0
                        ? `${formatCount(m.count)} held`
                        : m.state === 'ahead' ? 'Ahead' : 'None'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {places.length > 0 && (
              <ul className="cplaces" aria-label="Places reached">
                {places.map((pl) => (
                  <li key={pl.name} className="cplace">
                    <span className="cplace-n">{pl.name}</span>
                    <span className="cplace-c cnum">{formatCount(pl.count)}</span>
                    <span className="cplace-s">
                      {pl.count === 1 ? '1 activity' : `${formatCount(pl.count)} activities`}
                      {pl.latest ? ` · latest ${formatDate(pl.latest)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {recent.length > 0 && (
          <section aria-labelledby="cp-field">
            <h2 className="csec" id="cp-field">From the field</h2>
            <ul className="citems">
              {recent.map((a) => {
                const when = (a.startDate || a.endDate) ? formatRange(a.startDate, a.endDate) : formatDate(a.date);
                const meta = [a.activityType, a.location, when].filter(Boolean).join(' · ');
                return (
                  <li key={a.id} className="citem">
                    <span className="citem-t">{a.title}</span>
                    {meta && <span className="citem-s">{meta}</span>}
                  </li>
                );
              })}
            </ul>
            {n > recent.length && (
              <button type="button" className="cmore" onClick={() => selectTab('activities')}>
                All {formatCount(n)} activities
              </button>
            )}
          </section>
        )}

        {recentReports.length > 0 && (
          <section aria-labelledby="cp-reports">
            <h2 className="csec" id="cp-reports">Latest reports</h2>
            <ul className="citems">
              {recentReports.map((r) => {
                const name = (r.title && String(r.title).trim()) || r.fileName || 'Report';
                const meta = [r.reportType, formatDate(r.createdAt)].filter(Boolean).join(' · ');
                return (
                  <li key={r.id} className="citem citem-row">
                    <span className="citem-main">
                      <span className="citem-t">{name}</span>
                      {meta && <span className="citem-s">{meta}</span>}
                    </span>
                    {r.hasFile ? (
                      <button
                        type="button"
                        className="cbtn"
                        aria-label={`Open ${name}`}
                        onClick={() => openUploadedReport(r, name)}
                        disabled={fileBusy === r.id}
                      >
                        {fileBusy === r.id ? 'Opening…' : 'Open'}
                      </button>
                    ) : r.fileUrl ? (
                      <a className="cbtn" href={r.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`}>
                        Open
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {reports.length > recentReports.length && (
              <button type="button" className="cmore" onClick={() => selectTab('reports')}>
                All {formatCount(reports.length)} reports
              </button>
            )}
          </section>
        )}

        <footer className="csign">
          <IkfMark />
          {project.clientName && <span>Prepared for {project.clientName}</span>}
        </footer>
      </article>
    );
  };

  const renderActivities = () => (
    activities.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No activities were published under this grant.'
          : 'Nothing published yet. Trials, workshops and training sessions run under this grant appear here as they happen — they are recorded after the event, not scheduled in advance.'}
      </EmptyPanel>
    ) : (
      <section className="cpanel" aria-label="Activities">
        <ul className="crows">
          {activities.map((a) => {
            const when = (a.startDate || a.endDate)
              ? formatRange(a.startDate, a.endDate)
              : formatDate(a.date);
            const meta = [a.activityType, when, a.location].filter(Boolean).join(' · ');
            return (
              <li className="crow" key={a.id}>
                <div className="crow-main">
                  <div className="crow-t">{a.title}</div>
                  {meta && <div className="crow-s">{meta}</div>}
                </div>
                {a.status && (
                  <div className="crow-end">
                    <span className={`cpill${a.status === 'Completed' ? ' ok' : ''}`}>{a.status}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    )
  );

  // An uploaded report is behind the funder's login, so it cannot be a plain
  // link: it is fetched with the token, then opened (PDF, image) or saved.
  const openUploadedReport = async (r, name) => {
    if (fileBusy) return;
    setFileBusy(r.id);
    setFileErrors((prev) => ({ ...prev, [r.id]: '' }));
    try {
      openDownloadedFile(await clientAPI.reportFile(r.id), name);
    } catch {
      setFileErrors((prev) => ({ ...prev, [r.id]: 'The file could not be opened. Please try again.' }));
    } finally {
      setFileBusy(null);
    }
  };

  const renderReports = () => (
    reports.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No reports were released under this grant.'
          : 'No reports released yet. The India Khelo Football team publishes a report for an activity once it is written; you will see it here as soon as it is released.'}
      </EmptyPanel>
    ) : (
      <section className="cpanel" aria-label="Reports">
        <ul className="crows">
          {reports.map((r) => {
            const name = (r.title && String(r.title).trim()) || r.fileName || 'Report';
            const meta = [r.reportType, formatDate(r.createdAt)].filter(Boolean).join(' · ');
            return (
              <li className="crow" key={r.id}>
                <div className="crow-main">
                  <div className="crow-t">
                    {r.hasFile ? (
                      <button type="button" className="crow-tbtn" onClick={() => openUploadedReport(r, name)}>
                        {name}
                      </button>
                    ) : r.fileUrl ? (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">{name}</a>
                    ) : name}
                  </div>
                  {meta && <div className="crow-s">{meta}</div>}
                </div>
                <div className="crow-end">
                  {r.hasFile ? (
                    <button
                      type="button"
                      className="cbtn"
                      aria-label={`Open ${name}`}
                      onClick={() => openUploadedReport(r, name)}
                      disabled={fileBusy === r.id}
                    >
                      {fileBusy === r.id ? 'Opening…' : 'Open'}
                    </button>
                  ) : r.fileUrl ? (
                    <a
                      className="cbtn"
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${name}`}
                    >
                      Open
                    </a>
                  ) : (
                    <span className="crow-s">File not attached yet</span>
                  )}
                  {fileErrors[r.id] ? (
                    <span className="crow-s crow-err" role="alert">{fileErrors[r.id]}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    )
  );

  const renderDeliverables = () => (
    deliverables.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No deliverables were recorded under this grant.'
          : 'No deliverables recorded yet. What this grant promises, and how much of it has been delivered, will be tracked here.'}
      </EmptyPanel>
    ) : (
      <section className="cpanel" aria-label="Deliverables">
        <ul className="crows">
          {deliverables.map((d) => <DeliverableRow key={d.id} d={d} detailed />)}
        </ul>
      </section>
    )
  );

  // The Utilisation Certificate. It is issued only when the grant closes and
  // its figures are frozen — until then expenses are still being allocated by
  // hand, and a figure that moves after a funder has filed it is worse than no
  // figure. So the waiting state is written out in full rather than left as an
  // empty tab.
  const renderCertificate = () => {
    if (!cert) {
      return <div className="cloading"><CircularProgress size={24} /></div>;
    }
    if (!cert.available) {
      if (cert.reason === 'error') {
        return (
          <div className="cpanel" role="alert">
            <div className="cempty">
              The certificate could not be loaded just now. This is usually brief.
              <div className="cempty-act">
                <Button variant="contained" onClick={() => setCertAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        );
      }
      const closesOn = formatDate(cert.endDate);
      return (
        <EmptyPanel>
          {`Your utilisation certificate is issued when this grant closes${closesOn ? `, on ${closesOn}` : ''}. Until then expenses are still being allocated against your contribution, so the figures would keep changing after you filed them. The grant is currently ${cert.projectStatus || project?.status || 'open'}.`}
        </EmptyPanel>
      );
    }
    const frozenOn = formatDate(cert.frozenAt);
    const start = formatDate(cert.periodStart) || 'Inception';
    const end = formatDate(cert.periodEnd);
    const lines = cert.lineItems || [];
    return (
      <section className="cpanel" aria-labelledby="cp-cert">
        <div className="chead">
          <div>
            <h2 className="ctitle" id="cp-cert">Utilisation Certificate</h2>
            <div className="crow-s">
              Version {cert.certificateVersion} · figures fixed
              {frozenOn ? ` on ${frozenOn}` : ' at project close'}
            </div>
          </div>
          <Button
            className="cnoprint"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCertificate(cert)}
          >
            Download PDF
          </Button>
        </div>

        <dl className="cfacts">
          {/* The kind of certificate this is. The server sends it only when
              the grant has one, so a missing type is no field, never an
              empty or "None" one. */}
          {cert.utilisationType && (
            <div className="cfact">
              <dt className="cfact-k">Certificate type</dt>
              <dd className="cfact-v">{cert.utilisationType}</dd>
            </div>
          )}
          <div className="cfact">
            <dt className="cfact-k">Contribution</dt>
            <dd className="cfact-v cnum">{formatRupees(cert.sanctionedAmount)}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Total utilised</dt>
            <dd className="cfact-v cnum">{formatRupees(cert.totalUtilised)}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Period</dt>
            <dd className="cfact-v">{end ? `${start} – ${end}` : `${start} to date`}</dd>
          </div>
        </dl>

        {lines.length === 0 ? (
          <p className="clede cdesc">No expenses are recorded against this grant.</p>
        ) : (
          <ul className="crows clines">
            {/* The date each line is filed under. The block above states the
                period this certificate covers; without a date per line the
                funder has to take on trust that every line falls inside it. A
                certificate frozen before the server sent this field has no
                date, and must still render. */}
            {lines.map((x, i) => {
              const on = formatDate(x.date);
              return (
                <li className="crow" key={i}>
                  <div className="crow-main">
                    <div className="crow-t">{x.note || 'Expense'}</div>
                    {on && <div className="crow-s">{on}</div>}
                  </div>
                  <div className="crow-end cnum">{formatRupees(x.amount)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  const PANELS = {
    project: renderProject,
    activities: renderActivities,
    reports: renderReports,
    deliverables: renderDeliverables,
    certificate: renderCertificate,
  };

  let body;
  if (loading) {
    body = <div className="cloading"><CircularProgress /></div>;
  } else if (failed) {
    body = (
      <div className="cpanel" role="alert">
        <div className="cempty">
          <strong>We couldn&rsquo;t load your grant just now.</strong>
          This is usually brief. Try again in a moment.
          <div className="cempty-act">
            <Button variant="contained" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
          </div>
        </div>
      </div>
    );
  } else if (noGrant || !project) {
    body = (
      <EmptyPanel title="No grant is linked to your account yet.">
        Ask your India Khelo Football programme contact to link it.
      </EmptyPanel>
    );
  } else {
    body = (
      <>
        {/* The grant's own name. With branding on, the bar carries the
            funder's display name, and before this the grant itself was named
            nowhere on its own page. */}
        {project.clientName && (
          <div className="ceyebrow">Programme report for {project.clientName} · as of {formatDate(new Date())}</div>
        )}
        <h1 className="cgrant">{project.name || title}</h1>

        <div className="ctabs" role="tablist" aria-label="Your grant" onKeyDown={onTabKeyDown}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              type="button"
              role="tab"
              id={`ctab-${key}`}
              aria-controls={`cpanel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              className={`ctab${tab === key ? ' on' : ''}`}
              onClick={() => selectTab(key)}
            >
              {label(counts)}
            </button>
          ))}
        </div>

        {/* Every tab owns a panel so its aria-controls points at something
            real; only the selected one renders content. */}
        {TABS.map(({ key }) => (
          <div
            key={key}
            role="tabpanel"
            id={`cpanel-${key}`}
            aria-labelledby={`ctab-${key}`}
            hidden={tab !== key}
            tabIndex={0}
            className="ctabpanel"
          >
            {tab === key && PANELS[key]()}
          </div>
        ))}
      </>
    );
  }

  return (
    <ThemeProvider theme={clientThemeFrom(brand)}>
    <div className="cportal" style={cssVars || undefined}>
      <header className="cbar">
        <div className="cbar-id">
          {/* A funder's logo is hosted wherever they gave us a URL, so it can
              rot without warning. Without onError, one dead link makes a
              broken image glyph the first thing they see on their own branded
              portal. Failing back to the wordmark alone is invisible; a broken
              icon is not. */}
          {brand?.logoUrl && !logoBroken && (
            <img
              className="cbar-logo"
              src={brand.logoUrl}
              alt=""
              onError={() => setLogoBroken(true)}
            />
          )}
          <span className="cbar-name">{brand?.displayName || project?.clientName || title}</span>
        </div>
        <span className="cbar-ikf"><IkfMark /></span>
        <div className="cbar-actions">
          <Button className="cbar-btn" onClick={() => setPwOpen(true)}>Change password</Button>
          <Button className="cbar-btn" onClick={logout}>Sign out</Button>
        </div>
        {/* On a phone the two actions sit behind one menu, so the funder's
            name keeps the whole bar instead of wrapping onto a second row. */}
        <div className="cbar-menu">
          <IconButton
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={menuAnchor ? 'true' : undefined}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); setPwOpen(true); }}>Change password</MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); logout(); }}>Sign out</MenuItem>
          </Menu>
        </div>
      </header>

      <main className="cwrap">{body}</main>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
    </ThemeProvider>
  );
}
