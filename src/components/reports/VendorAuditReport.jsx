// src/components/reports/VendorAuditReport.jsx
//
// Cumulative per-vendor report. One row per vendor with totals across all their
// work orders and payments, plus auto-detected vendor-level flags (duplicate
// PAN / account, missing bank, unverified KYC).

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, Stack,
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Snackbar, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, FormControlLabel,
  Checkbox, Drawer, Divider, Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../../services/api';
import {
  computeVendorFlags, topSeverity, FLAG_COLORS, FLAG_LABELS,
} from './flagEngine';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(parseFloat(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const VENDOR_ISSUE_TITLES = {
  VENDOR_DUP_ACCOUNT: 'Shared bank account',
  VENDOR_DUP_PAN: 'Duplicate PAN',
  VENDOR_DUP_PHONE: 'Shared phone',
  VENDOR_BANK_INCOMPLETE: 'Bank details incomplete',
  VENDOR_PAN_UNVERIFIED: 'PAN unverified',
  VENDOR_GST_UNVERIFIED: 'GST unverified',
};

function VendorAuditReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tdsRecords, setTdsRecords] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);
  const [sortBy, setSortBy] = useState('paid-desc');
  const [drawerVendor, setDrawerVendor] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.vendorAudit();
      setVendors(res.vendors || []);
      setWorkOrders(res.workOrders || []);
      setPayments(res.paymentRequests || []);
      setTdsRecords(res.tdsRecords || []);
    } catch (err) {
      console.error('Vendor audit load error:', err);
      setToast({ open: true, message: 'Failed to load report data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Flags per vendor
  const flagsByVendor = useMemo(() => computeVendorFlags(vendors), [vendors]);

  // Group by vendor id
  const woByVendor = useMemo(() => {
    const m = new Map();
    workOrders.forEach((wo) => {
      const vid = wo.vendorId;
      if (!m.has(vid)) m.set(vid, []);
      m.get(vid).push(wo);
    });
    return m;
  }, [workOrders]);

  const prByVendor = useMemo(() => {
    const m = new Map();
    payments.forEach((p) => {
      const vid = p.vendorId || p.vendor;
      if (!m.has(vid)) m.set(vid, []);
      m.get(vid).push(p);
    });
    return m;
  }, [payments]);

  const tdsByVendor = useMemo(() => {
    // TDS records expose vendorName but not vendorId directly — match on name as fallback
    const m = new Map();
    const vByName = new Map(vendors.map(v => [v.vendorName, v._id || v.id]));
    tdsRecords.forEach((t) => {
      const vid = vByName.get(t.vendorName);
      if (!vid) return;
      if (!m.has(vid)) m.set(vid, []);
      m.get(vid).push(t);
    });
    return m;
  }, [tdsRecords, vendors]);

  // Compute one row per vendor with cumulatives
  const rows = useMemo(() => {
    return vendors.map((v) => {
      const id = v._id || v.id;
      const wos = woByVendor.get(id) || [];
      const prs = prByVendor.get(id) || [];
      const tds = tdsByVendor.get(id) || [];

      const committed = wos.reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
      const paidGross = prs
        .filter(p => p.status === 'Payment Done' || p.status === 'Sent to Accounts')
        .reduce((s, p) => s + (parseFloat(p.grossAmount) || 0), 0);
      const paidNet = prs
        .filter(p => p.status === 'Payment Done' || p.status === 'Sent to Accounts')
        .reduce((s, p) => s + (parseFloat(p.netAmount) || 0), 0);
      const tdsTotal = tds.reduce((s, t) => s + (parseFloat(t.tdsAmount) || 0), 0);
      const pending = committed - paidGross;
      const bounces = prs.filter(p => p.status === 'Payment Bounced').length;

      const sortedByDate = [...prs].sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0));
      const lastPaymentDate = sortedByDate[0]?.invoiceDate || null;

      return {
        vendor: v, id,
        woCount: wos.length,
        prCount: prs.length,
        committed, paidGross, paidNet, pending, tdsTotal, bounces,
        lastPaymentDate,
        flags: flagsByVendor.get(id) || [],
      };
    });
  }, [vendors, woByVendor, prByVendor, tdsByVendor, flagsByVendor]);

  // Top issue counters
  const topIssues = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      r.flags.forEach((f) => counts.set(f.code, (counts.get(f.code) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count, title: VENDOR_ISSUE_TITLES[code] || FLAG_LABELS[code] || code }));
  }, [rows]);

  const vendorTypes = useMemo(() => {
    return Array.from(new Set(vendors.map(v => v.vendorType).filter(Boolean))).sort();
  }, [vendors]);

  const issueCodesInData = useMemo(() => {
    const set = new Set();
    rows.forEach(r => r.flags.forEach(f => set.add(f.code)));
    return Array.from(set).sort((a, b) => (VENDOR_ISSUE_TITLES[a] || a).localeCompare(VENDOR_ISSUE_TITLES[b] || b));
  }, [rows]);

  // Filtering + sorting
  const filteredSorted = useMemo(() => {
    let list = [...rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.vendor.vendorName?.toLowerCase().includes(q) ||
        r.vendor.panNumber?.toLowerCase().includes(q) ||
        r.vendor.city?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) list = list.filter(r => r.vendor.vendorType === typeFilter);
    if (issueFilter) list = list.filter(r => r.flags.some(f => f.code === issueFilter));
    if (onlyWithIssues) list = list.filter(r => r.flags.length > 0);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'paid-desc':     return b.paidGross - a.paidGross;
        case 'paid-asc':      return a.paidGross - b.paidGross;
        case 'pending-desc':  return b.pending - a.pending;
        case 'pending-asc':   return a.pending - b.pending;
        case 'name-asc':      return (a.vendor.vendorName || '').localeCompare(b.vendor.vendorName || '');
        case 'name-desc':     return (b.vendor.vendorName || '').localeCompare(a.vendor.vendorName || '');
        case 'bounces-desc':  return b.bounces - a.bounces;
        case 'lastpay-desc':  return new Date(b.lastPaymentDate || 0) - new Date(a.lastPaymentDate || 0);
        case 'issue-desc': {
          const rank = { red: 3, amber: 2, blue: 1 };
          return (rank[topSeverity(b.flags)] || 0) - (rank[topSeverity(a.flags)] || 0);
        }
        default: return b.paidGross - a.paidGross;
      }
    });
    return list;
  }, [rows, search, typeFilter, issueFilter, onlyWithIssues, sortBy]);

  // Cumulative totals for current filtered view
  const totals = useMemo(() => {
    return filteredSorted.reduce((acc, r) => {
      acc.committed += r.committed;
      acc.paidGross += r.paidGross;
      acc.pending += r.pending;
      acc.tds += r.tdsTotal;
      acc.bounces += r.bounces;
      return acc;
    }, { committed: 0, paidGross: 0, pending: 0, tds: 0, bounces: 0 });
  }, [filteredSorted]);

  const handleColumnSort = (col) => {
    if (col === 'name')     setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc');
    else if (col === 'paid')    setSortBy(sortBy === 'paid-desc' ? 'paid-asc' : 'paid-desc');
    else if (col === 'pending') setSortBy(sortBy === 'pending-desc' ? 'pending-asc' : 'pending-desc');
    else if (col === 'bounces') setSortBy('bounces-desc');
    else if (col === 'lastpay') setSortBy('lastpay-desc');
    else if (col === 'issue')   setSortBy('issue-desc');
  };

  const sortArrowFor = (col) => {
    const map = {
      name: ['name-asc', 'name-desc'],
      paid: ['paid-asc', 'paid-desc'],
      pending: ['pending-asc', 'pending-desc'],
      bounces: ['bounces-desc'],
      lastpay: ['lastpay-desc'],
      issue: ['issue-desc'],
    };
    const keys = map[col] || [];
    if (!keys.includes(sortBy)) return '';
    return sortBy.endsWith('-asc') ? '↑' : '↓';
  };

  const exportCSV = () => {
    const header = ['Vendor', 'Type', 'City', 'PAN', 'WOs', 'PRs', 'Committed', 'Paid (Gross)', 'Pending', 'TDS', 'Bounces', 'Last Payment', 'Issues'];
    const rowsCsv = filteredSorted.map(r => [
      r.vendor.vendorName || '',
      r.vendor.vendorType || '',
      r.vendor.city || '',
      r.vendor.panNumber || '',
      r.woCount,
      r.prCount,
      r.committed,
      r.paidGross,
      r.pending,
      r.tdsTotal,
      r.bounces,
      r.lastPaymentDate || '',
      r.flags.map(f => VENDOR_ISSUE_TITLES[f.code] || f.label).join(' | '),
    ]);
    const csv = [header, ...rowsCsv].map(r => r.map(c => {
      const s = String(c ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderIssueCell = (flags) => {
    if (!flags || flags.length === 0) return <Typography variant="caption" sx={{ color: '#cbd5e1' }}>—</Typography>;
    const rank = { red: 3, amber: 2, blue: 1 };
    const sorted = [...flags].sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));
    const head = sorted[0];
    const more = sorted.length - 1;
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500, fontSize: '0.82rem' }}>
          {VENDOR_ISSUE_TITLES[head.code] || head.label}
        </Typography>
        {more > 0 && (
          <Chip label={`+${more} more`} size="small"
            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }} />
        )}
      </Stack>
    );
  };

  const drawerRow = useMemo(() => {
    if (!drawerVendor) return null;
    return rows.find(r => r.id === (drawerVendor._id || drawerVendor.id));
  }, [drawerVendor, rows]);

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
                Vendor Audit Report
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5 }}>
              One row per vendor. Cumulative totals plus auto-detected duplicates and KYC gaps.
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
          </Stack>
        </Stack>

        {/* Top issue counters */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          {topIssues.length === 0 ? (
            <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>
                No issues detected across {vendors.length} vendors.
              </Typography>
            </Box>
          ) : (
            topIssues.map(iss => (
              <Box key={iss.code}
                onClick={() => setIssueFilter(issueFilter === iss.code ? '' : iss.code)}
                sx={{
                  flex: 1, p: 2, borderRadius: 2, cursor: 'pointer',
                  border: `1.5px solid ${issueFilter === iss.code ? '#5B63D3' : '#e2e8f0'}`,
                  bgcolor: issueFilter === iss.code ? '#eef2ff' : '#fff',
                  '&:hover': { borderColor: '#5B63D3' },
                }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{iss.title}</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
                  {iss.count}
                </Typography>
                <Typography variant="caption" color="text.secondary">Click to filter</Typography>
              </Box>
            ))
          )}
          <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Total vendors</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
              {vendors.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">{filteredSorted.length} match filters</Typography>
          </Box>
        </Stack>

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              size="small" placeholder="Search vendor / PAN / city..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#5A6B82' }} /></InputAdornment>
              )}}
              sx={{ flex: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel>Vendor type</InputLabel>
              <Select label="Vendor type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All types</MenuItem>
                {vendorTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Issue</InputLabel>
              <Select label="Issue" value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All vendors</MenuItem>
                {issueCodesInData.map(code => (
                  <MenuItem key={code} value={code}>{VENDOR_ISSUE_TITLES[code] || FLAG_LABELS[code] || code}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant={sortBy === 'issue-desc' ? 'contained' : 'outlined'}
              onClick={() => setSortBy(sortBy === 'issue-desc' ? 'paid-desc' : 'issue-desc')}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                bgcolor: sortBy === 'issue-desc' ? '#5B63D3' : 'transparent',
                color: sortBy === 'issue-desc' ? '#fff' : '#5B63D3',
                borderColor: '#5B63D3', whiteSpace: 'nowrap',
                '&:hover': sortBy === 'issue-desc'
                  ? { bgcolor: '#4338ca' } : { bgcolor: '#eef2ff', borderColor: '#4338ca' },
              }}>
              Issues first
            </Button>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={onlyWithIssues}
                onChange={(e) => setOnlyWithIssues(e.target.checked)} />}
              label={<Typography variant="body2">Show only vendors with issues</Typography>}
            />
            {(search || typeFilter || issueFilter || onlyWithIssues) && (
              <Button size="small" onClick={() => {
                setSearch(''); setTypeFilter(''); setIssueFilter(''); setOnlyWithIssues(false);
              }} sx={{ textTransform: 'none', color: '#64748b' }}>
                Clear all filters
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Totals strip */}
        {!loading && filteredSorted.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: '#fafbfc', borderColor: '#e2e8f0' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}
              divider={<Divider orientation="vertical" flexItem />}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>VENDORS</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{filteredSorted.length}</Typography>
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
                <Typography variant="caption" color="text.secondary" fontWeight={600}>TDS</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{fmtINR(totals.tds)}</Typography>
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
                    { label: 'Vendor', col: 'name' },
                    { label: 'Type', col: null },
                    { label: 'WOs', col: null },
                    { label: 'PRs', col: null },
                    { label: 'Committed', col: null },
                    { label: 'Paid', col: 'paid' },
                    { label: 'Pending', col: 'pending' },
                    { label: 'TDS', col: null },
                    { label: 'Bounces', col: 'bounces' },
                    { label: 'Last Payment', col: 'lastpay' },
                    { label: 'Issue', col: 'issue' },
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
                    <TableCell colSpan={11} sx={{ textAlign: 'center', py: 6, color: '#5A6B82' }}>
                      No vendors match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (<>
                  {filteredSorted.map(r => {
                    const top = topSeverity(r.flags);
                    const markerColor = top ? FLAG_COLORS[top].border : 'transparent';
                    return (
                      <TableRow key={r.id} hover
                        onClick={() => setDrawerVendor(r.vendor)}
                        sx={{
                          cursor: 'pointer',
                          borderLeft: `3px solid ${markerColor}`,
                          '&:last-child td': { border: 0 },
                          '&:hover': { bgcolor: '#f8fafc' },
                        }}>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.vendor.vendorName || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{r.vendor.vendorType || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{r.woCount}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{r.prCount}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{fmtINR(r.committed)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>{fmtINR(r.paidGross)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: r.pending > 0 ? '#d97706' : '#5A6B82' }}>{fmtINR(r.pending)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{fmtINR(r.tdsTotal)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: r.bounces > 0 ? '#dc2626' : '#5A6B82', fontWeight: r.bounces > 0 ? 700 : 400 }}>
                          {r.bounces || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{fmtDate(r.lastPaymentDate)}</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>{renderIssueCell(r.flags)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Consolidated total row */}
                  <TableRow sx={{
                    bgcolor: '#f8fafc',
                    borderTop: '2px solid #cbd5e1',
                    '& td': { fontWeight: 700 },
                  }}>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#1e293b' }}>TOTAL</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{filteredSorted.length} vendors</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{filteredSorted.reduce((s, r) => s + r.woCount, 0)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{filteredSorted.reduce((s, r) => s + r.prCount, 0)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{fmtINR(totals.committed)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#16a34a' }}>{fmtINR(totals.paidGross)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#d97706' }}>{fmtINR(totals.pending)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{fmtINR(totals.tds)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{totals.bounces}</TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </>)}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Drawer */}
        <Drawer anchor="right" open={!!drawerVendor} onClose={() => setDrawerVendor(null)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
          {drawerRow && <VendorDetailTile row={drawerRow} workOrders={woByVendor.get(drawerRow.id) || []}
            payments={prByVendor.get(drawerRow.id) || []} onClose={() => setDrawerVendor(null)} />}
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

function VendorDetailTile({ row, workOrders, payments, onClose }) {
  const { vendor, committed, paidGross, pending, tdsTotal, bounces, flags } = row;
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>
            {vendor.vendorType || 'Vendor'}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>{vendor.vendorName}</Typography>
          <Typography variant="caption" color="text.secondary">
            PAN {vendor.panNumber || '—'} · {vendor.city || '—'}
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
        </Stack>
      </Box>
      <Divider />

      {/* Issues */}
      {flags.length > 0 && (
        <>
          <Box sx={{ p: 2.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
              WHAT IS GOING ON
            </Typography>
            <Stack spacing={1.5}>
              {flags.map((f, i) => (
                <Box key={i} sx={{ p: 1.75, borderRadius: 1.5,
                  bgcolor: FLAG_COLORS[f.severity].bg,
                  borderLeft: `3px solid ${FLAG_COLORS[f.severity].border}` }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b', mb: 0.25 }}>
                    {VENDOR_ISSUE_TITLES[f.code] || f.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>{f.reason}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          <Divider />
        </>
      )}

      {/* Work orders */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
          WORK ORDERS ({workOrders.length})
        </Typography>
        {workOrders.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No work orders yet.</Typography>
        ) : (
          <Stack spacing={0.5}>
            {workOrders.map(wo => (
              <Stack key={wo.id || wo._id} direction="row" justifyContent="space-between"
                sx={{ px: 1, py: 0.75, borderRadius: 1, bgcolor: '#fafbfc' }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{wo.workOrderNumber}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{wo.type} · {wo.status}</Typography>
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

      {/* Recent payments */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
          RECENT PAYMENTS ({payments.length} total)
        </Typography>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No payments yet.</Typography>
        ) : (
          <Stack spacing={0.5}>
            {payments
              .slice()
              .sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0))
              .slice(0, 10)
              .map(p => (
                <Stack key={p.id || p._id} direction="row" justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, borderRadius: 1, bgcolor: '#fafbfc' }}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{p.requestNumber}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {fmtD(p.invoiceDate)} · {p.status}
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

export default VendorAuditReport;
