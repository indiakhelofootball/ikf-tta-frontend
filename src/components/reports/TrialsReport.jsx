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
import { csvBlob } from '../../utils/csv';
import { exportReportExcel, datedFileName } from '../../utils/reportExcel';
import { MONTHS } from '../trials/trialConstants';
import { computeStats } from './trialsReportStats';

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

// Full address for a row, PIN code included.
//
// The REP's city assignment is the only place a trial address is ever entered,
// so it wins. `TrialCity.ground_location` — what this used to rely on — is never
// written by anything: the add-city endpoint hardcodes it to '' and no screen
// offers the field, so it is blank on every row in production. Falling back to
// city + state is what made the report show a partial address.
//
// City, state and PIN live in their own columns, and whether the typed address
// already repeats them varies by who entered it — some rows are a full postal
// address ending in ", Mathura, Uttar Pradesh", others are a bare venue name. So
// each part is appended only when the text does not already contain it, rather
// than assumed present or assumed absent.
//
// physical_address is a TextField, so it can hold newlines; those are folded into
// the comma list or they would break a CSV row.
const addressOf = (r) => {
  const base = (r.physicalAddress || '')
    .replace(/\s*[\r\n]+\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/,\s*,/g, ',')
    .replace(/^,|,$/g, '')
    .trim();

  // NO ADDRESS MEANS NO ADDRESS. This used to fall through to `city + state`
  // when the assignment carried nothing, which produced "Bikaner, Rajasthan" --
  // a string assembled from two columns already sitting two cells to the left,
  // presented as if someone had entered it.
  //
  // That fallback is why this report has been fixed repeatedly and kept looking
  // broken. It rendered three completely different states identically: a row
  // with a real address, a row whose assignment was never filled in, and a row
  // with no REP at all. And it matched the OLD broken code byte for byte, since
  // that also ended at city + state -- so the one commit that genuinely fixed
  // the source changed nothing visible on any row lacking data, and read as
  // another failed attempt.
  //
  // Empty now renders empty, and the cell says which of the two reasons applies.
  // Rows needing attention become countable instead of invisible.
  if (!base) return '';

  // Word-boundary match, not substring. `norm(base).includes('kota')` is true
  // for "Rajkota Road Stadium", so the city Kota was silently dropped from the
  // one address it belonged to. Reducing both sides to space-delimited word
  // runs makes the test exact without regex escaping of user-entered text.
  const words = (s) => ` ${norm(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  const haystack = words(base);
  const missing = [r.city, r.state].filter((v) => v && !haystack.includes(words(v)));
  let out = [base, ...missing].filter(Boolean).join(', ');

  const pin = r.groundPinCode;
  if (pin && !out.includes(pin)) out = out ? `${out} - ${pin}` : pin;
  return out;
};

// Map link. The REP's assignment carries a real per-ground Google Maps URL;
// prefer it over a search built from the address, which resolves only to the
// centre of the city and is why the map appeared to ignore the venue.
const mapUrl = (r) => {
  if (r.googleMapLink) return r.googleMapLink;
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

  // (trialId, city) -> { reps: [repName], physicalAddress, googleMapLink }
  //
  // The assignment carries the address and map link as well as the REP, and this
  // join already existed to find the REP name — everything else on it used to be
  // thrown away, which is why an address entered against a city never reached
  // the report. First addressed assignment for a city wins; a second REP on the
  // same city adds a name, not a competing address.
  const repsByTrialCity = useMemo(() => {
    const m = new Map();
    reps.forEach((r) => {
      (r.cityAssignments || []).forEach((a) => {
        const key = `${a.trialId}||${norm(a.city)}`;
        if (!m.has(key)) {
          m.set(key, {
            reps: [], physicalAddress: '', googleMapLink: '',
            groundLocation: '', groundPinCode: '',
          });
        }
        const entry = m.get(key);
        entry.reps.push(r.repName);
        if (!entry.physicalAddress && a.physicalAddress) entry.physicalAddress = a.physicalAddress;
        if (!entry.googleMapLink && a.googleMapLink) entry.googleMapLink = a.googleMapLink;
        if (!entry.groundLocation && a.groundLocation) entry.groundLocation = a.groundLocation;
        // Prefer groundPinCode, fall back to pinCode. Both PIN inputs on the REP
        // form sit under the "Trial Ground Location" heading and write pinCode
        // (REPModal.jsx:1487 heading, :1497 and :1201 inputs); nothing anywhere
        // writes groundPinCode. So pinCode IS the ground PIN the operator typed
        // -- 51 assignments carry it, 0 carry groundPinCode. Dropping the
        // fallback blanks the PIN on every row that has one, with no UI to
        // restore it. Keep groundPinCode first in case an input is ever added.
        if (!entry.groundPinCode && (a.groundPinCode || a.pinCode)) {
          entry.groundPinCode = a.groundPinCode || a.pinCode;
        }
      });
    });
    return m;
  }, [reps]);

  // Assignments whose (trial, city) pair the trial no longer lists. The join
  // above cannot see them, so an address recorded against one appears nowhere
  // on the table below — it is not missing data, it is unreachable data.
  // Listed rather than dropped, because the address is real work and the
  // pairing is repairable.
  const orphanAssignments = useMemo(() => {
    const known = new Set();
    trials.forEach((t) => (t.assignedCities || []).forEach((c) => {
      known.add(`${t.id}||${norm(c.cityName)}`);
    }));

    const out = [];
    reps.forEach((r) => {
      (r.cityAssignments || []).forEach((a) => {
        if (known.has(`${a.trialId}||${norm(a.city)}`)) return;
        const t = trials.find((x) => x.id === a.trialId);
        out.push({
          key: `${r.repName}||${a.trialId}||${a.city}`,
          rep: r.repName,
          city: a.city || '(no city)',
          project: (t && (t.trialName || t.trialCode)) || `Project ${a.trialId}`,
          hasAddress: Boolean(a.physicalAddress || a.courierAddress),
        });
      });
    });
    return out;
  }, [trials, reps]);

  // One row per (trial, city).
  const rows = useMemo(() => {
    const out = [];
    trials.forEach((t) => {
      // NOT '—'. That em-dash is a DISPLAY placeholder; putting it in the data
      // wrote the literal character into the Project cell of every exported row
      // and collapsed every unnamed project into a single '—' row of the
      // month matrix. Blank stays blank here; the table renders the dash.
      const projectName = t.trialName || t.trialType || '';
      (t.assignedCities || []).forEach((c) => {
        const assignment = repsByTrialCity.get(`${t.id}||${norm(c.cityName)}`);
        const assignedReps = assignment ? assignment.reps : [];
        out.push({
          trialId: t.id,
          projectName,
          trialType: t.trialType || '',
          season: t.season || '',
          state: c.state || '',
          city: c.cityName || '',
          // The venue NAME, and only that. It does NOT fall back to the address:
          // doing so made the exported Venue and Address columns print identical
          // text on every row.
          //
          // Both sources are now writable, and rows do carry a venue:
          //   - REPCityAssignment.ground_location: the "Ground Name" input in
          //     REPModal's ground section (REPModal.jsx:1234-1238) writes it.
          //     This is the normal path, and it is what fills the column today.
          //   - TrialCity.ground_location: trials/views.py add_city no longer
          //     hardcodes it to '' (trials/views.py:133 stores what is supplied);
          //     no screen sends it yet, so it is a fallback, not the source.
          // The "Ground Location" field on the trial City modal is still a
          // different thing -- it writes TrialCityLocation, the standalone city
          // catalogue in the trialcities app, which nothing copies into
          // TrialCity. Filling it in there does not reach this report.
          //
          // A blank cell now means no one typed a Ground Name on the REP's city
          // assignment, not that the column is unfillable.
          location: (assignment && assignment.groundLocation) || c.groundLocation || '',
          // All from the REP's city assignment, the only place any of them are
          // entered. groundPinCode completes the address; without it "full
          // address" is missing its last component.
          physicalAddress: assignment ? assignment.physicalAddress : '',
          googleMapLink: assignment ? assignment.googleMapLink : '',
          groundPinCode: assignment ? assignment.groundPinCode : '',
          month: monthOf(c),
          date: c.tentativeDate || '',
          confirmed: !!c.confirmed,
          reps: assignedReps,
          assigned: assignedReps.length > 0,
        });
        // addressOf runs a handful of regexes, and the cell, the map link, the
        // search filter and the CSV all want the same answer. Compute it once
        // here instead of per render -- the search box was re-deriving it for
        // every row on every keystroke.
        const justAdded = out[out.length - 1];
        justAdded.address = addressOf(justAdded);
        justAdded.mapHref = mapUrl(justAdded);
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
          // Search the address and PIN too, now that they are shown.
          norm(r.address).includes(q) ||
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

  // From filteredRows, not rows: the cards head a view the table, the month
  // matrix and the exports all read off the filtered set. Counting the whole
  // dataset here made them stay frozen while everything under them narrowed.
  const stats = useMemo(() => computeStats(filteredRows), [filteredRows]);

  // Typed twin of the CSV. Note the date is passed RAW, not through fmtDate:
  // the column is a real date cell, so Excel sorts and filters it properly,
  // and pre-formatting it would hand back a string that only sorts by accident.
  //
  // The Address column carries whatever the REP city assignment holds, and now
  // that addressOf no longer invents `city, state` for a blank one, an empty
  // cell here means exactly what it says: nobody has entered an address on
  // that assignment. Those blanks are the worklist.
  const exportExcel = () => exportReportExcel({
    sheetName: 'Trials',
    fileName: datedFileName('trials_report'),
    summary: `Trials — ${filteredRows.length} trial-cities`,
    columns: [
      { header: 'Project', width: 26 },
      'Season',
      'State',
      'City',
      { header: 'Venue', width: 24 },
      { header: 'Address', width: 44 },
      { header: 'Date', type: 'date' },
      { header: 'Map', width: 30 },
      'Confirmed',
      { header: 'REP(s)', width: 24 },
      'Assignment',
    ],
    rows: filteredRows.map((r) => [
      r.projectName, r.season, r.state, r.city, r.location, r.address,
      r.date || '', r.mapHref, r.confirmed ? 'Yes' : 'No',
      r.reps.join('; '), r.assigned ? 'Assigned' : 'Unassigned',
    ]),
  });

  const exportCSV = () => {
    const header = ['Project', 'Season', 'State', 'City', 'Venue', 'Address', 'Date', 'Map', 'Confirmed', 'REP(s)', 'Assignment'];
    const lines = filteredRows.map((r) => [
      r.projectName, r.season, r.state, r.city, r.location, r.address,
      r.date ? fmtDate(r.date) : '', r.mapHref, r.confirmed ? 'Yes' : 'No',
      r.reps.join('; '), r.assigned ? 'Assigned' : 'Unassigned',
    ]);
    const blob = csvBlob([header, ...lines]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trials_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Rows have to accommodate a wrapped multi-line address now that the full one
  // is shown, so cells get more vertical padding and align to the top — centring
  // a one-word cell against a four-line address reads as misaligned.
  const cellSx = { fontSize: '0.82rem', py: 1.25, verticalAlign: 'top', lineHeight: 1.5 };
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
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel}
              disabled={filteredRows.length === 0}
              sx={{ textTransform: 'none', borderRadius: 1.5, borderColor: '#0d9488', color: '#0d9488' }}>
              Export Excel
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
                      <TableCell colSpan={matrix.monthsUsed.length + 2} align="center" sx={{ py: 4, color: '#5A6B82' }}>
                        No trials match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matrix.projects.map((p) => {
                      const rowTotal = matrix.monthsUsed.reduce((s, m) => s + (matrix.counts[p][m] || 0), 0);
                      return (
                        <TableRow key={p} hover>
                          <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{p || '—'}</TableCell>
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

            {orphanAssignments.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {orphanAssignments.length} REP assignment{orphanAssignments.length === 1 ? '' : 's'} point at a city their project no longer lists
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  These have no row in the table below, so any address recorded against them cannot be shown. Move the assignment to the project that lists the city, or add the city back to this one.
                </Typography>
                {orphanAssignments.map((o) => (
                  <Typography key={o.key} variant="caption" sx={{ display: 'block' }}>
                    {o.rep} — {o.city} on {o.project}{o.hasAddress ? ' (has an address on file)' : ''}
                  </Typography>
                ))}
              </Alert>
            )}

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
                    {/* Venue sits between City and Address, exactly where both
                        exports put it. It reads `r.location` — the same single
                        field the Excel and CSV builders print under their own
                        'Venue' header — so the screen and the export cannot
                        drift apart. Until this row existed, a user who typed a
                        Ground Name saw it in the export and nowhere on the
                        screen they typed it into. */}
                    {['Project', 'Season', 'State', 'City', 'Venue', 'Address', 'Date', 'Map', 'REP', 'Status'].map((h) => (
                      <TableCell key={h} sx={headSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5, color: '#5A6B82' }}>
                        No trial cities match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r, i) => (
                      <TableRow key={`${r.trialId}-${r.city}-${i}`} hover>
                        <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{r.projectName || '—'}</TableCell>
                        <TableCell sx={cellSx}>{r.season || '—'}</TableCell>
                        {/* nowrap on these two: they were each stacking onto
                            2-3 lines and inflating row height while the address
                            went short of width. */}
                        <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{r.state || '—'}</TableCell>
                        <TableCell sx={{ ...cellSx, minWidth: 120 }}>{r.city || '—'}</TableCell>
                        {/* Venue = the ground NAME only, never the address —
                            same `r.location` the exports use. Most rows are
                            blank today because the Ground Name input is new,
                            which is expected, not a bug to paper over. The dash
                            is the same grey placeholder the Map column uses for
                            an absent value. */}
                        <TableCell sx={{ ...cellSx, minWidth: 140 }}>
                          {r.location || <span style={{ color: '#cbd5e1' }}>—</span>}
                        </TableCell>
                        {/* The full address, PIN included. There is no separate
                            Address column on screen, so this cell has to carry
                            the whole thing — truncating it here is what made the
                            report look like it was still missing the address. */}
                        <TableCell sx={{ ...cellSx, minWidth: 260 }}>
                          {r.address || (
                            r.assigned
                              // Assigned but blank is an INSTRUCTION, not a gap:
                              // the address is entered on the REP city
                              // assignment and nowhere else, so this names the
                              // one place a person can go and fix it.
                              ? <span style={{ color: '#A35905' }}>No address on the assignment</span>
                              : <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</TableCell>
                        <TableCell sx={cellSx}>
                          {r.mapHref
                            ? <a href={r.mapHref} target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>Map</a>
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
