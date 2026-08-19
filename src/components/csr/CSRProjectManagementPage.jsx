// src/components/csr/CSRProjectManagementPage.jsx
//
// The grants list, as master-detail: pick on the left, read on the right.
//
// SCOPE — why the right pane is a SUMMARY and not the whole project page.
// /csr/:id (CSRProjectDetailPage, 631 lines) owns the deep record: six tabs,
// five collections fetched per grant, certificate freeze, PDF export. Embedding
// it here would mean two components rendering the same six tabs against the
// same five endpoints, and the day someone adds a tab to one of them the two
// screens start telling different stories. It would also fetch five collections
// for a grant the user has only glanced at. So this pane renders exactly what
// the list already has in hand — the project record itself, through the SAME
// CSRProjectDetailView the project page's Overview tab renders — and the full
// record stays one route away. /csr/:id therefore keeps working unchanged for
// anyone who lands on it directly, from a bookmark or a link.
//
// WHAT IS NOT BUILT from the reference mockup, and why:
//   - Its 24 projects across 8 pages. There are three. Pagination is real and
//     therefore invisible below one page.
//   - Its amounts (Acme at ₹18,50,000). The API says ₹10,00,000.
//   - Milestones / Impact / Financials tabs, and Beneficiaries / Locations /
//     Focus Area fields. None of them exist in the model.
//   - Its soft shadows. Lines, not shadows.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert, Chip,
  CircularProgress, TextField, InputAdornment, MenuItem, Pagination,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';

import ConfirmDialog from '../common/ConfirmDialog';
import CSRProjectCard, { grantInk, statusInk, formatMoney } from './CSRProjectCard';
import CSRProjectDetailView, { ttaProjectIdentity } from './CSRProjectDetailView';
import CSRProjectModal from './CSRProjectModal';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { surfaces, inks, figure, density } from '../../styles/ttaTheme';

const PAGE_SIZE = 8;

const SORTS = {
  latest: { label: 'Latest', compare: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) },
  name: { label: 'Name', compare: (a, b) => String(a.name || '').localeCompare(String(b.name || '')) },
  amount: { label: 'Amount', compare: (a, b) => (Number(b.sanctionedAmount) || 0) - (Number(a.sanctionedAmount) || 0) },
};

