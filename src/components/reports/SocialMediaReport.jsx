import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, MenuItem,
  Paper, Checkbox, Button, Chip, Collapse, IconButton,
  Stack, CircularProgress, Snackbar, Alert, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Download as DownloadIcon,
  Language as WebIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { reportsAPI } from '../../services/api';
import { storedFile, useStoredFile, downloadRepFile } from '../rep/repFiles';
import {
  countDocumentGaps, filterByGap, describeSkipped, MISSING_LOGO, MISSING_MOU,
} from './reportDocumentGaps';

// ── Styles ───────────────────────────────────────────────────────────────────

const secHeaderSx = {
  fontSize: '0.8rem', fontWeight: 700, color: '#3B82F6',
  textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5,
};

// ── Social icon helper ───────────────────────────────────────────────────────

function SocialLink({ url, label }) {
  if (!url) return null;
  return (
    <Tooltip title={label}>
      <Box
        component="a" href={url} target="_blank" rel="noopener noreferrer"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          fontSize: '0.875rem', color: '#3B82F6', fontWeight: 600,
          textDecoration: 'none', px: 1.5, py: 0.75, borderRadius: 1.5,
          border: '1px solid #e2e8f0', bgcolor: '#f8fafc',
          '&:hover': { bgcolor: '#eff6ff', borderColor: '#93c5fd' },
        }}
      >
        <WebIcon sx={{ fontSize: 16 }} /> {label}
      </Box>
    </Tooltip>
  );
}

// ── REP Card ─────────────────────────────────────────────────────────────────

function DownloadingNote() {
  return (
    <Button size="small" disabled
      sx={{ textTransform: 'none', fontSize: '0.8rem', minWidth: 0, py: 0, px: 0.5 }}>
      Downloading…
    </Button>
  );
}

