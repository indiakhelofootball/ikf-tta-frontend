// src/components/csr/CSRReportsPage.jsx
// Reports, across every grant — the sidebar destination from the 28 May visual
// flow, not the per-project tab.
//
// WHAT THIS PAGE IS: the EDITORIAL GATE. A report exists in one of two states —
// held internally, or released to the funder (visible_to_client). Deciding which
// is the CSR team's main job, and the state is the reason this page is a
// destination of its own rather than a file list. So the gate is the first thing
// the page says, the default view is the queue of things NOT yet released, and
// the state is a column rather than a detail you open a row to find.
//
// COLOUR. Two inks, both carrying the meaning they own:
//   ochre  — "waiting on you": written but not released. The queue.
//   teal   — "everything facing outward": released, the funder can see it.
// Nothing else is coloured. Released is not a money event, so moss stays out.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Container, InputAdornment, Link, MenuItem, Skeleton, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material';
import {
  DescriptionOutlined as ReportsIcon,
  OpenInNew as OpenIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { surfaces, inks, figure, fonts, tabular } from '../../styles/ttaTheme';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

// The three views of the gate. 'Internal' is deliberately first in the list and
// is what the count in the header points at — it is the only one of the three
// that is somebody's outstanding work.
const VIEWS = [
  { value: 'Internal', label: 'Not yet released' },
  { value: 'Visible', label: 'Client-visible' },
  { value: 'All', label: 'All reports' },
];

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function GateChip({ visible }) {
  const ink = visible ? inks.teal : inks.ochre;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 9999,
        fontFamily: fonts.sans,
        fontSize: '0.6875rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        bgcolor: ink.tint,
        color: ink.text,
      }}
    >
      {visible ? 'Client-visible' : 'Internal'}
    </Box>
  );
}

export default function CSRReportsPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();

  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  // Opens on the queue, not on everything. The complete list is one click away;
  // the outstanding work should not be.
  const [view, setView] = useState('Internal');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // The report serializer ships projectId and activityId only — neither name
      // is on the row, so both lists are fetched and joined here.
      const [reps, projs, acts] = await Promise.all([
        csrAPI.reports.getAll(),
        csrAPI.projects.getAll(),
        csrAPI.activities.getAll(),
      ]);
      setReports(asList(reps));
      setProjects(asList(projs));
      setActivities(asList(acts));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load reports.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(() => load(true));

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [String(p.id), p.name]));
    return (id) => map.get(String(id)) || '—';
  }, [projects]);

  const activityTitle = useMemo(() => {
    const map = new Map(activities.map((a) => [String(a.id), a.title]));
    return (id) => (id == null ? '' : map.get(String(id)) || '');
  }, [activities]);

  const pending = reports.filter((r) => !r.visibleToClient).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (view === 'Internal') return !r.visibleToClient;
        if (view === 'Visible') return Boolean(r.visibleToClient);
        return true;
      })
      .filter((r) => projectFilter === 'All' || String(r.projectId) === String(projectFilter))
      .filter((r) => {
        if (!q) return true;
        return [r.fileName, projectName(r.projectId), activityTitle(r.activityId)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [reports, view, projectFilter, search, projectName, activityTitle]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, flex: 'none',
          display: 'grid', placeItems: 'center',
          bgcolor: inks.ochre.tint, color: inks.ochre.text,
          '& svg': { fontSize: 18 },
        }}>
          <ReportsIcon />
        </Box>
        <Typography variant="h4">Reports</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Every report across every grant. A report reaches the funder only once it
        is marked client-visible.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* The gate, stated as a figure. A count of things waiting on you is the
          one number this page exists to keep at zero. */}
      {!loading && (
        <Box sx={{
          bgcolor: pending > 0 ? inks.ochre.tint : surfaces.sunken,
          borderRadius: 2,
          px: 2.5,
          py: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'baseline',
          gap: 1.5,
        }}>
          <Box sx={{ ...figure.large, color: pending > 0 ? inks.ochre.text : 'text.primary' }}>
            {pending}
          </Box>
          <Box sx={figure.unit}>
            {pending === 1 ? 'report is' : 'reports are'} written but not yet
            released to the funder{reports.length > 0 && `, of ${reports.length} in all`}
          </Box>
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search file, grant or activity"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Gate"
          value={view}
          onChange={(e) => setView(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {VIEWS.map((v) => (
            <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Grant"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="All">All grants</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
        </Stack>
      ) : (
        <Box sx={{
          bgcolor: surfaces.surface,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}>
          <Box sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '132px 1fr 200px 180px 132px',
            gap: 2,
            px: 2,
            py: 1.25,
            bgcolor: surfaces.sunken,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            {['Added', 'File', 'Activity', 'Grant', 'Gate'].map((h) => (
              <Typography key={h} variant="caption" component="div">{h}</Typography>
            ))}
          </Box>

          {rows.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              {reports.length === 0
                ? 'No reports yet.'
                : 'No reports match this filter.'}
            </Typography>
          ) : rows.map((r) => (
            <Box
              key={r.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '132px 1fr 200px 180px 132px' },
                gap: { xs: 0.5, md: 2 },
                alignItems: { md: 'center' },
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: surfaces.hairlineSoft,
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Box sx={{ ...figure.unit, ...tabular, whiteSpace: 'nowrap' }}>
                {fmtDay(r.createdAt)}
              </Box>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ fontFamily: fonts.sans, fontSize: '0.875rem', minWidth: 0 }}>
                  {r.fileName || 'Untitled'}
                </Box>
                {r.fileUrl && (
                  <Tooltip title="Open document">
                    <Link
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener"
                      sx={{ display: 'inline-flex', color: 'text.secondary' }}
                    >
                      <OpenIcon fontSize="inherit" />
                    </Link>
                  </Tooltip>
                )}
              </Stack>
              <Box sx={{ fontFamily: fonts.sans, fontSize: '0.8125rem', color: 'text.secondary', minWidth: 0 }}>
                {activityTitle(r.activityId) || '—'}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => navigate(`/csr/${r.projectId}`)}
                sx={{
                  font: 'inherit',
                  fontFamily: fonts.sans,
                  fontSize: '0.8125rem',
                  textAlign: 'left',
                  border: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  minWidth: 0,
                  transition: 'color 120ms cubic-bezier(0, 0, 0.2, 1)',
                  '&:hover': { color: 'text.primary', textDecoration: 'underline' },
                }}
              >
                {projectName(r.projectId)}
              </Box>
              <Box><GateChip visible={Boolean(r.visibleToClient)} /></Box>
            </Box>
          ))}
        </Box>
      )}

      {!loading && rows.length > 0 && (
        <Typography variant="caption" component="div" sx={{ mt: 1.5 }}>
          Showing {rows.length} of {reports.length}
        </Typography>
      )}
    </Container>
  );
}