const panel = {
  bgcolor: surfaces.surface,
  border: `1px solid ${surfaces.hairline}`,
  borderRadius: 2.5,
  overflow: 'hidden',
};

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CSRProjectManagementPage() {
  const { canEdit } = useGrants();
  const editable = canEdit('csr');
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState('latest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  // One shared slot for whichever delete is being confirmed:
  // { title, message, confirmLabel, onConfirm }.
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await csrAPI.projects.getAll();
      setProjects(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      notify(e.message || 'Failed to load projects.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(() => load(true));

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (project) => { setEditing(project); setModalOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await csrAPI.projects.update(editing.id, payload);
        notify('Project updated.');
      } else {
        await csrAPI.projects.create(payload);
        notify('Project created.');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (project) => {
    setConfirmState({
      title: 'Delete CSR project',
      message: `Delete CSR project "${project.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setSaving(true);
        try {
          await csrAPI.projects.delete(project.id);
          notify('Project deleted.');
          load();
        } catch (e) {
          notify(e.message || 'Delete failed.', 'error');
        } finally {
          setSaving(false);
          setConfirmState(null);
        }
      },
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => (statusFilter === 'All' ? true : p.status === statusFilter))
      .filter((p) => {
        if (!q) return true;
        // The identity is on the row, so it has to be searchable too — an
        // operator looking for "Season 6" expects the grants under it.
        return (
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.ttaProjectName?.toLowerCase().includes(q) ||
          p.season?.toLowerCase().includes(q)
        );
      })
      .sort(SORTS[sortKey].compare);
  }, [projects, search, statusFilter, sortKey]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Selection has to survive a refetch and follow the filter. If whatever was
  // selected is no longer on the page, the first row takes over — the detail
  // pane is never left showing a grant the list no longer contains.
  useEffect(() => {
    if (!paged.length) { if (selectedId !== null) setSelectedId(null); return; }
    if (!paged.some((p) => p.id === selectedId)) setSelectedId(paged[0].id);
  }, [paged, selectedId]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sortKey]);

  const selected = filtered.find((p) => p.id === selectedId) || null;

  // ── Header ───────────────────────────────────────────────────────────────
  const header = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}
    >
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>CSR Projects</Typography>
        <Typography variant="body2" color="text.secondary">
          Every grant IKF holds, and what has been promised against it.
        </Typography>
      </Box>
      {editable && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Project
        </Button>
      )}
    </Stack>
  );

  const controls = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <TextField
        placeholder="Search by project, funder or TTA project…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
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
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        sx={{ minWidth: { sm: 180 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><FilterIcon fontSize="small" /></InputAdornment>
            ),
          },
        }}
      >
        <MenuItem value="All">All statuses</MenuItem>
        <MenuItem value="Active">Active</MenuItem>
        <MenuItem value="Closed">Closed</MenuItem>
      </TextField>
    </Stack>
  );

  // ── Master ───────────────────────────────────────────────────────────────
  const master = (
    <Box sx={{ ...panel, width: { xs: '100%', lg: 360 }, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 1, px: 2, py: 1.25,
          bgcolor: surfaces.sunken,
          borderBottom: `1px solid ${surfaces.hairline}`,
        }}
      >
        <Typography variant="caption">
          All Projects ({filtered.length})
        </Typography>
        <TextField
          select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          variant="standard"
          aria-label="Sort projects"
          sx={{ '& .MuiInput-input': { fontSize: '0.75rem', py: 0 } }}
          slotProps={{ input: { disableUnderline: true } }}
        >
          {Object.entries(SORTS).map(([key, s]) => (
            <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>Sort: {s.label}</MenuItem>
          ))}
        </TextField>
      </Box>

      {paged.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ px: 2, py: 5, textAlign: 'center' }}>
          {projects.length === 0 ? 'No CSR projects yet.' : 'No projects match this search.'}
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{ m: 0, p: 0, flexGrow: 1, overflowY: 'auto', maxHeight: { lg: 'calc(100vh - 300px)' } }}
        >
          {paged.map((p) => (
            <CSRProjectCard
              key={p.id}
              project={p}
              selected={p.id === selectedId}
              onSelect={(proj) => setSelectedId(proj.id)}
            />
          ))}
        </Box>
      )}

      {/* Three grants fit on one page, so this does not render. It is here for
          the day the list is long, not to imply that it already is. */}
      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5, borderTop: `1px solid ${surfaces.hairlineSoft}` }}>
          <Pagination
            size="small"
            count={pageCount}
            page={safePage}
            onChange={(e, v) => setPage(v)}
          />
        </Box>
      )}
    </Box>
  );

  // ── Detail ───────────────────────────────────────────────────────────────
  const detail = (() => {
    if (!selected) {
      return (
        <Box sx={{ ...panel, flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 320 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {projects.length === 0 ? 'No grants yet' : 'Nothing selected'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {projects.length === 0
                ? 'A CSR project records what a funder sanctioned and what IKF promised in return.'
                : 'Clear the search or pick a project on the left to read its record.'}
            </Typography>
            {projects.length === 0 && editable && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2.5 }}>
                New Project
              </Button>
            )}
          </Box>
        </Box>
      );
    }

    const ink = grantInk(selected.id);
    const status = statusInk(selected.status);
    const identity = ttaProjectIdentity(selected);
    const created = fmtDate(selected.createdAt);
    const updated = fmtDate(selected.updatedAt);

    return (
      <Box sx={{ ...panel, flexGrow: 1, minWidth: 0 }}>
        {/* The grant's identity ink, as a rule across the top of its pane —
            the same colour its row carries, so the eye connects the two. */}
        <Box aria-hidden sx={{ height: 3, bgcolor: ink.fill }} />
        <Box sx={{ p: { xs: 2.5, lg: density.workspace.cardPadding / 8 } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              {identity && (
                <Typography variant="overline" sx={{ display: 'block', letterSpacing: '0.08em', lineHeight: 1.6 }}>
                  {identity}
                </Typography>
              )}
              <Typography variant="h4" sx={{ mb: 0.75 }}>{selected.name}</Typography>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                {/* Teal is the outward-facing ink and a funder is the only
                    outward-facing thing on this pane. */}
                <Typography variant="body2" sx={{ color: inks.teal.text, fontWeight: 500 }}>
                  {selected.clientName || 'No funder recorded'}
                </Typography>
                <Box aria-hidden sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: surfaces.hairline }} />
                <Box sx={{ ...figure.row }}>{formatMoney(selected.sanctionedAmount)}</Box>
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Chip
                size="small"
                label={selected.status}
                sx={{ bgcolor: surfaces.sunken, color: status.text, mr: 0.5 }}
              />
              {editable && (
                <>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(selected)} aria-label="Edit project">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(selected)} aria-label="Delete project">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Stack>

          {/* The metadata grid, certificate state and description — rendered by
              the same component the project page's Overview tab uses, so the
              two can never drift. */}
          <Box
            sx={{
              mx: -2,
              // Two presentational corrections applied from OUTSIDE the shared
              // component, because it is also rendered inside the project
              // page's Overview tab and inside nothing else here may change:
              //   1. its fields are a wrapping row, which in a pane this wide
              //      leaves ragged columns — a four-column grid reads as the
              //      record it is.
              //   2. the Contract field's value is a link, and an inline <a>
              //      lands beside its own label instead of under it.
              '& .MuiStack-root': {
                display: 'grid',
                // auto-fill rather than a fixed count: the pane is 704px wide
                // at 1440 and 544px at 1280, and a hard four-column grid puts
                // the work-order number through the contract link at the
                // smaller width. This lands on four columns and three.
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                columnGap: 3,
                rowGap: 2,
              },
              '& .MuiLink-root': { display: 'block' },
            }}
          >
            <CSRProjectDetailView project={selected} />
          </Box>

          {/* Where the rest of the record lives. Deliberately NOT a tab strip:
              the tabs on /csr/:id hold their state locally, so a tab-shaped
              control here could only ever land on Overview, and a control that
              lies about where it goes is worse than a plain link. */}
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: surfaces.canvas,
              border: `1px solid ${surfaces.hairlineSoft}`,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>The full record</Typography>
              <Typography variant="body2" color="text.secondary">
                Contacts, activities, reports, contracts and utilisation are kept on the
                project page.
              </Typography>
            </Box>
            <Button
              variant="contained"
              endIcon={<OpenIcon />}
              onClick={() => navigate(`/csr/${selected.id}`)}
              sx={{ flexShrink: 0 }}
            >
              Open project
            </Button>
          </Box>

          {(created || updated) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.75rem' }}>
              {[created && `Created ${created}`, updated && `Updated ${updated}`].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </Box>
      </Box>
    );
  })();

  return (
    <Container maxWidth={false} sx={{ py: 3, maxWidth: density.workspace.maxWidth }}>
      {header}
      {controls}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: 'flex-start',
            gap: 2.5,
          }}
        >
          {master}
          {/* The detail pane is the whole point of the layout, so on a narrow
              screen it comes FIRST in reading order once something is picked —
              but the list has to be reachable, so it simply stacks under it. */}
          <Box sx={{ display: 'flex', width: '100%', minWidth: 0, flexGrow: 1 }}>{detail}</Box>
        </Box>
      )}

      <CSRProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={saving}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
