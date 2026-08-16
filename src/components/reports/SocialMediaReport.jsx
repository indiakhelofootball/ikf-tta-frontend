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
} from '@mui/icons-material';
import { reportsAPI } from '../../services/api';
import { downloadLogo, downloadMOU } from '../../utils/downloadHelpers';

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

function REPReportCard({ rep, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  /** Keep document URLs once seen so download actions stay available (avoids flicker / blob / prop clears after download). */
  const [stableMouUrl, setStableMouUrl] = useState(() => rep.mouDocumentUrl || '');
  const [stableLogoUrl, setStableLogoUrl] = useState(() => rep.repLogoUrl || '');

  useEffect(() => {
    if (rep.mouDocumentUrl) setStableMouUrl(rep.mouDocumentUrl);
  }, [rep.mouDocumentUrl]);

  useEffect(() => {
    if (rep.repLogoUrl) setStableLogoUrl(rep.repLogoUrl);
  }, [rep.repLogoUrl]);

  const assignments = rep.cityAssignments || [];
  const uniqueCities = [...new Set(assignments.map(a => a.city).filter(Boolean))];
  const uniqueSeasons = [...new Set(assignments.map(a => a.trialSeason).filter(Boolean))];
  const uniqueProjects = [...new Set(assignments.map(a => a.trialType).filter(Boolean))];

  const repForDocs = useMemo(
    () => ({ ...rep, mouDocumentUrl: stableMouUrl, repLogoUrl: stableLogoUrl }),
    [rep, stableMouUrl, stableLogoUrl]
  );

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
          {stableMouUrl ? (
            <IconButton size="small"
              aria-label="Download MOU"
              onClick={(e) => { e.stopPropagation(); downloadMOU(repForDocs, assignments[0] || {}); }}
              sx={{ p: 0.5, color: '#3B82F6', '&:hover': { bgcolor: '#dbeafe' } }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <Typography sx={{ fontSize: '0.85rem', color: '#5A6B82' }}>N/A</Typography>
          )}

          <Box sx={{ width: '1px', height: 20, bgcolor: '#d1d5db' }} />

          {/* Logo */}
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Logo</Typography>
          {stableLogoUrl ? (
            <IconButton size="small"
              aria-label="Download logo"
              onClick={(e) => { e.stopPropagation(); downloadLogo(repForDocs, uniqueCities[0] || rep.repName); }}
              sx={{ p: 0.5, color: '#3B82F6', '&:hover': { bgcolor: '#dbeafe' } }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
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
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
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
          {stableLogoUrl && (
            <Box sx={{ mt: 1.5, mb: 2.5 }}>
              <Box component="img" src={stableLogoUrl} alt="Logo"
                sx={{ height: 48, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 2, p: 1, bgcolor: '#f9fafb' }} />
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
  const [filterSeason, setFilterSeason] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

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
    return result;
  }, [reps, search, filterSeason, filterProject]);

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

  // Bulk download
  const handleBulkDownload = async () => {
    const selectedReps = reps.filter(r => selected.has(r.id));
    if (selectedReps.length === 0) return;
    setDownloading(true);
    try {
      let fileCount = 0;
      for (const rep of selectedReps) {
        const cities = [...new Set((rep.cityAssignments || []).map(a => a.city).filter(Boolean))];
        const city = cities[0] || rep.repName;
        const assignment = (rep.cityAssignments || [])[0] || {};
        if (rep.repLogoUrl) { await downloadLogo(rep, city); fileCount++; }
        if (rep.mouDocumentUrl) { await downloadMOU(rep, assignment); fileCount++; }
        // Small delay between REPs to avoid browser blocking
        if (selectedReps.length > 1) await new Promise(r => setTimeout(r, 500));
      }
      if (fileCount > 0) {
        showToast(`Downloaded ${fileCount} file(s) from ${selectedReps.length} REP(s)`);
      } else {
        showToast('No documents available for selected REPs', 'warning');
      }
    } catch {
      showToast('Some downloads may have failed', 'warning');
    } finally {
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
              {downloading ? 'Downloading...' : `Download Selected (${selected.size})`}
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
            />
          ))
        ) : (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 3 }}>
            <Typography color="text.secondary">No REPs found</Typography>
          </Paper>
        )}
      </Stack>

      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
