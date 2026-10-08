import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Button, CircularProgress } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { openDownloadedFile } from '../../utils/reportFile';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom, { brandCssVars } from './clientTheme';
import { formatDate, formatRange, formatCount, formatRupees } from './clientFormat';
import '../../styles/clientPortal.css';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

// The five tabs, keyed by the word that goes in the URL hash. The hash is the
// tab's address: a funder who reloads on Reports, or presses Back, stays where
// they were instead of being thrown to the landing tab.
const TABS = [
  { key: 'project', label: () => 'My Project' },
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
  const [tab, setTab] = useState(tabFromHash);
  const [pwOpen, setPwOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const tabRefs = useRef({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setNoGrant(false);
    setCert(null);
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

        // The certificate is fetched on its own for the same reason branding
        // is: it is behind a tab, nothing above the fold waits on it, and a
        // failure here must not blank the whole portal.
        clientAPI.certificate()
          .then((c) => { if (active) setCert(c); })
          .catch(() => { if (active) setCert({ available: false, reason: 'error' }); });

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

  const renderProject = () => (
    <>
      {/* Delivery leads. This tab used to open with Funder / Sanctioned /
          Status / Start / End and nothing else -- five facts the funder
          already knew, on the one screen where they decide whether to
          renew. What was actually delivered sat two tabs away.

          NEVER SUM ACROSS UNITS. 26 trials and 120 coaches is not 146 of
          anything; trials are events and coaches are people. Each
          deliverable keeps its own line and its own unit, the same rule
          CSRDashboard states for the internal side. There is deliberately
          no total here, and no percentage across deliverables.

          Everything below comes from data the portal already fetches. No
          utilisation figure appears: financials are excluded from the
          funder payload by isolation policy, and adding one is a policy
          change with an allowlist serializer attached, not a UI edit. */}
      <section className="cpanel" aria-labelledby="cp-delivered">
        <h2 className="ckicker" id="cp-delivered">Delivered so far</h2>
        {deliverables.length === 0 ? (
          <p className="clede">
            {activities.length > 0
              ? `${formatCount(activities.length)} activit${activities.length === 1 ? 'y' : 'ies'} ${
                closed
                  ? `${activities.length === 1 ? 'was' : 'were'} recorded under this grant.`
                  : `${activities.length === 1 ? 'has' : 'have'} been recorded under this grant. Once the grant agreement is loaded, what was promised is tracked here against what has been delivered.`
              }`
              // A closed grant is history. "Appear here as they happen" promised
              // a future this grant no longer has.
              : closed
                ? 'This grant has closed. Nothing was recorded against it.'
                : 'Nothing has been recorded against this grant yet. Activities and delivery progress appear here as they happen.'}
          </p>
        ) : (
          <ul className="crows">
            {deliverables.map((d) => <DeliverableRow key={d.id} d={d} />)}
          </ul>
        )}

        <div className="ccounts">
          <div>
            <div className="ccount-n">{formatCount(activities.length)}</div>
            <div className="ccount-k">Activities recorded</div>
          </div>
          <div>
            <div className="ccount-n">{formatCount(reports.length)}</div>
            <div className="ccount-k">Reports available</div>
          </div>
        </div>
      </section>

      <section className="cpanel" aria-labelledby="cp-grant">
        <h2 className="ckicker" id="cp-grant">The grant</h2>
        <dl className="cfacts">
          <div className="cfact">
            <dt className="cfact-k">Funder</dt>
            <dd className="cfact-v">{project.clientName || '—'}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Sanctioned</dt>
            <dd className="cfact-v">{formatRupees(project.sanctionedAmount)}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Status</dt>
            <dd className="cfact-v">{project.status || '—'}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Period</dt>
            <dd className="cfact-v">{formatRange(project.startDate, project.endDate) || '—'}</dd>
          </div>
        </dl>
        {project.description && <p className="clede cdesc">{project.description}</p>}
      </section>
    </>
  );

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
          : 'No deliverables recorded yet. Once the grant agreement is loaded, what was promised — and how much of it has been delivered — is tracked here.'}
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
      const closesOn = formatDate(cert.endDate);
      return (
        <EmptyPanel>
          {cert.reason === 'error'
            ? 'The certificate could not be loaded just now. Please try again shortly.'
            : `Your utilisation certificate is issued when this grant closes${closesOn ? `, on ${closesOn}` : ''}. Until then expenses are still being allocated against your contribution, so the figures would keep changing after you filed them. The grant is currently ${cert.projectStatus || project?.status || 'open'}.`}
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
          <span className="cbar-name">{title}</span>
        </div>
        <div className="cbar-actions">
          <Button className="cbar-btn" onClick={() => setPwOpen(true)}>Change password</Button>
          <Button className="cbar-btn" onClick={logout}>Sign out</Button>
        </div>
      </header>

      <main className="cwrap">{body}</main>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
    </ThemeProvider>
  );
}
