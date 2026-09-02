import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Typography, List, ListItem, ListItemText, Chip,
  CircularProgress, Button, Link, Stack, Alert, Divider, Tooltip,
  LinearProgress,
} from '@mui/material';
import { OpenInNew as OpenIcon, Download as DownloadIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';
import '../../styles/clientPortal.css';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

// Deliverable statuses are stored as readable labels server-side, so only the
// colour is mapped here.
const DELIVERABLE_STATUS_COLOR = {
  Completed: 'success',
  'In Progress': 'info',
  Pending: 'default',
};

const deliverablePercent = (d) => {
  const target = Number(d.targetCount) || 0;
  if (target <= 0) return null;
  return Math.min(100, Math.round(((Number(d.completedCount) || 0) / target) * 100));
};

const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// The funder's copy of the Utilisation Certificate. Everything printed here
// comes from the server's frozen snapshot — nothing is summed in the browser,
// because this is the document that gets filed and a second implementation of
// the total would eventually disagree with the one on record. The 'funder'
// variant is what enforces the isolation boundary — see certificatePdf.js.
const downloadCertificate = (cert) => downloadCertificatePdf(cert, { variant: 'funder' });

function Field({ label, value }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function ClientPortalPage() {
  const { logout } = useAuth();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [brand, setBrand] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [pwOpen, setPwOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

  useEffect(() => {
    let active = true;
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
        if (active) setError(e.message || 'Failed to load your project.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const title = brand?.displayName || project?.name || 'CSR Portal';

  return (
    <ThemeProvider theme={clientThemeFrom(brand)}>
    {/* The funder's own colour drives every accent below. clientTheme already
        derives a readable ink for it; the CSS reads both as variables so a
        funder with nothing recorded falls back to graphite rather than to
        another funder's brand — or to CSR's green, which would be worse. */}
    <div
      className="cportal"
      style={brand?.primaryColor ? {
        '--brand': brand.primaryColor,
        '--brand-wash': `${brand.primaryColor}14`,
      } : undefined}
    >
      <div className="cbar">
        {/* A funder's logo is hosted wherever they gave us a URL, so it can rot
            without warning. Without onError, one dead link makes a broken image
            glyph the first thing they see on their own branded portal. Failing
            back to the wordmark alone is invisible; a broken icon is not. */}
        {brand?.logoUrl && !logoBroken && (
          <img
            className="cbar-logo"
            src={brand.logoUrl}
            alt={title}
            onError={() => setLogoBroken(true)}
          />
        )}
        <span className="cbar-name">{title}</span>
        <Button onClick={() => setPwOpen(true)}>Change password</Button>
        <Button onClick={logout}>Sign out</Button>
      </div>

      <div className="cwrap">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !project ? (
          <div className="cpanel">
            <div className="cempty">
              <strong>No project is linked to your account yet.</strong>
              Ask your programme contact to link one.
            </div>
          </div>
        ) : (
          <>
            <div className="ctabs" role="tablist">
              {[
                'My Project',
                `Activities (${activities.length})`,
                `Reports (${reports.length})`,
                `Deliverables (${deliverables.length})`,
                'Certificate',
              ].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={tab === i}
                  className={`ctab${tab === i ? ' on' : ''}`}
                  onClick={() => setTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>

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
            {tab === 0 && (
              <>
                <div className="cpanel">
                  <div className="ckicker">Delivered so far</div>
                  {deliverables.length === 0 ? (
                    <p className="clede">
                      {activities.length > 0
                        ? `${activities.length} activit${activities.length === 1 ? 'y has' : 'ies have'} been recorded under this grant. Once the grant agreement is loaded, what was promised is tracked here against what has been delivered.`
                        : 'Nothing has been recorded against this grant yet. Activities and delivery progress appear here as they happen.'}
                    </p>
                  ) : (
                    deliverables.map((d) => {
                      const percent = deliverablePercent(d);
                      return (
                        <div className="crow" key={d.id}>
                          <div className="crow-main">
                            <div className="crow-t">{d.title}</div>
                            {percent != null && (
                              <div className="ctrack">
                                <div
                                  className="cfill"
                                  style={{ width: `${Math.min(100, percent)}%` }}
                                  role="progressbar"
                                  aria-label={`Progress for ${d.title}`}
                                  aria-valuenow={Math.round(percent)}
                                />
                              </div>
                            )}
                          </div>
                          <div className="crow-end">
                            <span className="cfact-v">{d.completedCount ?? 0}</span>
                            {d.targetCount != null && (
                              <span className="crow-s"> of {d.targetCount}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="ccounts">
                    <div>
                      <div className="ccount-n">{activities.length || '—'}</div>
                      <div className="ccount-k">Activities recorded</div>
                    </div>
                    <div>
                      <div className="ccount-n">{reports.length || '—'}</div>
                      <div className="ccount-k">Reports available</div>
                    </div>
                  </div>
                </div>

                <div className="cpanel">
                  <div className="ckicker">The grant</div>
                  <div className="cfacts">
                    <div className="cfact">
                      <div className="cfact-k">Funder</div>
                      <div className="cfact-v">{project.clientName || '\u2014'}</div>
                    </div>
                    <div className="cfact">
                      <div className="cfact-k">Sanctioned</div>
                      <div className="cfact-v">
                        &#8377;{Number(project.sanctionedAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="cfact">
                      <div className="cfact-k">Status</div>
                      <div className="cfact-v">{project.status || '\u2014'}</div>
                    </div>
                    <div className="cfact">
                      <div className="cfact-k">Period</div>
                      <div className="cfact-v">
                        {project.startDate || '\u2014'}
                        {project.endDate ? ` \u2013 ${project.endDate}` : ''}
                      </div>
                    </div>
                  </div>
                  {project.description && (
                    <p className="clede" style={{ marginTop: 18, whiteSpace: 'pre-wrap' }}>
                      {project.description}
                    </p>
                  )}
                </div>
              </>
            )}

            {tab === 1 && (
              activities.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, maxWidth: '52ch' }}>
                  Nothing published yet. Trials, workshops and training sessions run under
                  this grant appear here as they happen &mdash; they are recorded after the
                  event, not scheduled in advance.
                </Typography>
              ) : (
                <List dense>
                  {activities.map((a) => (
                    <ListItem key={a.id}>
                      <ListItemText
                        primary={`${a.title}${a.activityType ? ` · ${a.activityType}` : ''}`}
                        secondary={[
                          (a.startDate && a.endDate) ? `${a.startDate} → ${a.endDate}` : a.date,
                          a.location,
                        ].filter(Boolean).join(' · ') || null}
                      />
                      <Chip size="small" label={a.status} />
                    </ListItem>
                  ))}
                </List>
              )
            )}

            {tab === 2 && (
              reports.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, maxWidth: '52ch' }}>
                  No reports released yet. The India Khelo Football team publishes a report
                  for an activity once it is written; you will see it here as soon as it is
                  released.
                </Typography>
              ) : (
                <List dense>
                  {reports.map((r) => (
                    <ListItem key={r.id}>
                      <ListItemText primary={r.fileName} secondary={r.createdAt || null} />
                      {r.fileUrl && (
                        <Tooltip title="Open document">
                          <Link href={r.fileUrl} target="_blank" rel="noopener" sx={{ display: 'inline-flex' }}>
                            <OpenIcon fontSize="small" />
                          </Link>
                        </Tooltip>
                      )}
                    </ListItem>
                  ))}
                </List>
              )
            )}

            {tab === 3 && (
              deliverables.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, maxWidth: '52ch' }}>
                  No deliverables recorded yet. Once the grant agreement is loaded, what was
                  promised &mdash; and how much of it has been delivered &mdash; is tracked here.
                </Typography>
              ) : (
                <List>
                  {deliverables.map((d) => {
                    const percent = deliverablePercent(d);
                    return (
                      <ListItem
                        key={d.id}
                        sx={{ display: 'block', py: 2 }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <ListItemText
                            primary={d.title}
                            secondary={[
                              d.targetCount != null
                                ? `${d.completedCount ?? 0} of ${d.targetCount} completed`
                                : null,
                              d.dueDate ? `Due ${d.dueDate}` : null,
                            ].filter(Boolean).join(' · ') || null}
                          />
                          <Chip
                            size="small"
                            label={d.status}
                            color={DELIVERABLE_STATUS_COLOR[d.status] || 'default'}
                          />
                        </Stack>
                        {percent != null && (
                          <LinearProgress
                            variant="determinate"
                            value={percent}
                            aria-label={`Progress for ${d.title}`}
                            sx={{ mt: 1, height: 6, borderRadius: 3 }}
                          />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              )
            )}

            {/* The Utilisation Certificate. It is issued only when the grant
                closes and its figures are frozen — until then expenses are
                still being allocated by hand, and a figure that moves after a
                funder has filed it is worse than no figure. So the waiting
                state is written out in full rather than left as an empty tab. */}
            {tab === 4 && (
              !cert ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : !cert.available ? (
                <Typography color="text.secondary" sx={{ py: 2, maxWidth: '52ch' }}>
                  {cert.reason === 'error'
                    ? 'The certificate could not be loaded just now. Please try again shortly.'
                    : (
                      <>
                        Your utilisation certificate is issued when this grant closes
                        {cert.endDate ? `, on ${cert.endDate}` : ''}. Until then expenses
                        are still being allocated against your contribution, so the
                        figures would keep changing after you filed them. The grant is
                        currently {cert.projectStatus || project.status}.
                      </>
                    )}
                </Typography>
              ) : (
                <Box>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Box>
                      <Typography variant="h6">Utilisation Certificate</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Version {cert.certificateVersion} · figures fixed
                        {cert.frozenAt ? ` on ${new Date(cert.frozenAt).toLocaleDateString('en-IN')}` : ' at project close'}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadCertificate(cert)}
                    >
                      Download PDF
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Field label="Contribution" value={rupees(cert.sanctionedAmount)} />
                    <Field label="Total utilised" value={rupees(cert.totalUtilised)} />
                    <Field
                      label="Period"
                      value={`${cert.periodStart || 'inception'} → ${cert.periodEnd || 'date'}`}
                    />
                  </Stack>

                  <Divider sx={{ mb: 1 }} />
                  {(cert.lineItems || []).length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No expenses are recorded against this grant.
                    </Typography>
                  ) : (
                    <List dense>
                      {cert.lineItems.map((x, i) => (
                        <ListItem key={i} sx={{ justifyContent: 'space-between' }}>
                          <ListItemText primary={x.note || 'Expense'} />
                          <Typography variant="body2">{rupees(x.amount)}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )
            )}
          </>
        )}
      </div>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
    </ThemeProvider>
  );
}
