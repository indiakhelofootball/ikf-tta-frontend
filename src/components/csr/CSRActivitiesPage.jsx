// src/components/csr/CSRActivitiesPage.jsx
// Activities, across every grant — the sidebar destination the 28 May visual
// flow names, not the per-project tab.
//
// WHAT THIS PAGE IS: a LOG. The spec is explicit that CSR work is reactive —
// "No advance schedule. Activities and payments get filled in as they happen."
// So there is no calendar, no scheduler and no "upcoming" section: newest first,
// oldest last, and a filter for the one axis that matters (which grant).
//
// Grouping by project was the alternative and it is wrong here. A log's whole
// value is that the most recent thing is at the top; grouping shatters that into
// per-grant piles and makes "what happened this week" unanswerable. The project
// is a column and a filter instead.
//
// COLOUR. Activity carries no fixed meaning in the ledger system — see the
// NEUTRAL note in CSRDashboard — so the page leads neutral. The one ink that
// genuinely applies is ochre on 'Planned': logged but not yet done is precisely
// "waiting on you". 'Completed' takes the neutral chip rather than moss, because
// moss means money and an activity is not money.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Container, MenuItem, Skeleton, Stack, TextField, Typography,
  InputAdornment,
} from '@mui/material';
import {
  EventNoteOutlined as ActivityIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { surfaces, inks, figure, fonts, tabular } from '../../styles/ttaTheme';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

// Activities carry no meaning of their own in this system, so the page chrome
// stays neutral rather than borrowing an ink that means something else.
const NEUTRAL = { tint: surfaces.sunken, text: '#4E5A54' };

// The serializer exposes `date` for point-in-time activities and start/end for
// spans. Sorting needs one comparable value, so fall through in that order and
// use createdAt as the last resort — an activity logged with no date at all
// still belongs somewhere in the log rather than at an arbitrary end.
const sortKey = (a) => String(a.date || a.startDate || a.createdAt || '');

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const whenLabel = (a) => {
  if (a.startDate && a.endDate) return `${fmtDay(a.startDate)} → ${fmtDay(a.endDate)}`;
  return fmtDay(a.date || a.startDate || a.endDate);
};

function StatusChip({ status }) {
  const planned = status === 'Planned';
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
        bgcolor: planned ? inks.ochre.tint : surfaces.sunken,
        color: planned ? inks.ochre.text : 'text.secondary',
      }}
    >
      {status || 'Unknown'}
    </Box>
  );
}

export default function CSRActivitiesPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();

  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // The activity serializer ships projectId, not a project name — the name
      // has to come from the projects list and be joined here.
      const [acts, projs] = await Promise.all([
        csrAPI.activities.getAll(),
        csrAPI.projects.getAll(),
      ]);
      setActivities(asList(acts));
      setProjects(asList(projs));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load activities.');
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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities
      .filter((a) => projectFilter === 'All' || String(a.projectId) === String(projectFilter))
      .filter((a) => {
        if (!q) return true;
        return [a.title, a.location, projectName(a.projectId)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }, [activities, projectFilter, search, projectName]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, flex: 'none',
          display: 'grid', placeItems: 'center',
          bgcolor: NEUTRAL.tint, color: NEUTRAL.text,
          '& svg': { fontSize: 18 },
        }}>
          <ActivityIcon />
        </Box>
        <Typography variant="h4">Activities</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Everything logged across every grant, newest first. Activities are
        recorded as they happen — this is a record, not a schedule.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search title, location or grant"
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
          label="Grant"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          sx={{ minWidth: 220 }}
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
          {/* Column header. Sits on the sunken tier so the rows read as the
              record and the header reads as chrome. */}
          <Box sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '132px 1fr 200px 180px 108px',
            gap: 2,
            px: 2,
            py: 1.25,
            bgcolor: surfaces.sunken,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            {['Date', 'Activity', 'Location', 'Grant', 'Status'].map((h) => (
              <Typography key={h} variant="caption" component="div">{h}</Typography>
            ))}
          </Box>

          {rows.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              {activities.length === 0
                ? 'Nothing logged yet.'
                : 'No activities match this filter.'}
            </Typography>
          ) : rows.map((a) => (
            <Box
              key={a.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '132px 1fr 200px 180px 108px' },
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
                {whenLabel(a)}
              </Box>
              <Box sx={{ fontFamily: fonts.sans, fontSize: '0.875rem', minWidth: 0 }}>
                {a.title}
              </Box>
              <Box sx={{ fontFamily: fonts.sans, fontSize: '0.8125rem', color: 'text.secondary', minWidth: 0 }}>
                {a.location || '—'}
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => navigate(`/csr/${a.projectId}`)}
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
                {projectName(a.projectId)}
              </Box>
              <Box><StatusChip status={a.status} /></Box>
            </Box>
          ))}
        </Box>
      )}

      {!loading && rows.length > 0 && (
        <Typography variant="caption" component="div" sx={{ mt: 1.5 }}>
          {rows.length} of {activities.length} logged
        </Typography>
      )}
    </Container>
  );
}
