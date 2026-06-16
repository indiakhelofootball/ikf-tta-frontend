// src/components/reports/PaymentAuditReport.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Typography, TextField, InputAdornment, Stack,
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Button, Snackbar, Alert, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, FormControlLabel,
  Checkbox, Drawer, Divider, Chip, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  OpenInNew as OpenIcon,
  Store as VendorIcon,
  Assignment as WOIcon,
  ReceiptLong as PRIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../../services/api';
import {
  computePaymentFlags, topSeverity,
  FLAG_COLORS, FLAG_LABELS,
} from './flagEngine';

// ── Formatting helpers ──────────────────────────────────────────────────────

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(parseFloat(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_OPTIONS = ['Sent to Accounts', 'Payment Done', 'Payment Bounced'];

// ── Convert a flag into one short, plain-English line for the Issue column ──

function flagToIssueText(flag, relatedRequestNumbers = []) {
  const linkedTo = relatedRequestNumbers.length > 0 ? ` of ${relatedRequestNumbers[0]}` : '';
  switch (flag.code) {
    case 'DUPLICATE_SUSPECT':   return `Possible duplicate${linkedTo}`;
    case 'DOUBLE_BOUNCE':       return `Bounced multiple times`;
    case 'WO_OVERPAID':         return `Work order is over-paid`;
    case 'TDS_MISSING':         return `TDS not deducted`;
    case 'STALE_SENT':          return `Stale — no confirmation`;
    case 'BACKDATED_INVOICE':   return `Backdated invoice`;
    case 'TDS_MONTH_DRIFT':     return `TDS booked in wrong month`;
    case 'RETRY_OF_BOUNCED':    return `Retry of bounced payment${linkedTo}`;
    default:                     return FLAG_LABELS[flag.code] || flag.code;
  }
}

// ── Top issue counters ──────────────────────────────────────────────────────

const ISSUE_TITLES = {
  DUPLICATE_SUSPECT: 'Possible duplicates',
  DOUBLE_BOUNCE: 'Multi-bounces',
  WO_OVERPAID: 'Over-paid work orders',
  TDS_MISSING: 'Missing TDS',
  STALE_SENT: 'Stale payments',
  BACKDATED_INVOICE: 'Backdated invoices',
  TDS_MONTH_DRIFT: 'TDS month drift',
  RETRY_OF_BOUNCED: 'Retries of bounced',
};

function PaymentAuditReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [batches, setBatches] = useState([]);
  const [tdsRecords, setTdsRecords] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Filters
  const [searchVendor, setSearchVendor] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  // Sortable column keys: 'date' | 'vendor' | 'workOrder' | 'gross' | 'net' | 'status' | 'issue'
  const handleColumnSort = (col) => {
    const current = sortBy;
    // Toggle between asc/desc on the same column; default direction by column
    if (col === 'date')      setSortBy(current === 'date-desc' ? 'date-asc' : 'date-desc');
    else if (col === 'vendor')   setSortBy(current === 'vendor-asc' ? 'vendor-desc' : 'vendor-asc');
    else if (col === 'workOrder') setSortBy(current === 'wo-asc' ? 'wo-desc' : 'wo-asc');
    else if (col === 'gross')    setSortBy(current === 'amount-desc' ? 'amount-asc' : 'amount-desc');
    else if (col === 'net')      setSortBy(current === 'net-desc' ? 'net-asc' : 'net-desc');
    else if (col === 'status')   setSortBy(current === 'status-asc' ? 'status-desc' : 'status-asc');
    else if (col === 'issue')    setSortBy('issue-desc');
  };
  const sortArrowFor = (col) => {
    const map = {
      date: ['date-asc', 'date-desc'],
      vendor: ['vendor-asc', 'vendor-desc'],
      workOrder: ['wo-asc', 'wo-desc'],
      gross: ['amount-asc', 'amount-desc'],
      net: ['net-asc', 'net-desc'],
      status: ['status-asc', 'status-desc'],
      issue: ['issue-desc'],
    };
    const keys = map[col] || [];
    if (!keys.includes(sortBy)) return '';
    return sortBy.endsWith('-asc') ? '↑' : '↓';
  };

  // Detail drawer
  const [drawerPR, setDrawerPR] = useState(null);

  // ── Load all data once ────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.paymentAudit();
      setPayments(res.paymentRequests || []);
      setVendors(res.vendors || []);
      setWorkOrders(res.workOrders || []);
      setBatches(res.batches || []);
      setTdsRecords(res.tdsRecords || []);
    } catch (err) {
      console.error('Report load error:', err);
      setToast({ open: true, message: 'Failed to load report data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Compute flags ────────────────────────────────────────────────────────

  const flagsByPR = useMemo(
    () => computePaymentFlags(payments, vendors, workOrders, batches, tdsRecords),
    [payments, vendors, workOrders, batches, tdsRecords]
  );

  // Top 3 issue types by count
  const topIssues = useMemo(() => {
    const counts = new Map();
    flagsByPR.forEach((flags) => {
      flags.forEach((f) => counts.set(f.code, (counts.get(f.code) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count, title: ISSUE_TITLES[code] || FLAG_LABELS[code] || code }));
  }, [flagsByPR]);

  // ── Lookup maps ───────────────────────────────────────────────────────────

  const vendorById = useMemo(() => new Map(vendors.map(v => [v._id || v.id, v])), [vendors]);
  const woById = useMemo(() => new Map(workOrders.map(w => [w._id || w.id, w])), [workOrders]);
  const batchById = useMemo(() => new Map(batches.map(b => [b._id || b.id, b])), [batches]);
  const prById = useMemo(() => new Map(payments.map(p => [p._id || p.id, p])), [payments]);

  // ── Apply filters + sort ──────────────────────────────────────────────────

  const filteredSorted = useMemo(() => {
    let list = [...payments];

    if (searchVendor.trim()) {
      const q = searchVendor.toLowerCase();
      list = list.filter((p) => {
        const v = vendorById.get(p.vendorId || p.vendor);
        return (
          (v && v.vendorName?.toLowerCase().includes(q)) ||
          (p.vendorName || '').toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (issueFilter) {
      list = list.filter((p) => {
        const flags = flagsByPR.get(p._id || p.id) || [];
        return flags.some((f) => f.code === issueFilter);
      });
    }
    if (onlyWithIssues) {
      list = list.filter((p) => (flagsByPR.get(p._id || p.id) || []).length > 0);
    }
    if (dateFrom) {
      list = list.filter((p) => p.invoiceDate && new Date(p.invoiceDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      list = list.filter((p) => p.invoiceDate && new Date(p.invoiceDate) <= new Date(dateTo));
    }

    const vName = (p) => (vendorById.get(p.vendorId || p.vendor)?.vendorName || p.vendorName || '').toLowerCase();
    const wName = (p) => (woById.get(p.workOrderId || p.workOrder)?.workOrderNumber || p.workOrderNumber || '').toLowerCase();
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':    return new Date(a.invoiceDate || 0) - new Date(b.invoiceDate || 0);
        case 'vendor-asc':  return vName(a).localeCompare(vName(b));
        case 'vendor-desc': return vName(b).localeCompare(vName(a));
        case 'wo-asc':      return wName(a).localeCompare(wName(b));
        case 'wo-desc':     return wName(b).localeCompare(wName(a));
        case 'amount-desc': return (parseFloat(b.grossAmount) || 0) - (parseFloat(a.grossAmount) || 0);
        case 'amount-asc':  return (parseFloat(a.grossAmount) || 0) - (parseFloat(b.grossAmount) || 0);
        case 'net-desc':    return (parseFloat(b.netAmount) || 0) - (parseFloat(a.netAmount) || 0);
        case 'net-asc':     return (parseFloat(a.netAmount) || 0) - (parseFloat(b.netAmount) || 0);
        case 'status-asc':  return (a.status || '').localeCompare(b.status || '');
        case 'status-desc': return (b.status || '').localeCompare(a.status || '');
        case 'issue-desc': {
          const rank = { red: 3, amber: 2, blue: 1 };
          const sa = rank[topSeverity(flagsByPR.get(a._id || a.id))] || 0;
          const sb = rank[topSeverity(flagsByPR.get(b._id || b.id))] || 0;
          if (sb !== sa) return sb - sa;
          return new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0);
        }
        case 'date-desc':
        default:            return new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0);
      }
    });
    return list;
  }, [payments, searchVendor, statusFilter, issueFilter, onlyWithIssues, dateFrom, dateTo, sortBy, flagsByPR, vendorById, woById]);

  // All flag codes present in the dataset, for the Issue filter dropdown
  const issueCodesInData = useMemo(() => {
    const set = new Set();
    flagsByPR.forEach((flags) => flags.forEach((f) => set.add(f.code)));
    return Array.from(set).sort((a, b) => (ISSUE_TITLES[a] || a).localeCompare(ISSUE_TITLES[b] || b));
  }, [flagsByPR]);

  // ── CSV export ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = ['PR Number', 'Date', 'Vendor', 'Work Order', 'Period', 'Gross', 'TDS', 'Net', 'Status', 'Batch', 'Issue'];
    const rows = filteredSorted.map((p) => {
      const v = vendorById.get(p.vendorId || p.vendor);
      const wo = woById.get(p.workOrderId || p.workOrder);
      const batch = p.batchId ? batchById.get(p.batchId) : null;
      const flags = flagsByPR.get(p._id || p.id) || [];
      const issueSummary = flags.length === 0
        ? ''
        : flags.map((f) => {
            const related = (f.relatedIds || []).map((rid) => prById.get(rid)?.requestNumber).filter(Boolean);
            return flagToIssueText(f, related);
          }).join(' | ');
      return [
        p.requestNumber || '',
        p.invoiceDate || '',
        v?.vendorName || p.vendorName || '',
        wo?.workOrderNumber || p.workOrderNumber || '',
        p.periodLabel || '',
        p.grossAmount || 0,
        p.tdsAmount || 0,
        p.netAmount || 0,
        p.status || '',
        batch?.fileName || batch?.batchNumber || '',
        issueSummary,
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((cell) => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchVendor('');
    setStatusFilter('');
    setIssueFilter('');
    setOnlyWithIssues(false);
    setDateFrom('');
    setDateTo('');
  };

  // ── Render row's Issue cell ─────────────────────────────────────────────

  const renderIssueCell = (flags) => {
    if (!flags || flags.length === 0) {
      return <Typography variant="caption" sx={{ color: '#cbd5e1' }}>—</Typography>;
    }
    // Sort flags by severity, take top one as the headline
    const rank = { red: 3, amber: 2, blue: 1 };
    const sorted = [...flags].sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));
    const headline = sorted[0];
    const related = (headline.relatedIds || []).map((rid) => prById.get(rid)?.requestNumber).filter(Boolean);
    const headlineText = flagToIssueText(headline, related);
    const moreCount = sorted.length - 1;
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 500, fontSize: '0.82rem' }}>
          {headlineText}
        </Typography>
        {moreCount > 0 && (
          <Chip
            label={`+${moreCount} more`}
            size="small"
            sx={{
              height: 18, fontSize: '0.68rem', fontWeight: 600,
              bgcolor: '#f1f5f9', color: '#64748b',
            }}
          />
        )}
      </Stack>
    );
  };

  // ── Detail drawer for the clicked payment ──────────────────────────────

  const drawerData = useMemo(() => {
    if (!drawerPR) return null;
    const v = vendorById.get(drawerPR.vendorId || drawerPR.vendor);
    const wo = woById.get(drawerPR.workOrderId || drawerPR.workOrder);
    const batch = drawerPR.batchId ? batchById.get(drawerPR.batchId) : null;
    const flags = flagsByPR.get(drawerPR._id || drawerPR.id) || [];
    // All other PRs on the same WO
    const woid = drawerPR.workOrderId || drawerPR.workOrder;
    const woPRs = payments.filter((p) => (p.workOrderId || p.workOrder) === woid)
      .sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0));
    // Recent payments to the same vendor (excluding this one)
    const vid = drawerPR.vendorId || drawerPR.vendor;
    const vendorRecent = payments
      .filter((p) => (p.vendorId || p.vendor) === vid && (p._id || p.id) !== (drawerPR._id || drawerPR.id))
      .sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0))
      .slice(0, 5);
    return { pr: drawerPR, vendor: v, wo, batch, flags, woPRs, vendorRecent };
  }, [drawerPR, vendorById, woById, batchById, flagsByPR, payments]);

  // ── Render ────────────────────────────────────────────────────────────────

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
                Payment Audit Report
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5 }}>
              Every payment with auto-detected issues. Click any row for the full story.
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

        {/* Top issue counters — named, not coloured */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          {topIssues.length === 0 ? (
            <Box sx={{
              flex: 1, p: 2, borderRadius: 2, bgcolor: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}>
              <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>
                No issues detected across {payments.length} payments.
              </Typography>
            </Box>
          ) : (
            topIssues.map((iss) => (
              <Box
                key={iss.code}
                onClick={() => setIssueFilter(issueFilter === iss.code ? '' : iss.code)}
                sx={{
                  flex: 1, p: 2, borderRadius: 2, cursor: 'pointer',
                  border: `1.5px solid ${issueFilter === iss.code ? '#5B63D3' : '#e2e8f0'}`,
                  bgcolor: issueFilter === iss.code ? '#eef2ff' : '#fff',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#5B63D3' },
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {iss.title}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
                  {iss.count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click to filter
                </Typography>
              </Box>
            ))
          )}
          <Box sx={{
            flex: 1, p: 2, borderRadius: 2, bgcolor: '#f8fafc',
            border: '1.5px solid #e2e8f0',
          }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Total payments
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
              {payments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filteredSorted.length} match filters
            </Typography>
          </Box>
        </Stack>

        {/* Filters */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              size="small" placeholder="Search vendor..." value={searchVendor}
              onChange={(e) => setSearchVendor(e.target.value)}
              InputProps={{ startAdornment: (
                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>
              )}}
              sx={{ flex: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All statuses</MenuItem>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Issue</InputLabel>
              <Select label="Issue" value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}
                sx={{ borderRadius: 1.5 }}>
                <MenuItem value="">All payments</MenuItem>
                {issueCodesInData.map((code) => (
                  <MenuItem key={code} value={code}>{ISSUE_TITLES[code] || FLAG_LABELS[code] || code}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant={sortBy === 'issue-desc' ? 'contained' : 'outlined'}
              onClick={() => setSortBy(sortBy === 'issue-desc' ? 'date-desc' : 'issue-desc')}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                bgcolor: sortBy === 'issue-desc' ? '#5B63D3' : 'transparent',
                color: sortBy === 'issue-desc' ? '#fff' : '#5B63D3',
                borderColor: '#5B63D3', whiteSpace: 'nowrap',
                '&:hover': sortBy === 'issue-desc'
                  ? { bgcolor: '#4338ca' }
                  : { bgcolor: '#eef2ff', borderColor: '#4338ca' },
              }}
            >
              Issues first
            </Button>
            <TextField
              size="small" type="date" label="From" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <TextField
              size="small" type="date" label="To" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mr: 0.5 }}>Quick:</Typography>
            {[
              { label: 'This Month',  fn: () => { const n = new Date(); setDateFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setDateTo(new Date(n.getFullYear(), n.getMonth()+1, 0).toISOString().slice(0,10)); } },
              { label: 'Last Month',  fn: () => { const n = new Date(); const y = n.getMonth() === 0 ? n.getFullYear()-1 : n.getFullYear(); const m = n.getMonth() === 0 ? 12 : n.getMonth(); setDateFrom(`${y}-${String(m).padStart(2,'0')}-01`); setDateTo(new Date(y, m, 0).toISOString().slice(0,10)); } },
              { label: 'This FY',     fn: () => { const n = new Date(); const fy = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear()-1; setDateFrom(`${fy}-04-01`); setDateTo(`${fy+1}-03-31`); } },
              { label: 'Last FY',     fn: () => { const n = new Date(); const fy = (n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear()-1) - 1; setDateFrom(`${fy}-04-01`); setDateTo(`${fy+1}-03-31`); } },
            ].map(({ label, fn }) => (
              <Chip
                key={label} label={label} size="small" onClick={fn}
                sx={{
                  height: 24, fontSize: '0.72rem', fontWeight: 600,
                  bgcolor: '#f1f5f9', color: '#475569',
                  '&:hover': { bgcolor: '#e2e8f0' },
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={onlyWithIssues}
                onChange={(e) => setOnlyWithIssues(e.target.checked)} />}
              label={<Typography variant="body2">Show only payments with issues</Typography>}
            />
            {(searchVendor || statusFilter || issueFilter || onlyWithIssues || dateFrom || dateTo) && (
              <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', color: '#64748b' }}>
                Clear all filters
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Totals strip — cumulative for the current filtered view */}
        {!loading && filteredSorted.length > 0 && (() => {
          const totals = filteredSorted.reduce((acc, p) => {
            acc.gross += parseFloat(p.grossAmount) || 0;
            acc.tds += parseFloat(p.tdsAmount) || 0;
            acc.net += parseFloat(p.netAmount) || 0;
            if (p.status === 'Sent to Accounts') acc.sent += 1;
            else if (p.status === 'Payment Done') acc.done += 1;
            else if (p.status === 'Payment Bounced') acc.bounced += 1;
            return acc;
          }, { gross: 0, tds: 0, net: 0, sent: 0, done: 0, bounced: 0 });
          return (
            <Paper variant="outlined" sx={{
              p: 1.5, mb: 2, borderRadius: 2,
              bgcolor: '#fafbfc', borderColor: '#e2e8f0',
            }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} divider={<Divider orientation="vertical" flexItem />}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>SHOWING</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                    {filteredSorted.length} payments
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL GROSS</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{fmtINR(totals.gross)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL TDS</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{fmtINR(totals.tds)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL NET</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>{fmtINR(totals.net)}</Typography>
                </Box>
                <Box sx={{ flex: 1.4 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>BY STATUS</Typography>
                  <Typography variant="body2" sx={{ color: '#1e293b' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{totals.done}</span> done · {' '}
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>{totals.sent}</span> sent · {' '}
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{totals.bounced}</span> bounced
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })()}

        {/* Table */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#5B63D3' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading report data...
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {[
                    { label: 'Date', col: 'date' },
                    { label: 'Vendor', col: 'vendor' },
                    { label: 'Work Order', col: 'workOrder' },
                    { label: 'Period', col: null },
                    { label: 'Gross', col: 'gross' },
                    { label: 'TDS', col: null },
                    { label: 'Net', col: 'net' },
                    { label: 'Status', col: 'status' },
                    { label: 'Issue', col: 'issue' },
                  ].map((h) => (
                    <TableCell
                      key={h.label}
                      onClick={h.col ? () => handleColumnSort(h.col) : undefined}
                      sx={{
                        fontWeight: 700, fontSize: '0.7rem', color: '#64748b',
                        letterSpacing: '0.5px', py: 1.5,
                        cursor: h.col ? 'pointer' : 'default',
                        userSelect: 'none',
                        '&:hover': h.col ? { color: '#5B63D3', bgcolor: '#eef2ff' } : {},
                      }}
                    >
                      {h.label}{h.col && sortArrowFor(h.col) ? ` ${sortArrowFor(h.col)}` : ''}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                      No payments match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (<>
                  {filteredSorted.map((p) => {
                    const id = p._id || p.id;
                    const flags = flagsByPR.get(id) || [];
                    const top = topSeverity(flags);
                    const markerColor = top ? FLAG_COLORS[top].border : 'transparent';
                    const v = vendorById.get(p.vendorId || p.vendor);
                    const wo = woById.get(p.workOrderId || p.workOrder);
                    return (
                      <TableRow
                        key={id}
                        hover
                        onClick={() => setDrawerPR(p)}
                        sx={{
                          cursor: 'pointer',
                          borderLeft: `3px solid ${markerColor}`,
                          '&:last-child td': { border: 0 },
                          '&:hover': { bgcolor: '#f8fafc' },
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.82rem' }}>{fmtDate(p.invoiceDate)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{v?.vendorName || p.vendorName || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#5B63D3' }}>{wo?.workOrderNumber || p.workOrderNumber || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{p.periodLabel || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{fmtINR(p.grossAmount)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{fmtINR(p.tdsAmount)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a' }}>{fmtINR(p.netAmount)}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>{p.status || '—'}</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>{renderIssueCell(flags)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Consolidated total row */}
                  {(() => {
                    const t = filteredSorted.reduce((acc, p) => {
                      acc.gross += parseFloat(p.grossAmount) || 0;
                      acc.tds += parseFloat(p.tdsAmount) || 0;
                      acc.net += parseFloat(p.netAmount) || 0;
                      return acc;
                    }, { gross: 0, tds: 0, net: 0 });
                    return (
                      <TableRow sx={{
                        bgcolor: '#f8fafc',
                        borderTop: '2px solid #cbd5e1',
                        '& td': { fontWeight: 700 },
                      }}>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>—</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#1e293b' }}>TOTAL</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>—</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>—</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#1e293b' }}>{fmtINR(t.gross)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>{fmtINR(t.tds)}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#16a34a' }}>{fmtINR(t.net)}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {filteredSorted.length} rows
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })()}
                </>)}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Detail drawer */}
        <Drawer
          anchor="right"
          open={!!drawerPR}
          onClose={() => setDrawerPR(null)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}
        >
          {drawerData && (
            <DetailTile
              data={drawerData}
              prById={prById}
              onClose={() => setDrawerPR(null)}
              onOpenPR={(prid) => {
                const next = prById.get(prid);
                if (next) setDrawerPR(next);
              }}
            />
          )}
        </Drawer>

        <Snackbar
          open={toast.open} autoHideDuration={4000}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

// ── Detail tile (opens in the right drawer) ────────────────────────────────

function DetailTile({ data, prById, onClose, onOpenPR }) {
  const { pr, vendor, wo, batch, flags, woPRs, vendorRecent } = data;
  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
      .format(parseFloat(n) || 0);
  const fmtD = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>
            {pr.requestNumber}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            {vendor?.vendorName || pr.vendorName || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fmtD(pr.invoiceDate)} · {pr.status}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      {/* Amounts */}
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Gross</Typography>
            <Typography variant="body1" fontWeight={700}>{fmt(pr.grossAmount)}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">TDS</Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#dc2626' }}>{fmt(pr.tdsAmount)}</Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Net</Typography>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#16a34a' }}>{fmt(pr.netAmount)}</Typography>
          </Box>
        </Stack>
      </Box>
      <Divider />

      {/* What is going on */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
          WHAT IS GOING ON
        </Typography>
        {flags.length === 0 ? (
          <Box sx={{
            p: 2, borderRadius: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
          }}>
            <Typography variant="body2" sx={{ color: '#15803d' }}>
              No issues detected on this payment.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {flags.map((f, idx) => (
              <Box key={idx} sx={{
                p: 1.75, borderRadius: 1.5,
                bgcolor: FLAG_COLORS[f.severity].bg,
                borderLeft: `3px solid ${FLAG_COLORS[f.severity].border}`,
              }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b', mb: 0.25 }}>
                  {ISSUE_TITLES[f.code] || f.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>{f.reason}</Typography>
                {(f.relatedIds || []).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Linked: </Typography>
                    {f.relatedIds.map((rid) => {
                      const related = prById.get(rid);
                      if (!related) return null;
                      return (
                        <Chip
                          key={rid}
                          label={related.requestNumber}
                          size="small"
                          onClick={() => onOpenPR(rid)}
                          icon={<OpenIcon sx={{ fontSize: 12 }} />}
                          sx={{
                            mr: 0.5, height: 22, fontSize: '0.72rem', cursor: 'pointer',
                            bgcolor: '#fff', border: '1px solid #cbd5e1',
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      <Divider />

      {/* Vendor card */}
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <VendorIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px' }}>
            VENDOR
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
          {vendor?.vendorName || pr.vendorName || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          PAN {vendor?.panNumber || '—'}{vendor?.panVerified ? ' · verified' : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {vendor?.bankName || '—'} · {vendor?.accountNumber || '—'} · {vendor?.ifscCode || '—'}
        </Typography>
        {vendorRecent.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Recent payments to this vendor
            </Typography>
            <Stack spacing={0.5}>
              {vendorRecent.map((rp) => (
                <Stack key={rp._id || rp.id} direction="row" justifyContent="space-between" alignItems="center"
                  onClick={() => onOpenPR(rp._id || rp.id)}
                  sx={{
                    px: 1, py: 0.75, borderRadius: 1, cursor: 'pointer',
                    bgcolor: '#fafbfc', '&:hover': { bgcolor: '#f1f5f9' },
                  }}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{rp.requestNumber}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{fmtD(rp.invoiceDate)}</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700}>{fmt(rp.grossAmount)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
      <Divider />

      {/* Work order card */}
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <WOIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px' }}>
            WORK ORDER
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
          {wo?.workOrderNumber || pr.workOrderNumber || '—'}
        </Typography>
        {wo && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {wo.type} · agreed {fmt(wo.amount)} · paid {fmt(wo.paidGrossAmount)} · remaining {fmt(parseFloat(wo.amount) - parseFloat(wo.paidGrossAmount))}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Project: {wo.projectRef || '—'}
            </Typography>
          </>
        )}
        {woPRs.length > 1 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              All payments on this work order ({woPRs.length})
            </Typography>
            <Stack spacing={0.5}>
              {woPRs.map((rp) => {
                const isThis = (rp._id || rp.id) === (pr._id || pr.id);
                return (
                  <Stack key={rp._id || rp.id} direction="row" justifyContent="space-between" alignItems="center"
                    onClick={() => !isThis && onOpenPR(rp._id || rp.id)}
                    sx={{
                      px: 1, py: 0.75, borderRadius: 1,
                      cursor: isThis ? 'default' : 'pointer',
                      bgcolor: isThis ? '#eef2ff' : '#fafbfc',
                      '&:hover': isThis ? {} : { bgcolor: '#f1f5f9' },
                    }}>
                    <Box>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#5B63D3' }}>{rp.requestNumber}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{fmtD(rp.invoiceDate)} · {rp.status}</Typography>
                    </Box>
                    <Typography variant="caption" fontWeight={700}>{fmt(rp.grossAmount)}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}
      </Box>
      <Divider />

      {/* Batch info */}
      {batch && (
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <PRIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#64748b', letterSpacing: '0.5px' }}>
              SENT TO BANK
            </Typography>
          </Stack>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
            {batch.fileName || batch.batchNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sent on {fmtD(batch.sentAt)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PaymentAuditReport;
