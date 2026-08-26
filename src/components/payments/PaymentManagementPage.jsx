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
  Download as DownloadIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import PaymentRequestModal from './PaymentRequestModal';
import PaymentDetailDialog from './PaymentDetailDialog';
import { vendorsAPI, paymentRequestsAPI, paymentBatchesAPI } from '../../services/api';
import { buildBlkpayWorkbook } from '../../utils/blkpayExcel';
import { buildIciciXlsBuffer } from '../../utils/iciciExcel';
import { buildFullDetailsWorkbook } from '../../utils/fullDetailsExcel';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';

// localStorage batch cache removed — API is source of truth

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

const fmtINRPlain = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

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
        <Typography variant="caption" sx={{ color: '#6e6e73', fontWeight: 500 }}>{label}</Typography>
      </Box>
    </Box>
  );
}

/* ── IDFC FIRST Bank Bulk Payment format (.xlsx) ── */
/* Matches BLKPAY_070426.xlsx — see src/utils/blkpayExcel.js + blkpayExcel.test.js */
async function triggerXlsxDownload(wb, fileName) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadBankFormat(records, bank) {
  if (records.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (bank === 'ICICI') {
    const { buffer, dateStr } = await buildIciciXlsBuffer(records);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NPAB_FMT_${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await triggerXlsxDownload(buildFullDetailsWorkbook(records), `PAYMENT_DETAILS_TTA_${today}.xlsx`);
    return `NPAB_FMT_${dateStr}.xlsx`;
  } else {
    const bankWorkbook = buildBlkpayWorkbook(records);
    const fileName = `IDFC_BLKPAY_TTA_${today}.xlsx`;
    await triggerXlsxDownload(bankWorkbook, fileName);
    await triggerXlsxDownload(buildFullDetailsWorkbook(records), `PAYMENT_DETAILS_TTA_${today}.xlsx`);
    return fileName;
  }
}

/* ── PDF receipt for past batches ── */
function downloadBatchPDF(batch) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('India Khelo Football', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Payment Batch Summary', 14, 24);

  // Batch info
  doc.setFontSize(9);
  doc.setTextColor(60);
  const sentDate = batch.sentAt
    ? new Date(batch.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  doc.text(`Batch: ${batch.fileName || batch.batchNumber || '—'}`, 14, 32);
  doc.text(`Sent on: ${sentDate}`, 14, 37);
  doc.text(`Total Payments: ${batch.payments.length}`, 14, 42);

  // Summary boxes — right aligned
  const summaryY = 32;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(`Gross: ${fmtINR(batch.totalGross)}`, pageW - 14, summaryY, { align: 'right' });
  doc.setTextColor(200, 0, 0);
  doc.text(`TDS: ${fmtINR(batch.totalTds)}`, pageW - 14, summaryY + 5, { align: 'right' });
  doc.setTextColor(0, 128, 0);
  doc.text(`Net Payable: ${fmtINR(batch.totalNet)}`, pageW - 14, summaryY + 10, { align: 'right' });

  // Table
  const rows = batch.payments.map((r, i) => [
    i + 1,
    r.requestNumber || r.id,
    r.workOrderNumber || '—',
    r.vendorName || '—',
    r.vendorType || '—',
    fmtINRPlain(r.grossAmount),
    `${r.tdsRate || 0}%`,
    fmtINRPlain(r.tdsAmount),
    fmtINRPlain(r.netAmount),
    r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Request ID', 'Work Order', 'Vendor', 'Type', 'Gross', 'TDS %', 'TDS Amt', 'Net Amount', 'Invoice Date']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [91, 99, 211], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    // Totals footer
    didDrawPage: () => {
      const finalY = doc.lastAutoTable.finalY + 4;
      doc.setDrawColor(200);
      doc.line(14, finalY, pageW - 14, finalY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      doc.text('Totals:', 14, finalY + 6);
      doc.text(`Gross: ${fmtINR(batch.totalGross)}`, 80, finalY + 6);
      doc.setTextColor(200, 0, 0);
      doc.text(`TDS: ${fmtINR(batch.totalTds)}`, 140, finalY + 6);
      doc.setTextColor(0, 128, 0);
      doc.text(`Net: ${fmtINR(batch.totalNet)}`, 200, finalY + 6);
    },
  });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Generated by TTA - India Khelo Football', 14, pageH - 8);
  doc.text(`Printed: ${new Date().toLocaleString('en-IN')}`, pageW - 14, pageH - 8, { align: 'right' });

  const pdfName = `Payment_Batch_${batch.fileName?.replace('.xlsx', '') || batch.batchNumber || 'summary'}.pdf`;
  doc.save(pdfName);
}

// ══════════════════════════════════════════════════════════════════════════════
function PaymentManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canEdit } = useGrants();
  const canEditPayments = canEdit('payments');
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
  const [bankPicker, setBankPicker] = useState({ open: false });
  const [sentBatches, setSentBatches] = useState([]);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  const showToast = (msg, severity = 'success') => setToast({ open: true, message: msg, severity });

  const fetchPayments = ({ silent = false } = {}) => {
    paymentRequestsAPI.getAll()
      .then((res) => {
        setPayments(res.paymentRequests || []);
      })
      .catch((err) => {
        if (silent) return;
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
  useRefetchOnFocus(() => { fetchPayments({ silent: true }); fetchBatches(); });

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

  // PATCH, not PUT: callers pass a partial object (often just { status }).
  // A PUT makes the serializer non-partial, so it rejects the body for the
  // required fields the caller never sent, and the save is lost.
  const handlePaymentUpdate = async (prId, updates) => {
    try {
      await paymentRequestsAPI.patch(prId, updates);
      showToast('Payment request updated');
      fetchPayments();
      setDetailPayment(prev => prev ? { ...prev, ...updates } : prev);
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to update payment request';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    }
  };

  const handlePaymentDelete = async (pr) => {
    if (!window.confirm(`Delete payment request ${pr.id || pr.requestNumber}?`)) return;
    try {
      await paymentRequestsAPI.delete(pr.id);
      showToast('Payment request deleted');
      fetchPayments();
    } catch (err) {
      const msg = err?.message || err?.detail || 'Failed to delete payment request';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    }
  };

  const handleSendToPayment = () => {
    if (filtered.length === 0) {
      showToast('No payment requests to send', 'warning');
      return;
    }
    setBankPicker({ open: true });
  };

  const handleBankChosen = async (bank) => {
    setBankPicker({ open: false });
    const fileName = await downloadBankFormat(filtered, bank);
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
            color="#15803D"
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
          {canEditPayments && (
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
          )}
        </Stack>

        {/* ══ Active Payment Requests Table ══ */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['REQUEST ID', 'WORK ORDER', 'VENDOR', 'GROSS', 'TDS', 'NET', 'INVOICE DATE', 'ACTIONS'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.82rem', color: '#5B6270',
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
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#15803D' }}>
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
                        {canEditPayments && (
                          <Tooltip title="Edit">
                            <IconButton size="small" sx={{ color: '#64748b' }}
                              onClick={() => { setDetailPayment(r); setDetailMode('edit'); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEditPayments && (
                          <Tooltip title="Delete">
                            <IconButton size="small" sx={{ color: '#dc2626' }}
                              onClick={() => handlePaymentDelete(r)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#15803D' }}>
                      {fmtINR(filtered.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0))}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
            {canEditPayments && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<PayIcon />}
                onClick={handleSendToPayment}
                sx={{
                  bgcolor: '#2563EB', color: '#fff',
                  textTransform: 'none', fontWeight: 700,
                  borderRadius: 1.5, px: 4, py: 1.2,
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                  '&:hover': { bgcolor: '#1D4ED8', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' },
                }}
              >
                Send to Payment
              </Button>
            </Box>
            )}
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
                          <ExcelIcon sx={{ color: '#15803D', fontSize: 22 }} />
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
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#15803D' }}>
                              {fmtINR(batch.totalNet)}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">TDS</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#dc2626' }}>
                              {fmtINR(batch.totalTds)}
                            </Typography>
                          </Box>
                          <Tooltip title="Download PDF summary">
                            <IconButton size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadBatchPDF(batch);
                              }}
                              sx={{ color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px',
                                '&:hover': { bgcolor: '#fef2f2', borderColor: '#dc2626' } }}>
                              <DownloadIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          {isExpanded ? <ExpandLessIcon sx={{ color: '#5A6B82' }} /> : <ExpandMoreIcon sx={{ color: '#5A6B82' }} />}
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
                                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#5A6B82', letterSpacing: '0.05em', py: 1 }}>
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
                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#15803D', fontSize: '0.85rem' }}>{fmtINR(r.netAmount)}</Typography>
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
                                  <Typography variant="body2" fontWeight={800} sx={{ color: '#15803D' }}>{fmtINR(batch.totalNet)}</Typography>
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

      {/* Bank picker — shown before generating the payment file */}
      <Dialog
        open={bankPicker.open}
        onClose={() => setBankPicker({ open: false })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Choose payment bank
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
            Which account will these {filtered.length} payment{filtered.length !== 1 ? 's' : ''} be processed through?
          </Typography>
          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => handleBankChosen('IDFC')}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography fontWeight={600}>IDFC FIRST Bank</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  A/C 10064068880 — IDFC BLKPAY format
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => handleBankChosen('ICICI')}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5 }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography fontWeight={600}>ICICI Bank</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  A/C 092701004321 — ICICI Converter template
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBankPicker({ open: false })}>Cancel</Button>
        </DialogActions>
      </Dialog>

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
            <ExcelIcon sx={{ color: '#15803D', fontSize: 28 }} />
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
              <CheckIcon sx={{ color: '#15803D' }} />
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#15803d' }}>
                  {exportModal.fileName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803D' }}>
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
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
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
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
            What You Need to Fill
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2.5 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 700, display: 'block', mb: 0.5 }}>Auto-filled by TTA</Typography>
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
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
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
