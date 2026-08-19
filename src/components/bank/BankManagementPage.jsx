// src/components/bank/BankManagementPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, Stack, Chip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Alert, Snackbar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as DoneIcon,
  ErrorOutline as BounceIcon,
  Edit as EditIcon,
  Warning as WarnIcon,
  AccountBalance as BankIcon,
  Receipt as TDSIcon,
  Close as CloseIcon,
  TaskAlt as DepositedIcon,
} from '@mui/icons-material';
import { PR_STATUS_COLORS } from '../payments/paymentData';
import { paymentRequestsAPI, tdsAPI, vendorsAPI } from '../../services/api';
import { csvBlob } from '../../utils/csv';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { tdsDueDate, daysUntilTDSDue, fmtDueDate, buildTDSDueInfo } from './tdsDueDate';

/* ── helpers ── */
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ── Payment bounce edit dialog ── */
function BounceEditDialog({ open, record, onClose, onSave }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    if (open && record) {
      setAccountNumber(record.accountNumber || '');
      setIfscCode(record.ifscCode || '');
      setBankName(record.bankName || '');
    }
  }, [open, record]);

  if (!record) return null;

  const handleSave = () => {
    onSave({ ...record, accountNumber, ifscCode, bankName, status: 'Sent to Accounts' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Fix Bank Details</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>Payment Bounced</Typography>
          <Typography variant="caption">{record.bounceReason}</Typography>
        </Alert>
        <Stack spacing={2}>
          <TextField label="Bank Name" size="small" fullWidth value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          <TextField label="Account Number" size="small" fullWidth value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
          <TextField label="IFSC Code" size="small" fullWidth value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained"
          sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A', color: '#1e293b', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
          Re-submit to Accounts
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Mark TDS Deposited Confirmation Dialog ── */
function TDSDepositDialog({ open, onClose, onConfirm, month, pendingCount, pendingAmount }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Mark TDS as Deposited</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            Confirm TDS deposit for {month}
          </Typography>
          <Typography variant="caption">
            This will mark {pendingCount} TDS record{pendingCount !== 1 ? 's' : ''} totalling {fmtINR(pendingAmount)} as "Deposited".
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          This action updates vendor statements to reflect that TDS has been deposited on their behalf.
          Make sure the deposit has been completed with the government before confirming.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained"
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 1.5, boxShadow: 'none',
            bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d', boxShadow: 'none' },
          }}>
          Confirm Deposit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── TDS Export (CSV) ── */
function downloadTDSExcel(records) {
  const rows = [
    ['TDS ID', 'Vendor Name', 'PAN', 'Section', 'Rate', 'Work Order', 'Month', 'Gross Amount', 'TDS Amount', 'Status', 'Deposited Date'],
    ...records.map((r) => [
      r.id, r.vendorName, r.panNumber, r.section, r.rate,
      r.woNumber, r.month, r.grossAmount, r.tdsAmount, r.status, r.depositedDate || '',
    ]),
  ];
  const blob = csvBlob(rows);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tds_summary_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══ Main Page ══ */
function BankManagementPage() {
  // Status changes PATCH payment requests (module: payments); TDS deposits
  // hit the tds module — gate each action by what the backend will enforce.
  const { canEdit } = useGrants();
  const [tab, setTab] = useState(0);
  const [records, setRecords] = useState([]);
  const [tdsRecords, setTdsRecords] = useState([]);
  const [tdsSummary, setTdsSummary] = useState([]);
  const [bounceDialog, setBounceDialog] = useState({ open: false, record: null });
  const [tdsDepositDialog, setTdsDepositDialog] = useState({ open: false, month: null });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const loadBankData = () => {
    paymentRequestsAPI.getAll()
      .then((res) => setRecords(res.paymentRequests || []))
      .catch(() => setRecords([]));
    tdsAPI.getAll()
      .then((res) => setTdsRecords(res.tdsRecords || []))
      .catch(() => setTdsRecords([]));
    tdsAPI.getSummary()
      .then((res) => setTdsSummary(Array.isArray(res) ? res : []))
      .catch(() => setTdsSummary([]));
  };

  useEffect(() => { loadBankData(); }, []);
  useRefetchOnFocus(loadBankData);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const markDone = async (id) => {
    try {
      await paymentRequestsAPI.patch(id, { status: 'Payment Done' });
      setRecords((prev) => prev.map((r) => r.id === id
        ? { ...r, status: 'Payment Done', paymentDate: new Date().toISOString().slice(0, 10) }
        : r
      ));
      showToast('Payment marked as done');
    } catch (err) {
      console.error('markDone error:', err);
      showToast('Failed to update payment status', 'error');
    }
  };

  const markBounced = async (record) => {
    try {
      await paymentRequestsAPI.patch(record.id, { status: 'Payment Bounced' });
      setRecords((prev) => prev.map((r) => r.id === record.id
        ? { ...r, status: 'Payment Bounced' }
        : r
      ));
      showToast('Payment marked as bounced');
    } catch (err) {
      console.error('markBounced error:', err);
      showToast('Failed to update payment status', 'error');
    }
  };

  const openBounce = (record) => setBounceDialog({ open: true, record });

  const handleBounceEdit = async (updated) => {
    try {
      // Bank details belong to the vendor — the payment request only projects
      // them read-only. Persist the correction on the vendor first, otherwise
      // the re-submitted payment carries the same wrong details that bounced.
      if (updated.vendorId) {
        await vendorsAPI.updateBankDetails(updated.vendorId, {
          bankName: updated.bankName,
          accountNumber: updated.accountNumber,
          ifscCode: updated.ifscCode,
        });
      }
      await paymentRequestsAPI.patch(updated.id, { status: 'Sent to Accounts' });
      setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      showToast('Bank details updated — re-submitted to accounts');
    } catch (err) {
      console.error('handleBounceEdit error:', err);
      showToast('Failed to re-submit payment', 'error');
    }
  };

  const markTDSDeposited = async (month) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await tdsAPI.markDeposited(month);
      tdsAPI.getAll()
        .then((res) => setTdsRecords(res.tdsRecords || []))
        .catch(() => {});
      tdsAPI.getSummary()
        .then((res) => setTdsSummary(Array.isArray(res) ? res : []))
        .catch(() => {});
      showToast(`TDS for ${month} marked as deposited`);
    } catch (err) {
      console.error('markTDSDeposited error:', err);
      setTdsRecords((prev) => prev.map((t) =>
        t.month === month && t.status === 'Pending'
          ? { ...t, status: 'Deposited', depositedDate: today }
          : t
      ));
      showToast(`TDS for ${month} marked as deposited (offline)`);
    }
    setTdsDepositDialog({ open: false, month: null });
  };

  // Status correction for Done/Bounced payments
  const [statusEditDialog, setStatusEditDialog] = useState({ open: false, record: null });

  const handleStatusCorrection = async (record, newStatus) => {
    try {
      const patch = { status: newStatus };
      if (newStatus === 'Payment Done') patch.paymentDate = new Date().toISOString().slice(0, 10);
      await paymentRequestsAPI.patch(record.id, patch);
      setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, ...patch } : r));
      showToast(`Status changed to ${newStatus}`);
    } catch (err) {
      console.error('statusCorrection error:', err);
      showToast('Failed to update status', 'error');
    }
    setStatusEditDialog({ open: false, record: null });
  };

  // Only show non-Draft payments (those that came via "Send to Payment")
  const sentRecords = records.filter((r) => r.status !== 'Draft');
  const pendingRecords = sentRecords.filter((r) => r.status === 'Sent to Accounts');
  const doneRecords = sentRecords.filter((r) => r.status === 'Payment Done');
  const bouncedRecords = sentRecords.filter((r) => r.status === 'Payment Bounced');
  const pendingTotal = pendingRecords.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0);
  const doneTotal = doneRecords.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0);

  const tdsPending = tdsRecords.filter((t) => t.status === 'Pending');
  const tdsPendingTotal = tdsPending.reduce((s, t) => s + (parseFloat(t.tdsAmount) || 0), 0);
  const pendingMonthNames = [...new Set(tdsPending.map((t) => t.month))];

  // Each pending month carries its own deadline: 7th of the month after deduction.
  const dueInfo = buildTDSDueInfo(pendingMonthNames);
  const dueInfoByMonth = Object.fromEntries(dueInfo.map((d) => [d.month, d]));
  const pendingMonths = dueInfo.map((d) => d.month);
  const overdueMonths = dueInfo.filter((d) => d.overdue);
  const nextDue = dueInfo.find((d) => d.due) || null;
  const isUrgent = overdueMonths.length > 0 || (nextDue && nextDue.days <= 7);

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
            Bank Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track payments sent for processing, confirm completions, and handle bounces.
          </Typography>
        </Box>

        {/* Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 4 }} flexWrap="wrap">
          {[
            { label: 'Awaiting Confirmation', value: fmtINR(pendingTotal), sub: `${pendingRecords.length} payment${pendingRecords.length !== 1 ? 's' : ''}`, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Payments Done', value: fmtINR(doneTotal), sub: `${doneRecords.length} completed`, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Bounced', value: String(bouncedRecords.length), sub: bouncedRecords.length > 0 ? 'Needs attention' : 'None', color: '#dc2626', bg: '#fef2f2' },
          ].map((s) => (
            <Box key={s.label} sx={{
              flex: 1, minWidth: 160, p: 2, bgcolor: s.bg, borderRadius: 2,
              border: `1px solid ${s.color}22`,
            }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Tabs */}
        <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' },
                  '& .Mui-selected': { color: '#5B63D3' },
                  '& .MuiTabs-indicator': { bgcolor: '#5B63D3' } }}>
            <Tab icon={<BankIcon fontSize="small" />} iconPosition="start" label="Payment Tracking" />
            <Tab icon={<TDSIcon fontSize="small" />} iconPosition="start" label="TDS Deposits" />
          </Tabs>
        </Box>

        {/* ══ TAB 0: Payment Tracking ══ */}
        {tab === 0 && (
          <>
            <TableContainer component={Paper} variant="outlined"
              sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['PAYMENT', 'VENDOR / BANK', 'AMOUNT', 'STATUS', 'ACTIONS'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px', py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sentRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                        <BankIcon sx={{ fontSize: 40, color: '#e2e8f0', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          No payments to track yet.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Payments will appear here after "Send to Payment" from the Raise Payment page.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sentRecords.map((r) => {
                      const s = PR_STATUS_COLORS[r.status] || PR_STATUS_COLORS['Sent to Accounts'];
                      const isLocked = r.status === 'Payment Done';
                      const isBounced = r.status === 'Payment Bounced';
                      return (
                        <TableRow key={r.id || r.requestNumber} hover sx={{
                          '&:last-child td': { border: 0 },
                          bgcolor: isLocked ? '#f0fdf410' : isBounced ? '#fef2f208' : 'inherit',
                        }}>
                          {/* PAYMENT — ID + WO + date */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#5B63D3', fontSize: '0.8rem' }}>
                              {r.requestNumber || r.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {r.workOrderNumber}{r.periodLabel ? ` · ${r.periodLabel}` : ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{fmtDate(r.invoiceDate)}</Typography>
                          </TableCell>
                          {/* VENDOR / BANK */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{r.vendorName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {r.accountNumber} · {r.ifscCode}
                            </Typography>
                            {isBounced && (
                              <Chip label="Wrong Details" size="small"
                                sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontSize: '0.6rem', height: 16, mt: 0.5 }} />
                            )}
                          </TableCell>
                          {/* AMOUNT — net prominent, gross/tds below */}
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a', fontSize: '0.85rem' }}>
                              {fmtINR(r.netAmount)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fmtINR(r.grossAmount)} − TDS {fmtINR(r.tdsAmount)}
                            </Typography>
                          </TableCell>
                          {/* STATUS */}
                          <TableCell>
                            <Chip label={r.status} size="small" sx={{
                              bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`,
                              fontWeight: 600, fontSize: '0.68rem',
                            }} />
                            {r.paymentDate && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {fmtDate(r.paymentDate)}
                              </Typography>
                            )}
                          </TableCell>
                          {/* ACTIONS */}
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {!isLocked && !isBounced && canEdit('payments') && (
                                <>
                                  <Tooltip title="Mark Payment Done">
                                    <IconButton size="small" onClick={() => markDone(r.id)} sx={{ color: '#16a34a' }}>
                                      <DoneIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Mark as Bounced">
                                    <IconButton size="small" onClick={() => markBounced(r)} sx={{ color: '#dc2626' }}>
                                      <BounceIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {isBounced && canEdit('payments') && (
                                <>
                                  <Tooltip title="Fix bank details and re-submit">
                                    <IconButton size="small" onClick={() => openBounce(r)} sx={{ color: '#d97706' }}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Change status">
                                    <IconButton size="small" onClick={() => setStatusEditDialog({ open: true, record: r })} sx={{ color: '#64748b' }}>
                                      <EditIcon fontSize="small" sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {isLocked && (
                                <>
                                  <Chip label="Done" size="small" icon={<DoneIcon sx={{ fontSize: 14 }} />}
                                    sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontSize: '0.65rem' }} />
                                  {canEdit('payments') && (
                                    <Tooltip title="Edit status (e.g. if payment bounced)">
                                      <IconButton size="small" onClick={() => setStatusEditDialog({ open: true, record: r })}
                                        sx={{ color: '#64748b', ml: 0.5, border: '1px solid #e2e8f0', borderRadius: '8px',
                                          '&:hover': { bgcolor: '#f1f5f9', borderColor: '#5A6B82' } }}>
                                        <EditIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* ══ TAB 1: TDS Deposits ══ */}
        {tab === 1 && (
          <>
            {/* TDS due alert */}
            {tdsPendingTotal > 0 && (
              <Alert severity={isUrgent ? 'error' : 'warning'} icon={<WarnIcon />}
                action={<Button size="small" color={isUrgent ? 'error' : 'warning'} startIcon={<DownloadIcon />}
                  onClick={() => downloadTDSExcel(tdsRecords)}>Export TDS</Button>}
                sx={{ mb: 3, borderRadius: 1.5 }}>
                <Typography variant="body2" fontWeight={700}>
                  {overdueMonths.length > 0
                    ? `TDS Deposit Overdue: ${overdueMonths[0].month} was due ${overdueMonths[0].dueStr} (${Math.abs(overdueMonths[0].days)} day${Math.abs(overdueMonths[0].days) !== 1 ? 's' : ''} late)`
                    : nextDue
                      ? `TDS Deposit Due: ${nextDue.dueStr} for ${nextDue.month} (${nextDue.days} day${nextDue.days !== 1 ? 's' : ''} remaining)`
                      : 'TDS Deposit Due'}
                </Typography>
                <Typography variant="caption">
                  {fmtINR(tdsPendingTotal)} pending across {tdsPending.length} deduction{tdsPending.length !== 1 ? 's' : ''}
                  {overdueMonths.length > 1 ? ` — ${overdueMonths.length} months overdue` : ''}
                </Typography>
              </Alert>
            )}

            {tdsPendingTotal === 0 && tdsRecords.length === 0 && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }}>
                No TDS records yet. TDS records are created automatically when payments with TDS are raised.
              </Alert>
            )}

            {/* Mark TDS Deposited — per month buttons */}
            {pendingMonths.length > 0 && canEdit('tds') && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Mark TDS as Deposited
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {pendingMonths.map((month) => {
                    const monthRecords = tdsPending.filter((t) => t.month === month);
                    const monthTotal = monthRecords.reduce((s, t) => s + (parseFloat(t.tdsAmount) || 0), 0);
                    const info = dueInfoByMonth[month];
                    const isOverdue = Boolean(info && info.overdue);
                    return (
                      <Button
                        key={month}
                        variant="outlined"
                        startIcon={<DepositedIcon />}
                        onClick={() => setTdsDepositDialog({
                          open: true,
                          month,
                          pendingCount: monthRecords.length,
                          pendingAmount: monthTotal,
                        })}
                        sx={{
                          textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                          borderColor: isOverdue ? '#dc2626' : '#16a34a',
                          color: isOverdue ? '#dc2626' : '#16a34a',
                          '&:hover': {
                            bgcolor: isOverdue ? '#fef2f2' : '#f0fdf4',
                            borderColor: isOverdue ? '#b91c1c' : '#15803d',
                          },
                        }}
                      >
                        {month} — {fmtINR(monthTotal)} ({monthRecords.length} record{monthRecords.length !== 1 ? 's' : ''})
                        {info && info.due ? (isOverdue ? ` · overdue since ${info.dueStr}` : ` · due ${info.dueStr}`) : ''}
                      </Button>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Monthly summary by TDS type */}
            {tdsSummary.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  TDS Summary by Section
                </Typography>
                <TableContainer component={Paper} variant="outlined"
                  sx={{ borderRadius: 2, borderColor: '#e2e8f0', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        {['TDS SECTION', 'RATE', 'VENDORS', 'GROSS AMOUNT', 'TDS AMOUNT'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px', py: 1.5 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tdsSummary.map((t) => (
                        <TableRow key={t.section} hover sx={{ opacity: t.vendorCount === 0 ? 0.4 : 1, '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.section}</TableCell>
                          <TableCell>
                            <Chip label={t.rate} size="small"
                              sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>{t.vendorCount}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {parseFloat(t.grossAmount) > 0 ? fmtINR(t.grossAmount) : '—'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: parseFloat(t.tdsAmount) > 0 ? '#dc2626' : '#5A6B82' }}>
                            {parseFloat(t.tdsAmount) > 0 ? fmtINR(t.tdsAmount) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow sx={{ bgcolor: '#fef2f2' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '0.82rem' }}>Total TDS Liability</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                          {fmtINR(tdsSummary.reduce((s, t) => s + (parseFloat(t.grossAmount) || 0), 0))}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>
                          {fmtINR(tdsSummary.reduce((s, t) => s + (parseFloat(t.tdsAmount) || 0), 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* All TDS records */}
            {tdsRecords.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  All TDS Records
                </Typography>
                <TableContainer component={Paper} variant="outlined"
                  sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        {['VENDOR', 'SECTION / RATE', 'MONTH', 'TDS AMOUNT', 'STATUS'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px', py: 1.5 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tdsRecords.map((t) => (
                        <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{t.vendorName}</Typography>
                            <Typography variant="caption" color="text.secondary">{t.panNumber}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{t.section}</Typography>
                            <Chip label={t.rate} size="small"
                              sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.68rem', mt: 0.5 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem' }}>
                            {t.month}
                            {t.status === 'Pending' && tdsDueDate(t.month) && (
                              <Typography variant="caption" sx={{
                                display: 'block',
                                color: daysUntilTDSDue(t.month) < 0 ? '#dc2626' : '#64748b',
                              }}>
                                {daysUntilTDSDue(t.month) < 0 ? 'overdue since ' : 'due '}
                                {fmtDueDate(tdsDueDate(t.month))}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                            {fmtINR(t.tdsAmount)}
                          </TableCell>
                          <TableCell>
                            <Chip label={t.status} size="small" sx={{
                              bgcolor: t.status === 'Deposited' ? '#f0fdf4' : '#fffbeb',
                              color: t.status === 'Deposited' ? '#16a34a' : '#d97706',
                              fontWeight: 600, fontSize: '0.68rem',
                              border: `1px solid ${t.status === 'Deposited' ? '#bbf7d0' : '#fde68a'}`,
                            }} />
                            {t.depositedDate && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {fmtDate(t.depositedDate)}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}

      </Container>

      {/* Bounce edit dialog */}
      <BounceEditDialog
        open={bounceDialog.open}
        record={bounceDialog.record}
        onClose={() => setBounceDialog({ open: false, record: null })}
        onSave={handleBounceEdit}
      />

      {/* Status correction dialog */}
      <Dialog open={statusEditDialog.open}
        onClose={() => setStatusEditDialog({ open: false, record: null })}
        maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>Change Payment Status</Typography>
          <IconButton size="small" onClick={() => setStatusEditDialog({ open: false, record: null })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {statusEditDialog.record && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {statusEditDialog.record.requestNumber} — Current status: <strong>{statusEditDialog.record.status}</strong>
              </Typography>
              <Stack spacing={1.5}>
                {statusEditDialog.record.status !== 'Sent to Accounts' && (
                  <Button fullWidth variant="outlined" startIcon={<BankIcon />}
                    onClick={() => handleStatusCorrection(statusEditDialog.record, 'Sent to Accounts')}
                    sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', borderColor: '#bfdbfe', color: '#2563eb',
                      '&:hover': { bgcolor: '#eff6ff', borderColor: '#2563eb' } }}>
                    Sent to Accounts
                  </Button>
                )}
                {statusEditDialog.record.status !== 'Payment Done' && (
                  <Button fullWidth variant="outlined" startIcon={<DoneIcon />}
                    onClick={() => handleStatusCorrection(statusEditDialog.record, 'Payment Done')}
                    sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', borderColor: '#bbf7d0', color: '#16a34a',
                      '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' } }}>
                    Payment Done
                  </Button>
                )}
                {statusEditDialog.record.status !== 'Payment Bounced' && (
                  <Button fullWidth variant="outlined" startIcon={<BounceIcon />}
                    onClick={() => handleStatusCorrection(statusEditDialog.record, 'Payment Bounced')}
                    sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', borderColor: '#fecaca', color: '#dc2626',
                      '&:hover': { bgcolor: '#fef2f2', borderColor: '#dc2626' } }}>
                    Payment Bounced
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* TDS deposit confirmation dialog */}
      <TDSDepositDialog
        open={tdsDepositDialog.open}
        onClose={() => setTdsDepositDialog({ open: false, month: null })}
        onConfirm={() => markTDSDeposited(tdsDepositDialog.month)}
        month={tdsDepositDialog.month}
        pendingCount={tdsDepositDialog.pendingCount || 0}
        pendingAmount={tdsDepositDialog.pendingAmount || 0}
      />

      <Snackbar open={toast.open} autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BankManagementPage;