function REPReportCard({ rep, selected, onSelect, onDownload, busy }) {
  const [expanded, setExpanded] = useState(false);
  // The logo preview lives in the collapsed section, so an uploaded logo is
  // fetched the first time the row is opened, and kept while it stays mounted.
  const [opened, setOpened] = useState(false);
  const mou = storedFile(rep, 'mou');
  const logo = storedFile(rep, 'logo');
  const logoPreview = useStoredFile(rep, 'logo', opened);

  const assignments = rep.cityAssignments || [];
  const uniqueCities = [...new Set(assignments.map(a => a.city).filter(Boolean))];
  const uniqueSeasons = [...new Set(assignments.map(a => a.trialSeason).filter(Boolean))];
  const uniqueProjects = [...new Set(assignments.map(a => a.trialType).filter(Boolean))];

  return (
    <Paper
      elevation={0}
      sx={{
        border: selected ? '2px solid #3B82F6' : '1px solid #e2e8f0',
        borderRadius: 3, overflow: 'hidden', transition: 'all 0.2s',
        bgcolor: selected ? '#f0f7ff' : '#fff',
        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      }}
    >
      {/* Line 1: REP Name + Season + Project + Cities + Checkbox */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', px: 2.5, py: 1.75,
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', flex: '0 0 auto' }}>
          {rep.repName}
        </Typography>

        <Stack direction="row" spacing={0.75} sx={{ flex: 1, flexWrap: 'wrap', gap: 0.75, overflow: 'hidden', alignItems: 'center' }}>
          {/* Season chips — green */}
          {uniqueSeasons.map(s => (
            <Chip key={`s-${s}`} label={s} size="small"
              sx={{ fontSize: '0.8rem', fontWeight: 600, bgcolor: '#ecfdf5', color: '#047857', height: 26, borderRadius: 1.5 }} />
          ))}
          {/* Project chips — purple */}
          {uniqueProjects.map(p => (
            <Chip key={`p-${p}`} label={p} size="small"
              sx={{ fontSize: '0.8rem', fontWeight: 600, bgcolor: '#f5f3ff', color: '#7c3aed', height: 26, borderRadius: 1.5 }} />
          ))}
          {/* City chips — blue */}
          {uniqueCities.slice(0, 4).map(city => (
            <Chip key={city} label={city} size="small"
              sx={{ fontSize: '0.8rem', fontWeight: 600, bgcolor: '#eff6ff', color: '#1d4ed8', height: 26, borderRadius: 1.5 }} />
          ))}
          {uniqueCities.length > 4 && (
            <Chip label={`+${uniqueCities.length - 4}`} size="small"
              sx={{ fontSize: '0.8rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b', height: 26, borderRadius: 1.5 }} />
          )}
        </Stack>

        <Checkbox
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onSelect(rep.id); }}
          onClick={(e) => e.stopPropagation()}
          size="small"
          sx={{ p: 0, flexShrink: 0 }}
        />
      </Box>

      {/* Line 2: Contact + Documents (always visible) */}
      <Box sx={{
        px: 2.5, pb: 1.75, pt: 0,
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Typography sx={{ fontSize: '0.9rem', color: '#475569' }}>
          <Box component="span" sx={{ fontWeight: 600, color: '#334155' }}>Contact:</Box>{' '}
          {rep.contactName || 'N/A'}
          {rep.phone ? ` · ${rep.phone}` : ''}
        </Typography>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', px: 1.5, py: 0.5, borderRadius: 2, border: '1px solid #e5e7eb' }}>
          {/* MOU */}
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>MOU</Typography>
          {mou.shown ? (busy.mou ? <DownloadingNote /> : (
            <IconButton size="small"
              aria-label="Download MOU"
              onClick={(e) => { e.stopPropagation(); onDownload(rep, 'mou'); }}
              sx={{ p: 0.5, color: '#3B82F6', '&:hover': { bgcolor: '#dbeafe' } }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )) : (
            <Typography sx={{ fontSize: '0.85rem', color: '#5A6B82' }}>N/A</Typography>
          )}

          <Box sx={{ width: '1px', height: 20, bgcolor: '#d1d5db' }} />

          {/* Logo */}
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Logo</Typography>
          {logo.shown ? (busy.logo ? <DownloadingNote /> : (
            <IconButton size="small"
              aria-label="Download logo"
              onClick={(e) => { e.stopPropagation(); onDownload(rep, 'logo'); }}
              sx={{ p: 0.5, color: '#3B82F6', '&:hover': { bgcolor: '#dbeafe' } }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )) : (
            <Typography sx={{ fontSize: '0.85rem', color: '#5A6B82' }}>N/A</Typography>
          )}

          {/* MOU Status */}
          {rep.mouStatus && (
            <>
              <Box sx={{ width: '1px', height: 20, bgcolor: '#d1d5db' }} />
              <Chip label={rep.mouStatus} size="small"
                sx={{
                  fontSize: '0.78rem', fontWeight: 700, height: 24,
                  bgcolor: rep.mouStatus === 'Signed' ? '#dcfce7' : rep.mouStatus === 'Pending' ? '#fef9c3' : '#f1f5f9',
                  color: rep.mouStatus === 'Signed' ? '#16a34a' : rep.mouStatus === 'Pending' ? '#854d0e' : '#475569',
                }} />
            </>
          )}
        </Box>
      </Box>

      {!expanded && (
        <Button
          fullWidth
          disableElevation
          variant="text"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); setOpened(true); }}
          startIcon={<KeyboardArrowDownIcon sx={{ fontSize: 22 }} />}
          sx={{
            textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
            color: '#475569', py: 1.25,
            borderTop: '1px solid #e5e7eb', borderRadius: 0,
            justifyContent: 'center',
            '&:hover': { bgcolor: '#f8fafc' },
          }}
        >
          More
        </Button>
      )}

      {/* Expanded section */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, pb: 0, pt: 1, borderTop: '1px solid #e5e7eb' }}>

          {/* Logo preview */}
          {logo.shown && (
            <Box sx={{ mt: 1.5, mb: 2.5 }}>
              {logoPreview.status === 'ready' && (
                <Box component="img" src={logoPreview.src} alt="Logo"
                  sx={{ height: 48, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 2, p: 1, bgcolor: '#f9fafb' }} />
              )}
              {/* Same height as the logo, so the row does not move when it lands. */}
              {(logoPreview.status === 'loading' || logoPreview.status === 'idle') && (
                <Box role="status" aria-label="Loading logo"
                  sx={{ height: 48, width: 96, border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#f1f5f9' }} />
              )}
              {logoPreview.status === 'error' && (
                <Box sx={{ height: 48, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: 'error.main' }}>Couldn't load</Typography>
                  <Button size="small" onClick={logoPreview.retry}
                    sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Retry
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Assigned Trial Cities */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={secHeaderSx}>
              Assigned Trials ({assignments.length})
            </Typography>
            {assignments.length > 0 ? (
              <Stack spacing={1}>
                {assignments.map(a => (
                  <Box key={a.id} sx={{ p: 1.75, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                      {[a.trialSeason, a.trialType, a.city].filter(Boolean).join(' | ')}
                    </Typography>
                    {(a.physicalAddress || a.groundLocation) && (
                      <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.25 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>Trial Address:</Box>{' '}
                        {a.physicalAddress || a.groundLocation}
                        {a.googleMapLink && (
                          <Box component="a" href={a.googleMapLink} target="_blank" rel="noopener noreferrer"
                            sx={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600, ml: 0.5 }}>(Map)</Box>
                        )}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.25 }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>Trial Contact:</Box>{' '}
                      {a.groundContactName || 'Not Available'}
                      {a.groundContactPhone ? ` · ${a.groundContactPhone}` : ''}
                    </Typography>
                    {a.reportingTime && (
                      <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.25 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>Trial Time:</Box>{' '}
                        {a.reportingTime}
                      </Typography>
                    )}
                    {a.trialDate && (
                      <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.25 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>Trial Date:</Box>{' '}
                        {a.trialDate}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: '0.9rem', color: '#5A6B82', fontStyle: 'italic' }}>
                No assignments
              </Typography>
            )}
          </Box>

          {/* Social Links */}
          {(rep.website || rep.facebook || rep.instagram || rep.telegram) && (
            <Box>
              <Typography sx={secHeaderSx}>Social Presence</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {!rep.websiteNA && <SocialLink url={rep.website} label="Website" />}
                {!rep.facebookNA && <SocialLink url={rep.facebook} label="Facebook" />}
                {!rep.instagramNA && <SocialLink url={rep.instagram} label="Instagram" />}
                {!rep.telegramNA && <SocialLink url={rep.telegram} label="Telegram" />}
              </Stack>
            </Box>
          )}

          <Button
            fullWidth
            disableElevation
            variant="text"
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            startIcon={<KeyboardArrowUpIcon sx={{ fontSize: 22 }} />}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
              color: '#475569', py: 1.25, mt: 2,
              borderTop: '1px solid #e5e7eb', borderRadius: 0,
              justifyContent: 'center',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            Less
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SocialMediaReport() {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  // Which paperwork gap the list is narrowed to, if any. Null = show everything.
  const [gapFilter, setGapFilter] = useState(null);
  const [filterSeason, setFilterSeason] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [downloading, setDownloading] = useState(false);
  // Download Selected progress: { current, total } while files are fetched.
  const [progress, setProgress] = useState(null);
  // Row download buttons in flight, keyed `${repId}:${kind}`.
  const [busy, setBusy] = useState({});
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success', retry: null });

  const showToast = (message, severity = 'success', retry = null) =>
    setToast({ open: true, message, severity, retry });
  const closeToast = () => setToast(t => ({ ...t, open: false }));

  useEffect(() => {
    reportsAPI.socialMedia()
      .then(res => setReps(res.reps || []))
      .catch(() => showToast('Failed to load REPs', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Unique seasons and projects for filters
  const { seasons, projects } = useMemo(() => {
    const s = new Set();
    const p = new Set();
    reps.forEach(r => (r.cityAssignments || []).forEach(a => {
      if (a.trialSeason) s.add(a.trialSeason);
      if (a.trialType) p.add(a.trialType);
    }));
    return { seasons: [...s].sort(), projects: [...p].sort() };
  }, [reps]);

  // Filtered REPs
  // Counted over the whole roster, not the filtered view, so the numbers do not
  // shrink as you narrow the list — they are the size of the job.
  const gaps = useMemo(() => countDocumentGaps(reps), [reps]);

  const filtered = useMemo(() => {
    let result = [...reps];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.repName?.toLowerCase().includes(q) ||
        r.contactName?.toLowerCase().includes(q) ||
        (r.cityAssignments || []).some(a =>
          a.city?.toLowerCase().includes(q) ||
          a.trialType?.toLowerCase().includes(q)
        )
      );
    }
    if (filterSeason) {
      result = result.filter(r =>
        (r.cityAssignments || []).some(a => a.trialSeason === filterSeason)
      );
    }
    if (filterProject) {
      result = result.filter(r =>
        (r.cityAssignments || []).some(a => a.trialType === filterProject)
      );
    }
    // Applied last so the gap counts in the header always describe the whole
    // roster, while the list below narrows to the ones needing attention.
    result = filterByGap(result, gapFilter);
    return result;
  }, [reps, search, filterSeason, filterProject, gapFilter]);

  // Selection handlers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  // Each file is fetched at the click. These name the ones that failed.
  const fileLabel = ({ rep, kind }) => `${rep.repName} ${kind === 'logo' ? 'logo' : 'MoU'}`;
  const failureText = (failed) => `Couldn't download ${failed.map(fileLabel).join(', ')}.`;

  const handleRowDownload = async (rep, kind) => {
    const key = `${rep.id}:${kind}`;
    setBusy(b => ({ ...b, [key]: true }));
    try {
      await downloadRepFile(rep, kind);
    } catch {
      showToast(failureText([{ rep, kind }]), 'error', () => handleRowDownload(rep, kind));
    } finally {
      setBusy(b => {
        const next = { ...b };
        delete next[key];
        return next;
      });
    }
  };

  // Download the given files in order, logo before MoU per REP, with a small
  // delay between REPs to avoid browser blocking. Returns the ones that failed.
  const downloadAll = async (items) => {
    const failed = [];
    for (let i = 0; i < items.length; i++) {
      setProgress({ current: i + 1, total: items.length });
      try {
        await downloadRepFile(items[i].rep, items[i].kind);
      } catch {
        failed.push(items[i]);
      }
      const next = items[i + 1];
      if (next && next.rep !== items[i].rep) await new Promise(r => setTimeout(r, 500));
    }
    return failed;
  };

  const retryFailed = async (items) => {
    setDownloading(true);
    try {
      const failed = await downloadAll(items);
      if (failed.length) showToast(failureText(failed), 'error', () => retryFailed(failed));
      else showToast(`Downloaded ${items.length} file(s).`);
    } finally {
      setProgress(null);
      setDownloading(false);
    }
  };

  // Bulk download
  const handleBulkDownload = async () => {
    const selectedReps = reps.filter(r => selected.has(r.id));
    if (selectedReps.length === 0) return;
    setDownloading(true);
    try {
      const items = [];
      for (const rep of selectedReps) {
        for (const kind of ['logo', 'mou']) {
          if (storedFile(rep, kind).shown) items.push({ rep, kind });
        }
      }
      const failed = await downloadAll(items);
      const fileCount = items.length - failed.length;
      // Name what could not be included. The count alone made a gap invisible:
      // "12 file(s) from 10 REP(s)" needs arithmetic to notice 8 are absent,
      // and never said which — so missing paperwork read as a broken download.
      const skipped = describeSkipped(selectedReps);
      if (failed.length > 0) {
        showToast(
          (fileCount > 0 ? `Downloaded ${fileCount} file(s) from ${selectedReps.length} REP(s). ` : '')
          + failureText(failed)
          + (skipped ? ` ${skipped}` : ''),
          'error',
          () => retryFailed(failed),
        );
      } else if (fileCount > 0) {
        showToast(
          `Downloaded ${fileCount} file(s) from ${selectedReps.length} REP(s).`
          + (skipped ? ` ${skipped}` : ''),
          skipped ? 'warning' : 'success',
        );
      } else {
        showToast(`No documents available for selected REPs. ${skipped}`.trim(), 'warning');
      }
    } finally {
      setProgress(null);
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#FBB040' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
          REP Report
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          {reps.length} REPs &middot; {reps.reduce((sum, r) => sum + (r.cityAssignments || []).length, 0)} assignments
        </Typography>

        {/* The paperwork this report exists to hand out, and what is missing.
            Counts describe the whole roster; clicking one narrows the list to
            exactly those, so a gap becomes a finite to-do list instead of
            something you find by scrolling every row. */}
        {(gaps.missingLogo > 0 || gaps.missingMou > 0) && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            {gaps.missingLogo > 0 && (
              <Chip
                size="small"
                label={`${gaps.missingLogo} missing logo`}
                onClick={() => setGapFilter(g => (g === MISSING_LOGO ? null : MISSING_LOGO))}
                variant={gapFilter === MISSING_LOGO ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 700, fontSize: '0.78rem',
                  color: gapFilter === MISSING_LOGO ? '#fff' : '#854d0e',
                  bgcolor: gapFilter === MISSING_LOGO ? '#a16207' : 'transparent',
                  borderColor: '#a16207',
                  '&:hover': { bgcolor: gapFilter === MISSING_LOGO ? '#854d0e' : '#fef9c3' },
                }}
              />
            )}
            {gaps.missingMou > 0 && (
              <Chip
                size="small"
                label={`${gaps.missingMou} missing MoU`}
                onClick={() => setGapFilter(g => (g === MISSING_MOU ? null : MISSING_MOU))}
                variant={gapFilter === MISSING_MOU ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 700, fontSize: '0.78rem',
                  color: gapFilter === MISSING_MOU ? '#fff' : '#854d0e',
                  bgcolor: gapFilter === MISSING_MOU ? '#a16207' : 'transparent',
                  borderColor: '#a16207',
                  '&:hover': { bgcolor: gapFilter === MISSING_MOU ? '#854d0e' : '#fef9c3' },
                }}
              />
            )}
            {gapFilter && (
              <Chip size="small" label="Show all" variant="outlined"
                onClick={() => setGapFilter(null)}
                sx={{ fontSize: '0.78rem', color: '#475569', borderColor: '#cbd5e1' }} />
            )}
          </Stack>
        )}
      </Box>

      {/* Toolbar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e5e7eb', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={filtered.length > 0 && selected.size === filtered.length}
              indeterminate={selected.size > 0 && selected.size < filtered.length}
              onChange={toggleSelectAll}
              size="small"
            />
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
              {selected.size > 0 ? `${selected.size} selected` : 'Select All'}
            </Typography>
          </Box>

          <TextField
            size="small" placeholder="Search REP, city, project..."
            value={search} onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#5A6B82' }} /></InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <TextField
            select size="small" value={filterSeason}
            onChange={e => setFilterSeason(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">All Seasons</MenuItem>
            {seasons.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>

          <TextField
            select size="small" value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">All Projects</MenuItem>
            {projects.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>

          <Box sx={{ ml: 'auto' }}>
            <Button
              variant="contained" startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              onClick={handleBulkDownload}
              disabled={selected.size === 0 || downloading}
              sx={{
                textTransform: 'none', fontWeight: 700, borderRadius: 2,
                bgcolor: '#FBB040', '&:hover': { bgcolor: '#E89F2C' },
                '&.Mui-disabled': { bgcolor: '#e5e7eb' },
              }}
            >
              {downloading
                ? (progress && progress.total > 1 ? `Downloading ${progress.current} of ${progress.total}…` : 'Downloading…')
                : `Download Selected (${selected.size})`}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* REP Cards */}
      <Stack spacing={1.5}>
        {filtered.length > 0 ? (
          filtered.map(rep => (
            <REPReportCard
              key={rep.id}
              rep={rep}
              selected={selected.has(rep.id)}
              onSelect={toggleSelect}
              onDownload={handleRowDownload}
              busy={{ logo: !!busy[`${rep.id}:logo`], mou: !!busy[`${rep.id}:mou`] }}
            />
          ))
        ) : (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 3 }}>
            <Typography color="text.secondary">No REPs found</Typography>
          </Paper>
        )}
      </Stack>

      {/* Toast */}
      {/* 3s was fine for "Downloaded 12 files". It is not long enough to read a
          list of organisation names, so a message that names them stays up. */}
      {/* A failed download stays until it is retried or closed. */}
      <Snackbar open={toast.open}
        autoHideDuration={toast.retry ? null : (toast.severity === 'warning' ? 10000 : 3000)}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={closeToast}
          action={toast.retry ? (
            <>
              <Button color="inherit" size="small" onClick={() => { closeToast(); toast.retry(); }}
                sx={{ textTransform: 'none', fontWeight: 700 }}>
                Retry
              </Button>
              <IconButton color="inherit" size="small" aria-label="Close" onClick={closeToast}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : undefined}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
