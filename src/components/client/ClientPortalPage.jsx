import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Container, Typography, Tabs, Tab, List, ListItem, ListItemText, Chip,
  CircularProgress, AppBar, Toolbar, Button, Link, Stack, Alert, Divider, Tooltip,
} from '@mui/material';
import { OpenInNew as OpenIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

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
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [pwOpen, setPwOpen] = useState(false);

  const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, acts, reps, b] = await Promise.all([
          clientAPI.project(), clientAPI.activities(), clientAPI.reports(),
          clientAPI.myBranding().catch(() => null),
        ]);
        if (!active) return;
        setProject(asList(p)[0] || null);
        setActivities(asList(acts));
        setReports(asList(reps));
        setBrand(b && b.slug ? b : null);
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
          {brand?.logoUrl && (
            <Box component="img" src={brand.logoUrl} alt={title} sx={{ height: 36, mr: 1 }} />
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
                <Typography color="text.secondary" sx={{ py: 2 }}>No activities published yet.</Typography>
              ) : (
                <List dense>
                  {activities.map((a) => (
                    <ListItem key={a.id}>
                      <ListItemText
                        primary={`${a.title}${a.activityType ? ` · ${a.activityType}` : ''}`}
                        secondary={[a.date, a.location].filter(Boolean).join(' · ') || null}
                      />
                      <Chip size="small" label={a.status} />
                    </ListItem>
                  ))}
                </List>
              )
            )}

            {tab === 2 && (
              reports.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>No reports published yet.</Typography>
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
          </>
        )}
      </Container>
      <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </Box>
    </ThemeProvider>
  );
}
