// src/components/payments/PaymentManagementPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, TextField, InputAdornment,
  Snackbar, Alert, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Grid, Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ReceiptLong as InvoiceIcon,
  AccountBalanceWallet as WalletIcon,
  Payment as PayIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Description as ExcelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

import PaymentRequestModal from './PaymentRequestModal';
import PaymentDetailDialog from './PaymentDetailDialog';
import { vendorsAPI, paymentRequestsAPI, paymentBatchesAPI } from '../../services/api';

// localStorage batch cache removed — API is source of truth

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function StatCard({ icon, value, label, color }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2,
      p: 2.5, bgcolor: '#ffffff', borderRadius: 4, flex: 1,
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.25s',
      '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
    }}>
      <Box sx={{ color, fontSize: 36, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500 }}>{label}</Typography>
      </Box>
    </Box>
  );
}

/* ── IDFC FIRST Bank Bulk Payment format (.xlsx) ── */
/* Matches BLKPAY_PMR2L.xlsx template: Row 1 = headers (blue), Row 2 = instructions (light blue), Row 3+ = data */
function downloadBankFormat(records) {
  if (records.length === 0) return null;

  const today = new Date();
  const ddmmyyyy = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  /* Row 1 — Column headers (A1:O1, P1 is empty per template) */
  const headers = [
    'Beneficiary Name',
    'Beneficiary Account Number',
    'IFSC',
    'Transaction Type',
    'Debit Account Number',
    'Transaction Date',
    'Amount',
    'Currency',
    'Beneficiary Email ID',
    'Remarks',
    'Custom Header \u2013 1',
    'Custom Header \u2013 2',
    'Custom Header \u2013 3',
    'Custom Header \u2013 4',
    'Custom Header \u2013 5',
    '',  // P1 empty — PAN header goes in P2 per template
  ];

  /* Row 2 — Field instructions / comments */
  const instructions = [
    'Enter beneficiary name.\nMANDATORY',
    'Enter beneficiary account number. \nThis can be IDFC FIRST Bank account or other Bank account.\nMANDATORY',
    'Enter beneficiary bank IFSC code. Required only for Inter bank (NEFT/RTGS) payment.',
    'Enter payment type:\nIFT - Within Bank payment\nNEFT - Inter-Bank(NEFT) payment\nRTGS - Inter-Bank(RTGS) payment\nMANDATORY',
    'Enter debit account number. This should be IDFC FIRST Bank account only. User should have access to do transaction on this account',
    'Enter transaction value date. Should be today\'s date or future date.\nMANDATORY\nDD/MM/YYYY format',
    'Enter payment amount.\nMANDATORY',
    'Enter transaction currency. Should be INR only.\nMANDATORY',
    'Enter beneficiary email id\nOPTIONAL',
    'Enter remarks\nOPTIONAL',
    'Credit Advice:\nEnter Custom Info -1\nNote: Header label is editable in Row 1\nOPTIONAL',
    'Credit Advice:\nEnter Custom Info -2\nNote: Header label is editable in Row 1\nOPTIONAL',
    'Credit Advice:\nEnter Custom Info -3\nNote: Header label is editable in Row 1\nOPTIONAL',
    'Credit Advice:\nEnter Custom Info -4\nNote: Header label is editable in Row 1\nOPTIONAL',
    'Credit Advice:\nEnter Custom Info -5\nNote: Header label is editable in Row 1\nOPTIONAL',
    'PAN',  // P2 has the PAN label per template
  ];

  /* Row 3+ — Payment data */
  const dataRows = records.map((r) => [
    r.vendorName || '',
    r.accountNumber || '',
    r.ifscCode || '',
    'NEFT',
    '',           // Debit account — user fills in
    ddmmyyyy,
    r.netAmount || 0,
    'INR',
    r.email || '',
    `${r.id} | ${r.workOrderNumber}`,
    '',
    '',
    '',
    '',
    '',
    r.panNumber || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, instructions, ...dataRows]);

  /* Column widths matching BLKPAY_PMR2L.xlsx */
  ws['!cols'] = [
    { wch: 22 }, { wch: 25 }, { wch: 21 }, { wch: 18 },
    { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 14 },
    { wch: 28 }, { wch: 23 }, { wch: 23 }, { wch: 23 },
    { wch: 23 }, { wch: 23 }, { wch: 23 }, { wch: 9 },
  ];

  /* Row heights matching template: Row 1 = 38px, Row 2 = 110px */
  ws['!rows'] = [{ hpx: 38 }, { hpx: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  /* Write to blob and trigger download + auto-open */
  const fileName = `BLKPAY_TTA_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  // Download the file
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Try to auto-open in Excel (browser will show open/save prompt)
  try { window.open(url, '_blank'); } catch {}

  return fileName;
}

// ══════════════════════════════════════════════════════════════════════════════
function PaymentManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState([]);
  const [prModalOpen, setPrModalOpen] = useState(false);
  /** Set when navigating from Work Orders — passed to PaymentRequestModal to skip vendor step */
  const [prPrefill, setPrPrefill] = useState(null);
  const [detailPayment, setDetailPayment] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [exportModal, setExportModal] = useState({ open: false, fileName: '', count: 0 });
  const [sentBatches, setSentBatches] = useState([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  const showToast = (msg, severity = 'success') => setToast({ open: true, message: msg, severity });

  const fetchPayments = () => {
    paymentRequestsAPI.getAll()
      .then((res) => {
        setPayments(res.paymentRequests || []);
      })
      .catch((err) => {
        setPayments([]);
        const msg = err?.message || 'Failed to load payment requests';
        showToast(msg, 'error');
      });
  };

  const fetchBatches = () => {
    paymentBatchesAPI.getAll()
      .then((res) => {
        setSentBatches(res.batches || []);
      })
      .catch(() => {
        setSentBatches([]);
      });
  };

  useEffect(() => {
    vendorsAPI.getAll({ limit: 1000 })
      .then((res) => {
        setVendors(res.vendors || []);
      })
      .catch(() => {
        setVendors([]);
        showToast('Failed to load vendors', 'error');
      });
    fetchPayments();
    fetchBatches();
  }, []);

  // Work Orders → /payments with state: open Raise Payment with WO + vendor prefill
  useEffect(() => {
    const p = location.state?.prefillRaisePayment;
    if (p?.workOrder) {
      setPrPrefill(p);
      setPrModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  /* ── Separate active (not yet sent) vs sent payments ── */
  // IDs that have been sent in any batch
  const sentIds = useMemo(() => {
    const ids = new Set();
    sentBatches.forEach(b => {
      if (b.payments) {
        b.payments.forEach(p => ids.add(p.id));
      }
    });
    return ids;
  }, [sentBatches]);

  // Active = payments that haven't been sent yet
  const activePayments = useMemo(() =>
    payments.filter(p => !sentIds.has(p.id)),
  [payments, sentIds]);

  /* ── Filter active payments by search ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return activePayments;
    return activePayments.filter(r =>
      String(r.id ?? '').toLowerCase().includes(q) ||
      (r.workOrderNumber || '').toLowerCase().includes(q) ||
      (r.vendorName || '').toLowerCase().includes(q) ||
      (r.vendorType || '').toLowerCase().includes(q)
    );
  }, [activePayments, search]);

  /* ── Stats (active only) ── */
  const totalGross = activePayments.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0);
  const totalNet = activePayments.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handlePaymentRequestSave = async (pr) => {
    try {
      await paymentRequestsAPI.create(pr);
      showToast('Payment request raised successfully!');
      fetchPayments();
      setPrModalOpen(false);
      setPrPrefill(null);
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to create payment request';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    }
  };

  const handlePaymentUpdate = async (prId, updates) => {
    try {
      await paymentRequestsAPI.update(prId, updates);
      showToast('Payment request updated');
      fetchPayments();
    } catch {
      setPayments(prev => prev.map(p => p.id === prId ? { ...p, ...updates } : p));
      showToast('Payment request updated (offline)');
    }
    setDetailPayment(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handlePaymentDelete = async (pr) => {
    if (!window.confirm(`Delete payment request ${pr.id || pr.requestNumber}?`)) return;
    try {
      await paymentRequestsAPI.delete(pr.id);
      showToast('Payment request deleted');
      fetchPayments();
    } catch {
      setPayments(prev => prev.filter(p => p.id !== pr.id));
      showToast('Payment request deleted (offline)');
    }
  };

  const handleSendToPayment = async () => {
    if (filtered.length === 0) {
      showToast('No payment requests to send', 'warning');
      return;
    }
    const fileName = downloadBankFormat(filtered);
    if (!fileName) return;

    // Try creating batch on backend
    try {
      await paymentBatchesAPI.create({
        paymentIds: filtered.map(r => r.id),
        fileName,
      });
      fetchBatches();
      fetchPayments();
    } catch {
      // Fallback: save batch locally
      const batch = {
        id: `BATCH-${Date.now()}`,
        sentAt: new Date().toISOString(),
        fileName,
        paymentIds: filtered.map(r => r.id),
        payments: filtered.map(r => ({
          id: r.id,
          workOrderNumber: r.workOrderNumber,
          vendorName: r.vendorName,
          vendorType: r.vendorType,
          grossAmount: r.grossAmount,
          tdsRate: r.tdsRate,
          tdsAmount: r.tdsAmount,
          netAmount: r.netAmount,
          invoiceDate: r.invoiceDate,
          periodLabel: r.periodLabel,
        })),
        totalGross: filtered.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0),
        totalNet: filtered.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0),
        totalTds: filtered.reduce((s, r) => s + (parseFloat(r.tdsAmount) || 0), 0),
      };
      setSentBatches(prev => [batch, ...prev]);

      // Update local state
      setPayments(prev => prev.map(p =>
        filtered.some(f => f.id === p.id) ? { ...p, status: 'Sent to Accounts' } : p
      ));
    }

    setExportModal({ open: true, fileName, count: filtered.length });
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Header */}
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#1e293b' }}>
          Payments
        </Typography>

        {/* Stat cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <StatCard
            icon={<WalletIcon fontSize="inherit" />}
            value={fmtINR(totalGross)}
            label="Total Gross Value"
            color="#6366F1"
          />
          <StatCard
            icon={<PayIcon fontSize="inherit" />}
            value={fmtINR(totalNet)}
            label="Total Net Payable"
            color="#16a34a"
          />
          <StatCard
            icon={<InvoiceIcon fontSize="inherit" />}
            value={activePayments.length}
            label="Active Requests"
            color="#F59E0B"
          />
        </Stack>

        {/* Search + Payment Request button */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search by Request ID, Work Order, Vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, bgcolor: 'white', borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<InvoiceIcon />}
            onClick={() => setPrModalOpen(true)}
            sx={{
              whiteSpace: 'nowrap', bgcolor: '#FDE68A', color: '#1e293b',
              boxShadow: 'none', textTransform: 'none', fontWeight: 600,
              borderRadius: 1.5, px: 3,
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            }}
          >
            Payment Request
          </Button>
        </Stack>

        {/* ══ Active Payment Requests Table ══ */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['REQUEST ID', 'WORK ORDER', 'VENDOR', 'GROSS', 'TDS', 'NET', 'INVOICE DATE', 'ACTIONS'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.82rem', color: '#6b7280',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {activePayments.length === 0
                      ? 'No active payment requests. Raise a new one to get started.'
                      : 'No matching payment requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#5B63D3' }}>
                        {r.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.workOrderNumber}</Typography>
                      {r.periodLabel && (
                        <Typography variant="caption" color="text.secondary">{r.periodLabel}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.vendorName}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.vendorType}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{fmtINR(r.grossAmount)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#dc2626' }}>
                        − {fmtINR(r.tdsAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">({r.tdsRate}%)</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                        {fmtINR(r.netAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem', color: r.invoiceDate ? 'inherit' : 'text.disabled' }}>
                      {r.invoiceDate || '—'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View">
                          <IconButton size="small" sx={{ color: '#5B63D3' }}
                            onClick={() => { setDetailPayment(r); setDetailMode('view'); }}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" sx={{ color: '#64748b' }}
                            onClick={() => { setDetailPayment(r); setDetailMode('edit'); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" sx={{ color: '#dc2626' }}
                            onClick={() => handlePaymentDelete(r)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total Amount + Send to Payment */}
        {filtered.length > 0 && (
          <>
            <Box sx={{
              mt: 2, p: 2, bgcolor: '#fff', borderRadius: 2,
              border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={700} sx={{ color: '#1e293b' }}>
                  Total Amount ({filtered.length} request{filtered.length !== 1 ? 's' : ''})
                </Typography>
                <Stack direction="row" spacing={4}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Gross</Typography>
                    <Typography variant="body1" fontWeight={700}>{fmtINR(filtered.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0))}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">TDS</Typography>
                    <Typography variant="body1" fontWeight={700} sx={{ color: '#dc2626' }}>
                      − {fmtINR(filtered.reduce((s, r) => s + (parseFloat(r.tdsAmount) || 0), 0))}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Net Payable</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#16a34a' }}>
                      {fmtINR(filtered.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0))}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<PayIcon />}
                onClick={handleSendToPayment}
                sx={{
                  bgcolor: '#3B82F6', color: '#fff',
                  textTransform: 'none', fontWeight: 700,
                  borderRadius: 1.5, px: 4, py: 1.2,
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                  '&:hover': { bgcolor: '#2563EB', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' },
                }}
              >
                Send to Payment
              </Button>
            </Box>
          </>
        )}

        {/* ══ Past Raised Payments ══ */}
        {sentBatches.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Button
              onClick={() => setPastExpanded(!pastExpanded)}
              startIcon={<HistoryIcon />}
              endIcon={pastExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                textTransform: 'none', fontWeight: 700, color: '#475569',
                fontSize: '0.95rem', mb: 2, px: 0,
                '&:hover': { bgcolor: 'transparent', color: '#1e293b' },
              }}
            >
              Past Raised Payments ({sentBatches.length} batch{sentBatches.length !== 1 ? 'es' : ''})
            </Button>

            <Collapse in={pastExpanded}>
              <Stack spacing={2}>
                {sentBatches.map((batch) => {
                  const isExpanded = expandedBatchId === batch.id;
                  return (
                    <Paper key={batch.id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                      {/* Batch header */}
                      <Box
                        onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                        sx={{
                          p: 2, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          bgcolor: '#fafbfc', '&:hover': { bgcolor: '#f1f5f9' }, transition: 'background 0.15s',
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <ExcelIcon sx={{ color: '#16a34a', fontSize: 22 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                              {batch.fileName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Sent on {fmtDateTime(batch.sentAt)} — {batch.payments.length} payment{batch.payments.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={3} alignItems="center">
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Net Total</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                              {fmtINR(batch.totalNet)}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">TDS</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#dc2626' }}>
                              {fmtINR(batch.totalTds)}
                            </Typography>
                          </Box>
                          {isExpanded ? <ExpandLessIcon sx={{ color: '#94a3b8' }} /> : <ExpandMoreIcon sx={{ color: '#94a3b8' }} />}
                        </Stack>
                      </Box>

                      {/* Batch detail table */}
                      <Collapse in={isExpanded}>
                        <Divider />
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                {['REQUEST ID', 'WORK ORDER', 'VENDOR', 'GROSS', 'TDS', 'NET', 'INVOICE DATE'].map(h => (
                                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.05em', py: 1 }}>
                                    {h}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {batch.payments.map((r) => (
                                <TableRow key={r.id} sx={{ '&:last-child td': { border: 0 } }}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600} sx={{ color: '#5B63D3', fontSize: '0.85rem' }}>
                                      {r.requestNumber || r.id}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{r.workOrderNumber}</Typography>
                                    {r.periodLabel && <Typography variant="caption" color="text.secondary">{r.periodLabel}</Typography>}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{r.vendorName}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.vendorType}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{fmtINR(r.grossAmount)}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ color: '#dc2626', fontSize: '0.85rem' }}>− {fmtINR(r.tdsAmount)}</Typography>
                                    <Typography variant="caption" color="text.secondary">({r.tdsRate}%)</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', fontSize: '0.85rem' }}>{fmtINR(r.netAmount)}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.85rem' }}>{r.invoiceDate || '—'}</TableCell>
                                </TableRow>
                              ))}
                              {/* Batch totals row */}
                              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>
                                  Batch Total
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700}>{fmtINR(batch.totalGross)}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>− {fmtINR(batch.totalTds)}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={800} sx={{ color: '#16a34a' }}>{fmtINR(batch.totalNet)}</Typography>
                                </TableCell>
                                <TableCell />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            </Collapse>
          </Box>
        )}

      </Container>

      {/* Payment Request Modal */}
      <PaymentRequestModal
        open={prModalOpen}
        onClose={() => {
          setPrModalOpen(false);
          setPrPrefill(null);
        }}
        onSave={handlePaymentRequestSave}
        onNavigateToWO={() => { window.location.href = '/work-orders'; }}
        allVendors={vendors}
        prefillContext={prPrefill}
      />

      {/* Payment Detail / Edit Dialog */}
      <PaymentDetailDialog
        open={!!detailPayment}
        onClose={() => setDetailPayment(null)}
        payment={detailPayment}
        onUpdate={handlePaymentUpdate}
        mode={detailMode}
      />

      {/* Export Info Modal — shown after Send to Payment */}
      <Dialog
        open={exportModal.open}
        onClose={() => setExportModal(p => ({ ...p, open: false }))}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ExcelIcon sx={{ color: '#16a34a', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
                Payments Sent
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                IDFC FIRST Bank — BLKPAY Format
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setExportModal(p => ({ ...p, open: false }))}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          {/* File info */}
          <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', mb: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckIcon sx={{ color: '#16a34a' }} />
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#15803d' }}>
                  {exportModal.fileName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#16a34a' }}>
                  {exportModal.count} payment request{exportModal.count !== 1 ? 's' : ''} sent for payment
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Where they went */}
          <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', mb: 2.5 }}>
            <Typography variant="body2" sx={{ color: '#1e40af' }}>
              These payments have been moved to <b>Past Raised Payments</b> below and are now being tracked on the <b>Bank</b> page.
            </Typography>
          </Box>

          {/* Excel structure explanation */}
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
            About the Excel File
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Chip label="Row 1" size="small" sx={{ bgcolor: '#BDD7EE', color: '#1e3a5f', fontWeight: 700, fontSize: '0.78rem', minWidth: 52 }} />
                <Typography variant="body2" sx={{ color: '#334155' }}>
                  <b>Column Headers</b> — Beneficiary Name, Account Number, IFSC, Transaction Type, Amount, etc.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Chip label="Row 2" size="small" sx={{ bgcolor: '#DEEBF7', color: '#1e3a5f', fontWeight: 700, fontSize: '0.78rem', minWidth: 52 }} />
                <Typography variant="body2" sx={{ color: '#334155' }}>
                  <b>Field Instructions</b> — Each column has rules: MANDATORY/OPTIONAL, format guidelines, and allowed values.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Chip label="Row 3+" size="small" sx={{ bgcolor: '#fff', color: '#334155', fontWeight: 700, fontSize: '0.78rem', border: '1px solid #e2e8f0', minWidth: 52 }} />
                <Typography variant="body2" sx={{ color: '#334155' }}>
                  <b>Payment Data</b> — One row per payment request with vendor name, bank details, net amount, PAN, and remarks.
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* What's pre-filled vs manual */}
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
            What You Need to Fill
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2.5 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, display: 'block', mb: 0.5 }}>Auto-filled by TTA</Typography>
                <Stack spacing={0.5}>
                  {['Beneficiary Name', 'Account Number', 'IFSC Code', 'Amount (Net)', 'Currency (INR)', 'Transaction Date', 'Remarks (PR + WO)', 'PAN Number'].map(f => (
                    <Typography key={f} variant="body2" sx={{ color: '#334155', fontSize: '0.85rem' }}>{f}</Typography>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mb: 0.5 }}>You must enter</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Debit Account Number</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Your IDFC FIRST Bank account</Typography>
                  <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600, mt: 0.5 }}>Transaction Type</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Default: NEFT. Change to IFT (same bank) or RTGS if needed</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Next steps */}
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
            Next Steps
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a' }}>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                <b>1.</b> Open the downloaded Excel file
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                <b>2.</b> Fill in your <b>Debit Account Number</b> (Column E)
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                <b>3.</b> Verify all details and <b>delete Row 2</b> (instructions row) before uploading
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                <b>4.</b> Upload to your bank portal (IDFC FIRST Bank / any bank)
              </Typography>
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                <b>5.</b> After payment, update the status in TTA's <b>Bank</b> page
              </Typography>
            </Stack>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setExportModal(p => ({ ...p, open: false }))}
            variant="contained"
            sx={{
              textTransform: 'none', fontWeight: 600, bgcolor: '#5B63D3',
              color: '#fff', borderRadius: 1.5, px: 3, boxShadow: 'none',
              '&:hover': { bgcolor: '#4338ca', boxShadow: 'none' },
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast(p => ({ ...p, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PaymentManagementPage;
