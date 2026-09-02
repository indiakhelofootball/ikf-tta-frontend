import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Container, Typography, Tabs, Tab, List, ListItem, ListItemText, Chip,
  CircularProgress, AppBar, Toolbar, Button, Link, Stack, Alert, Divider, Tooltip,
  LinearProgress,
} from '@mui/material';
import { OpenInNew as OpenIcon, Download as DownloadIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';
import { FAILED_STATUSES } from '../csr/csrContractRules';

// Deliverable statuses are stored as readable labels server-side, so only the
// colour is mapped here. 'Not Delivered' and 'Cancelled' aren't listed --
// those get the error treatment below (FAILED_STATUSES), not a chip colour.
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          {/* A funder's logo is hosted wherever they gave us a URL, so it can
              rot without warning. Without onError, one dead link makes a broken
              image glyph the first thing they see on their own branded portal.
              Failing back to the wordmark alone is invisible; a broken icon is
              not. */}
          {brand?.logoUrl && !logoBroken && (
            <Box
              component="img"
              src={brand.logoUrl}
              alt={title}
              onError={() => setLogoBroken(true)}
              sx={{ height: 36, mr: 1 }}
            />
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Button onClick={() => setPwOpen(true)}>Change password</Button>
          <Button onClick={logout}>Sign out</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !project ? (
          <Typography color="text.secondary" sx={{ py: 4 }}>
            No project is linked to your account yet.
          </Typography>
        ) : (
          <>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="My Project" />
              <Tab label={`Activities (${activities.length})`} />
              <Tab label={`Reports (${reports.length})`} />
              <Tab label={`Deliverables (${deliverables.length})`} />
              <Tab label="Certificate" />
            </Tabs>

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
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Delivered so far
                </Typography>
                {deliverables.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 1, maxWidth: '52ch' }}>
                    {activities.length > 0
                      ? `${activities.length} activit${activities.length === 1 ? 'y has' : 'ies have'} been recorded under this grant. Once the grant agreement is loaded, what was promised is tracked here against what has been delivered.`
                      : 'Nothing has been recorded against this grant yet. Activities and delivery progress appear here as they happen.'}
                  </Typography>
                ) : (
                  <Stack spacing={2.5} sx={{ mt: 1.5 }}>
                    {deliverables.map((d) => {
                      const percent = deliverablePercent(d);
                      return (
                        <Box key={d.id}>
                          <Stack
                            direction="row" spacing={2}
                            sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
                          >
                            <Typography variant="body1">{d.title}</Typography>
                            <Typography variant="h6" component="p" sx={{ whiteSpace: 'nowrap' }}>
                              {d.completedCount ?? 0}
                              <Typography component="span" variant="body2" color="text.secondary">
                                {d.targetCount != null ? ` of ${d.targetCount}` : ''}
                              </Typography>
                            </Typography>
                          </Stack>
                          {percent != null && (
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              aria-label={`Progress for ${d.title}`}
                              sx={{ mt: 0.75, height: 6, borderRadius: 3 }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
                  <Field
                    label="Activities recorded"
                    value={activities.length ? String(activities.length) : '—'}
                  />
                  <Field
                    label="Reports available"
                    value={reports.length ? String(reports.length) : '—'}
                  />
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                  <Field label="Funder" value={project.clientName} />
                  <Field label="Sanctioned" value={`₹${Number(project.sanctionedAmount || 0).toLocaleString('en-IN')}`} />
                  <Field label="Status" value={project.status} />
                  <Field label="Start" value={project.startDate} />
                  <Field label="End" value={project.endDate} />
                </Stack>
                {project.description && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{project.description}</Typography>
                  </>
                )}
              </Box>
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
                    const failed = FAILED_STATUSES.includes(d.status);
                    return (
                      <ListItem
                        key={d.id}
                        sx={failed ? {
                          display: 'block',
                          py: 2,
                          bgcolor: '#FBEBE9',
                          borderLeft: '3px solid #B3352A',
                          pl: 2,
                        } : { display: 'block', py: 2 }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <ListItemText
                            primary={d.title}
                            primaryTypographyProps={failed ? { sx: { color: '#8F2A21' } } : undefined}
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
                            sx={failed ? {
                              bgcolor: '#FBEBE9',
                              color: '#8F2A21',
                              border: '1px solid #B3352A',
                            } : undefined}
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
      </Container>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </Box>
    </ThemeProvider>
  );
}
