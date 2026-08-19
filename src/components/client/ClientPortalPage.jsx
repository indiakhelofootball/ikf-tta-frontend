import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Container, Typography, Tabs, Tab, List, ListItem, ListItemText, Chip,
  CircularProgress, AppBar, Toolbar, Button, Link, Stack, Alert, Divider, Tooltip,
  LinearProgress,
} from '@mui/material';
import { OpenInNew as OpenIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

// Deliverable statuses are stored as readable labels server-side
// (Pending / In Progress / Completed), so only the colour is mapped here.
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
            </Tabs>

            {tab === 0 && (
              <Box>
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
                    return (
                      <ListItem key={d.id} sx={{ display: 'block', py: 2 }}>
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
          </>
        )}
      </Container>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </Box>
    </ThemeProvider>
  );
}
