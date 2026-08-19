// src/components/reports/TrialSpendReport.jsx
//
// One row per trial with cumulative WO + payment totals.
// Match is by string: WorkOrder.projectRef matched against Trial.trialCode.
// WOs whose projectRef matches nothing are surfaced separately as "Orphan WOs".

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, Stack,
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Snackbar, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel,
  Drawer, Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../../services/api';
import { csvBlob } from '../../utils/csv';
import { exportReportExcel, datedFileName } from '../../utils/reportExcel';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(parseFloat(n) || 0);

function TrialSpendReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trials, setTrials] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('paid-desc');
  const [drawerTrial, setDrawerTrial] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.trialSpend();
      setTrials(res.trials || []);
      setWorkOrders(res.workOrders || []);
      setPayments(res.paymentRequests || []);
    } catch (err) {
      console.error('Trial spend load error:', err);
      setToast({ open: true, message: 'Failed to load report data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Group WOs by their projectRef string
  const woByProjectRef = useMemo(() => {
    const m = new Map();
    workOrders.forEach(wo => {
      const ref = (wo.projectRef || '').trim();
      if (!m.has(ref)) m.set(ref, []);
      m.get(ref).push(wo);
    });
    return m;
  }, [workOrders]);

  // Group PRs by their work order id
  const prByWoId = useMemo(() => {
    const m = new Map();
    payments.forEach(p => {
      const woid = p.workOrderId || p.workOrder;
      if (!m.has(woid)) m.set(woid, []);
      m.get(woid).push(p);
    });
    return m;
  }, [payments]);

  // Compute one row per trial
  const trialRows = useMemo(() => {
    return trials.map(t => {
      const wos = woByProjectRef.get(t.trialCode) || [];
      const woIds = wos.map(w => w.id || w._id);
      const prs = woIds.flatMap(id => prByWoId.get(id) || []);

      const committed = wos.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
      const paidGross = prs
        .filter(p => p.status === 'Payment Done' || p.status === 'Sent to Accounts')
        .reduce((s, p) => s + (parseFloat(p.grossAmount) || 0), 0);
      const paidNet = prs
        .filter(p => p.status === 'Payment Done' || p.status === 'Sent to Accounts')
        .reduce((s, p) => s + (parseFloat(p.netAmount) || 0), 0);
      const tdsTotal = prs.reduce((s, p) => s + (parseFloat(p.tdsAmount) || 0), 0);
      const pending = committed - paidGross;
      const bounces = prs.filter(p => p.status === 'Payment Bounced').length;

      return {
        trial: t, wos, prs,
        committed, paidGross, paidNet, tdsTotal, pending, bounces,
        woCount: wos.length, prCount: prs.length,
        cityCount: (t.cities || []).length,
      };
    });
  }, [trials, woByProjectRef, prByWoId]);

  // Orphan WOs — WOs whose projectRef does not match any trial code (and is non-empty)
  const trialCodeSet = useMemo(() => new Set(trials.map(t => t.trialCode)), [trials]);
  const orphanWOs = useMemo(() => {
    return workOrders.filter(wo => {
      const ref = (wo.projectRef || '').trim();
      if (!ref) return true; // no project tag at all also counts as orphan
      return !trialCodeSet.has(ref);
    });
  }, [workOrders, trialCodeSet]);

  const orphanStats = useMemo(() => {
    const committed = orphanWOs.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
    const paid = orphanWOs.reduce((s, w) => s + (parseFloat(w.paidGrossAmount) || 0), 0);
    return { count: orphanWOs.length, committed, paid };
  }, [orphanWOs]);

  // Filter options
  const seasons = useMemo(() => Array.from(new Set(trials.map(t => t.season).filter(Boolean))).sort(), [trials]);
  const trialTypes = useMemo(() => Array.from(new Set(trials.map(t => t.trialType).filter(Boolean))).sort(), [trials]);

  // Filtering + sorting
  const filteredSorted = useMemo(() => {
    let list = [...trialRows];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.trial.trialName?.toLowerCase().includes(q) ||
        r.trial.trialCode?.toLowerCase().includes(q) ||
        r.trial.trialType?.toLowerCase().includes(q)
      );
    }
    if (seasonFilter) list = list.filter(r => r.trial.season === seasonFilter);
    if (statusFilter) list = list.filter(r => r.trial.status === statusFilter);
    if (typeFilter)   list = list.filter(r => r.trial.trialType === typeFilter);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'paid-desc':     return b.paidGross - a.paidGross;
        case 'paid-asc':      return a.paidGross - b.paidGross;
        case 'pending-desc':  return b.pending - a.pending;
        case 'pending-asc':   return a.pending - b.pending;
        case 'committed-desc':return b.committed - a.committed;
        case 'name-asc':      return (a.trial.trialName || '').localeCompare(b.trial.trialName || '');
        case 'name-desc':     return (b.trial.trialName || '').localeCompare(a.trial.trialName || '');
        case 'bounces-desc':  return b.bounces - a.bounces;
        default: return b.paidGross - a.paidGross;
      }
    });
    return list;
  }, [trialRows, search, seasonFilter, statusFilter, typeFilter, sortBy]);

  // Cumulative totals strip
  const totals = useMemo(() => {
    return filteredSorted.reduce((acc, r) => {
      acc.committed += r.committed;
      acc.paidGross += r.paidGross;
      acc.pending += r.pending;
      acc.tds += r.tdsTotal;
      acc.bounces += r.bounces;
      acc.wos += r.woCount;
      return acc;
    }, { committed: 0, paidGross: 0, pending: 0, tds: 0, bounces: 0, wos: 0 });
  }, [filteredSorted]);

  const handleColumnSort = (col) => {
    if (col === 'name')      setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc');
    else if (col === 'committed') setSortBy('committed-desc');
    else if (col === 'paid')      setSortBy(sortBy === 'paid-desc' ? 'paid-asc' : 'paid-desc');
    else if (col === 'pending')   setSortBy(sortBy === 'pending-desc' ? 'pending-asc' : 'pending-desc');
    else if (col === 'bounces')   setSortBy('bounces-desc');
  };
  const sortArrowFor = (col) => {
    const map = {
      name: ['name-asc', 'name-desc'],
      committed: ['committed-desc'],
      paid: ['paid-asc', 'paid-desc'],
      pending: ['pending-asc', 'pending-desc'],
      bounces: ['bounces-desc'],
    };
    const keys = map[col] || [];
    if (!keys.includes(sortBy)) return '';
    return sortBy.endsWith('-asc') ? '↑' : '↓';
  };

  // Typed twin of the CSV above. Trial code is `code` rather than text: a code
  // that happens to be all digits would otherwise arrive as a number and lose
  // any leading zero.
  const exportExcel = () => exportReportExcel({
    sheetName: 'Trial Spend',
    fileName: datedFileName('trial_spend'),
    summary: `Trial Spend — ${filteredSorted.length} trials`,
    columns: [
      { header: 'Trial Code', type: 'code' },
      { header: 'Trial Name', width: 30 },
      'Season',
      'Type',
      'Status',
      { header: 'Cities', type: 'integer' },
      { header: 'WOs', type: 'integer' },
      { header: 'PRs', type: 'integer' },
      { header: 'Committed', type: 'money' },
      { header: 'Paid (Gross)', type: 'money' },
      { header: 'Pending', type: 'money' },
      { header: 'TDS', type: 'money' },
      { header: 'Bounces', type: 'integer' },
    ],
    rows: filteredSorted.map((r) => [
      r.trial.trialCode, r.trial.trialName, r.trial.season,
      r.trial.trialType, r.trial.status, r.cityCount,
      r.woCount, r.prCount,
      r.committed, r.paidGross, r.pending, r.tdsTotal, r.bounces,
    ]),
  });

  const exportCSV = () => {
    const header = ['Trial Code', 'Trial Name', 'Season', 'Type', 'Status', 'Cities', 'WOs', 'PRs', 'Committed', 'Paid (Gross)', 'Pending', 'TDS', 'Bounces'];
    const rows = filteredSorted.map(r => [
      r.trial.trialCode, r.trial.trialName, r.trial.season,
      r.trial.trialType, r.trial.status, r.cityCount,
      r.woCount, r.prCount,
      r.committed, r.paidGross, r.pending, r.tdsTotal, r.bounces,
    ]);
    const blob = csvBlob([header, ...rows]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial_spend_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
                Trial Spend Report
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5 }}>
              One row per trial. Cumulative work-order and payment totals, with orphan WOs surfaced separately.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={loadAll}
              sx={{ textTransform: 'none', borderRadius: 1.5, color: '#475569' }}>
              Refresh
            </Button>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCSV}
              disabled={filteredSorted.length === 0}
              sx={{ textTransform: 'none', borderRadius: 1.5, borderColor: '#5B63D3', color: '#5B63D3' }}>
              Export CSV
            </Button>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel}
              disabled={filteredSorted.length === 0}
              sx={{ textTransform: 'none', borderRadius: 1.5, borderColor: '#5B63D3', color: '#5B63D3' }}>
              Export Excel
            </Button>
          </Stack>
        </Stack>

        {/* Orphan WO call-out — data integrity warning */}
        {!loading && orphanStats.count > 0 && (
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ width: '100%' }}>
              <Typography variant="body2" fontWeight={700}>
                {orphanStats.count} work order{orphanStats.count !== 1 ? 's' : ''} not linked to any trial
              </Typography>
              <Typography variant="body2" color="text.secondary">
                · {fmtINR(orphanStats.committed)} committed, {fmtINR(orphanStats.paid)} paid · spend on these is excluded from the totals below.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              size="small" placeholder="Search trial / code / type..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#5A6B82' }} /></InputAdornment>
              )}}
              sx={{ flex: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel>Season</InputLabel>
              <Select label="Season" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All seasons</MenuItem>
                {seasons.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All statuses</MenuItem>
                {['Active', 'Draft', 'Completed', 'Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All types</MenuItem>
                {trialTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          {(search || seasonFilter || statusFilter || typeFilter) && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
              <Button size="small" onClick={() => {
                setSearch(''); setSeasonFilter(''); setStatusFilter(''); setTypeFilter('');
              }} sx={{ textTransform: 'none', color: '#64748b' }}>
                Clear all filters
              </Button>
            </Stack>
          )}
        </Paper>

        {/* Totals strip */}
        {!loading && filteredSorted.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: '#fafbfc', borderColor: '#e2e8f0' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}
              divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>TRIALS</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{filteredSorted.length}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>WORK ORDERS</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{totals.wos}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>COMMITTED</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{fmtINR(totals.committed)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>PAID (GROSS)</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>{fmtINR(totals.paidGross)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>PENDING</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#d97706' }}>{fmtINR(totals.pending)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>BOUNCES</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{totals.bounces}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Table */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#5B63D3' }} />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {[
                    { label: 'Trial Code', col: null },
                    { label: 'Trial', col: 'name' },
                    { label: 'Season', col: null },
                    { label: 'Cities', col: null },
                    { label: 'WOs', col: null },
                    { label: 'Committed', col: 'committed' },
                    { label: 'Paid', col: 'paid' },
                    { label: 'Pending', col: 'pending' },
                    { label: 'Bounces', col: 'bounces' },
                    { label: 'Status', col: null },
                  ].map(h => (
                    <TableCell key={h.label}
                      onClick={h.col ? () => handleColumnSort(h.col) : undefined}
                      sx={{
                        fontWeight: 700, fontSize: '0.7rem', color: '#64748b',
                        letterSpacing: '0.5px', py: 1.5,
                        cursor: h.col ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': h.col ? { color: '#5B63D3', bgcolor: '#eef2ff' } : {},
                      }}>
                      {h.label}{h.col && sortArrowFor(h.col) ? ` ${sortArrowFor(h.col)}` : ''}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: '#5A6B82' }}>
                      No trials match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (<>
                  {filteredSorted.map(r => (
                    <TableRow key={r.trial.id || r.trial._id} hover
                      onClick={() => setDrawerTrial(r)}
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td': { border: 0 },
                        '&:hover': { bgcolor: '#f8fafc' },
                      }}>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#5B63D3' }}>{r.trial.trialCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{r.trial.trialName}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{r.trial.season || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{r.cityCount}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{r.woCount}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{fmtINR(r.committed)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>{fmtINR(r.paidGross)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: r.pending > 0 ? '#d97706' : '#5A6B82' }}>{fmtINR(r.pending)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: r.bounces > 0 ? '#dc2626' : '#5A6B82', fontWeight: r.bounces > 0 ? 700 : 400 }}>
                        {r.bounces || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{r.trial.status || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {/* Consolidated total row */}
                  <TableRow sx={{
                    bgcolor: '#f8fafc',
                    borderTop: '2px solid #cbd5e1',
                    '& td': { fontWeight: 700 },
                  }}>
                    <TableCell />
                    <TableCell sx={{ fontSize: '0.8rem', color: '#1e293b' }}>TOTAL</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{filteredSorted.length} trials</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{filteredSorted.reduce((s, r) => s + r.cityCount, 0)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{totals.wos}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{fmtINR(totals.committed)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#16a34a' }}>{fmtINR(totals.paidGross)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#d97706' }}>{fmtINR(totals.pending)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{totals.bounces}</TableCell>
                    <TableCell />
                  </TableRow>
                </>)}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Drawer */}
        <Drawer anchor="right" open={!!drawerTrial} onClose={() => setDrawerTrial(null)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
          {drawerTrial && <TrialDetailTile row={drawerTrial} onClose={() => setDrawerTrial(null)} />}
        </Drawer>

        <Snackbar open={toast.open} autoHideDuration={4000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>{toast.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

function TrialDetailTile({ row, onClose }) {
  const { trial, wos, prs, committed, paidGross, pending, tdsTotal, bounces } = row;
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>{trial.trialCode}</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>{trial.trialName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {trial.season || '—'} · {trial.trialType || '—'} · {trial.status}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      {/* Cumulatives */}
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Committed</Typography>
            <Typography variant="body1" fontWeight={700}>{fmt(committed)}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Paid</Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#16a34a' }}>{fmt(paidGross)}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Pending</Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: pending > 0 ? '#d97706' : '#5A6B82' }}>{fmt(pending)}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">TDS</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{fmt(tdsTotal)}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Bounces</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: bounces > 0 ? '#dc2626' : '#5A6B82' }}>{bounces || '—'}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Cities</Typography>
            <Typography variant="body2" fontWeight={700}>{(trial.cities || []).length}</Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />

      {/* Work orders */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
          WORK ORDERS ({wos.length})
        </Typography>
        {wos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No work orders match this trial code.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {wos.map(wo => (
              <Stack key={wo.id || wo._id} direction="row" justifyContent="space-between"
                sx={{ px: 1, py: 0.75, borderRadius: 1, bgcolor: '#fafbfc' }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{wo.workOrderNumber}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {wo.vendorName || '—'} · {wo.type} · {wo.status}
                  </Typography>
                </Box>
                <Typography variant="caption" fontWeight={700}>
                  {fmt(wo.paidGrossAmount)} / {fmt(wo.amount)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
      <Divider />

      {/* Recent payments through this trial */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
          RECENT PAYMENTS ({prs.length} total)
        </Typography>
        {prs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No payments under this trial yet.</Typography>
        ) : (
          <Stack spacing={0.5}>
            {prs
              .slice()
              .sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0))
              .slice(0, 12)
              .map(p => (
                <Stack key={p.id || p._id} direction="row" justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, borderRadius: 1, bgcolor: '#fafbfc' }}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{p.requestNumber}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {fmtD(p.invoiceDate)} · {p.vendorName || '—'} · {p.status}
                    </Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700}>{fmt(p.grossAmount)}</Typography>
                </Stack>
              ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default TrialSpendReport;
