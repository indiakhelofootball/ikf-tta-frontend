// src/components/reports/TrialsReport.jsx
//
// Trials Report (work-timeline #12): assigned trials in one place with city and
// date; month-wise counts per project and overall; and which trial cities have
// a REP assigned vs unassigned.
//
// A "project" = a Trial. A "trial city" = one assignedCity row on a trial.
// REP assignment is matched on (trialId, city string) — sub-city is folded into
// the city name, so the match is on the exact city string.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, Stack,
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Snackbar, Alert, CircularProgress, Chip,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../../services/api';
import { MONTHS } from '../trials/trialConstants';

const UNSCHEDULED = 'Unscheduled';

const norm = (s) => (s || '').trim().toLowerCase();

const monthOf = (city) => {
  if (city.tentativeMonth) {
    // tentativeMonth may be a full month name or already short — normalise to a
    // known MONTHS entry, else keep as-is.
    const m = MONTHS.find((x) => norm(x) === norm(city.tentativeMonth));
    if (m) return m;
    return city.tentativeMonth;
  }
  if (city.tentativeDate) {
    const d = new Date(city.tentativeDate);
    if (!isNaN(d)) return MONTHS[d.getMonth()];
  }
  return UNSCHEDULED;
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Full address string for a row = venue (ground location) + city + state.
const addressOf = (r) => [r.location, r.city, r.state].filter(Boolean).join(', ');

// Google Maps search link for the row's address (no API key needed). Empty when
// there is nothing locatable.
const mapUrl = (r) => {
  const q = addressOf(r);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
};

// Sort key: rows with a real date come first in ascending date order; undated
// rows sink to the bottom (they have no place on a date-ordered list).
const dateSortKey = (r) => {
  const t = r.date ? new Date(r.date).getTime() : NaN;
  return isNaN(t) ? Infinity : t;
};

function TrialsReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trials, setTrials] = useState([]);
  const [reps, setReps] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [assignFilter, setAssignFilter] = useState(''); // '', 'assigned', 'unassigned'

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.trials();
      setTrials(res.trials || []);
      setReps(res.reps || []);
    } catch (err) {
      console.error('Trials report load error:', err);
      setToast({ open: true, message: 'Failed to load report data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // (trialId, city) -> [repName]
  const repsByTrialCity = useMemo(() => {
    const m = new Map();
    reps.forEach((r) => {
      (r.cityAssignments || []).forEach((a) => {
        const key = `${a.trialId}||${norm(a.city)}`;
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(r.repName);
      });
    });
    return m;
  }, [reps]);

  // One row per (trial, city).
  const rows = useMemo(() => {
    const out = [];
    trials.forEach((t) => {
      const projectName = t.trialName || t.trialType || '—';
      (t.assignedCities || []).forEach((c) => {
        const assignedReps = repsByTrialCity.get(`${t.id}||${norm(c.cityName)}`) || [];
        out.push({
          trialId: t.id,
          projectName,
          trialType: t.trialType || '',
          season: t.season || '',
          state: c.state || '',
          city: c.cityName || '',
          location: c.groundLocation || '',
          month: monthOf(c),
          date: c.tentativeDate || '',
          confirmed: !!c.confirmed,
          reps: assignedReps,
          assigned: assignedReps.length > 0,
        });
      });
    });
    return out;
  }, [trials, repsByTrialCity]);

  const seasons = useMemo(
    () => [...new Set(trials.map((t) => t.season).filter(Boolean))].sort(),
    [trials]
  );

  const filteredRows = useMemo(() => {
    const q = norm(search);
    return rows
      .filter((r) => {
        if (seasonFilter && r.season !== seasonFilter) return false;
        if (assignFilter === 'assigned' && !r.assigned) return false;
        if (assignFilter === 'unassigned' && r.assigned) return false;
        if (!q) return true;
        return (
          norm(r.projectName).includes(q) ||
          norm(r.city).includes(q) ||
          norm(r.state).includes(q) ||
          norm(r.location).includes(q) ||
          r.reps.some((n) => norm(n).includes(q))
        );
      })
      // Detail listing is ordered by trial date, ascending (dated first, then undated).
      .sort((a, b) => dateSortKey(a) - dateSortKey(b));
  }, [rows, search, seasonFilter, assignFilter]);

  // Month-wise matrix: project (row) x month (col) counts, from filtered rows.
  const matrix = useMemo(() => {
    const monthsUsed = [];
    const seen = new Set();
    // Keep calendar order, append Unscheduled last if present.
    MONTHS.forEach((m) => {
      if (filteredRows.some((r) => r.month === m)) { monthsUsed.push(m); seen.add(m); }
    });
    if (filteredRows.some((r) => r.month === UNSCHEDULED)) monthsUsed.push(UNSCHEDULED);

    const projects = [...new Set(filteredRows.map((r) => r.projectName))].sort();
    const counts = {}; // projectName -> { month -> n }
    projects.forEach((p) => { counts[p] = {}; });
    filteredRows.forEach((r) => {
      counts[r.projectName][r.month] = (counts[r.projectName][r.month] || 0) + 1;
    });

    const colTotals = {};
    monthsUsed.forEach((m) => {
      colTotals[m] = filteredRows.filter((r) => r.month === m).length;
    });

    return { monthsUsed, projects, counts, colTotals, grandTotal: filteredRows.length };
  }, [filteredRows]);

  const stats = useMemo(() => ({
    projects: new Set(rows.map((r) => r.projectName)).size,
    cities: rows.length,
    assigned: rows.filter((r) => r.assigned).length,
    unassigned: rows.filter((r) => !r.assigned).length,
  }), [rows]);

  const exportCSV = () => {
    const header = ['Project', 'Season', 'State', 'City', 'Location', 'Address', 'Date', 'Map', 'Confirmed', 'REP(s)', 'Assignment'];
    const lines = filteredRows.map((r) => [
      r.projectName, r.season, r.state, r.city, r.location, addressOf(r),
      r.date ? fmtDate(r.date) : '', mapUrl(r), r.confirmed ? 'Yes' : 'No',
      r.reps.join('; '), r.assigned ? 'Assigned' : 'Unassigned',
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trials_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const cellSx = { fontSize: '0.82rem', py: 1 };
  const headSx = { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => navigate('/reports')}>
                <BackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b' }}>
                Trials Report
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5 }}>
              Assigned trials with city and date, month-wise counts per project, and REP assignment gaps.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={loadAll}
              sx={{ textTransform: 'none', borderRadius: 1.5, color: '#475569' }}>
              Refresh
            </Button>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCSV}
              disabled={filteredRows.length === 0}
              sx={{ textTransform: 'none', borderRadius: 1.5, borderColor: '#0d9488', color: '#0d9488' }}>
              Export CSV
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#0d9488' }} />
          </Box>
        ) : (
          <>
            {/* Stat cards */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Projects', value: stats.projects, color: '#0d9488' },
                { label: 'Trial Cities', value: stats.cities, color: '#6366f1' },
                { label: 'Assigned', value: stats.assigned, color: '#16a34a' },
                { label: 'Unassigned', value: stats.unassigned, color: '#dc2626' },
              ].map((s) => (
                <Paper key={s.label} elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                </Paper>
              ))}
            </Stack>

            {/* Month-wise matrix */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: '#1e293b' }}>
              Trials by month (per project)
            </Typography>
            <Paper elevation={0} sx={{ mb: 4, borderRadius: 2, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={headSx}>Project</TableCell>
                    {matrix.monthsUsed.map((m) => (
                      <TableCell key={m} align="center" sx={headSx}>{m === UNSCHEDULED ? 'Unsch.' : m.slice(0, 3)}</TableCell>
                    ))}
                    <TableCell align="center" sx={{ ...headSx, color: '#0d9488' }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrix.projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={matrix.monthsUsed.length + 2} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        No trials match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matrix.projects.map((p) => {
                      const rowTotal = matrix.monthsUsed.reduce((s, m) => s + (matrix.counts[p][m] || 0), 0);
                      return (
                        <TableRow key={p} hover>
                          <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{p}</TableCell>
                          {matrix.monthsUsed.map((m) => (
                            <TableCell key={m} align="center" sx={cellSx}>
                              {matrix.counts[p][m] || <span style={{ color: '#cbd5e1' }}>·</span>}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ ...cellSx, fontWeight: 700, color: '#0d9488' }}>{rowTotal}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {matrix.projects.length > 0 && (
                  <TableBody>
                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell sx={{ ...cellSx, fontWeight: 800 }}>Total</TableCell>
                      {matrix.monthsUsed.map((m) => (
                        <TableCell key={m} align="center" sx={{ ...cellSx, fontWeight: 800 }}>{matrix.colTotals[m] || 0}</TableCell>
                      ))}
                      <TableCell align="center" sx={{ ...cellSx, fontWeight: 800, color: '#0d9488' }}>{matrix.grandTotal}</TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </Paper>

            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems="center">
              <TextField
                size="small" placeholder="Search project, city, state, REP…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: 220 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>) }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Season</InputLabel>
                <Select label="Season" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
                  <MenuItem value="">All seasons</MenuItem>
                  {seasons.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Assignment</InputLabel>
                <Select label="Assignment" value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="assigned">Assigned only</MenuItem>
                  <MenuItem value="unassigned">Unassigned only</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Detail table — one row per trial city */}
            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['Project', 'Season', 'State', 'City', 'Location', 'Date', 'Map', 'REP', 'Status'].map((h) => (
                      <TableCell key={h} sx={headSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                        No trial cities match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r, i) => (
                      <TableRow key={`${r.trialId}-${r.city}-${i}`} hover>
                        <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{r.projectName}</TableCell>
                        <TableCell sx={cellSx}>{r.season || '—'}</TableCell>
                        <TableCell sx={cellSx}>{r.state || '—'}</TableCell>
                        <TableCell sx={cellSx}>{r.city || '—'}</TableCell>
                        <TableCell sx={cellSx}>{r.location || <span style={{ color: '#cbd5e1' }}>—</span>}</TableCell>
                        <TableCell sx={cellSx}>{fmtDate(r.date)}</TableCell>
                        <TableCell sx={cellSx}>
                          {mapUrl(r)
                            ? <a href={mapUrl(r)} target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>Map</a>
                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </TableCell>
                        <TableCell sx={cellSx}>{r.reps.length ? r.reps.join(', ') : <span style={{ color: '#dc2626', fontWeight: 600 }}>Unassigned</span>}</TableCell>
                        <TableCell sx={cellSx}>
                          <Chip
                            label={r.assigned ? 'Assigned' : 'Unassigned'}
                            size="small"
                            sx={{
                              fontSize: '0.68rem', fontWeight: 700, height: 20,
                              bgcolor: r.assigned ? '#dcfce7' : '#fee2e2',
                              color: r.assigned ? '#16a34a' : '#dc2626',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>{toast.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default TrialsReport;
