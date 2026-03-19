// src/components/bank/BankManagementPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Typography, Button, Stack, Chip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Alert, Snackbar, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Divider, LinearProgress,
  Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  CheckCircle as DoneIcon,
  ErrorOutline as BounceIcon,
  Edit as EditIcon,
  Warning as WarnIcon,
  AccountBalance as BankIcon,
  Receipt as TDSIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  TaskAlt as DepositedIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { FAKE_PAYMENT_REQUESTS, FAKE_TDS_RECORDS, FAKE_TDS_SUMMARY, PR_STATUS_COLORS } from '../payments/paymentData';

/* ── helpers ── */
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

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

/* ── Upload Confirmation Dialog ── */
function UploadConfirmationDialog({ open, onClose, onConfirm, records }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedIds, setParsedIds] = useState([]);
  const [parseError, setParseError] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setParsedIds([]);
      setParseError('');
      setMatchResult(null);
    }
  }, [open]);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setParseError('File must have a header row and at least one data row.');
      return;
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idColIndex = header.findIndex((h) =>
      h.includes('request') && h.includes('id') || h === 'request id' || h === 'id'
    );
    // Also look for a status column to see which ones are marked done
    const statusColIndex = header.findIndex((h) => h === 'status');

    if (idColIndex === -1) {
      setParseError('Could not find "Request ID" column in the uploaded file.');
      return;
    }

    const ids = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const id = cols[idColIndex];
      if (!id) continue;

      // If there's a status column, only include rows marked as done/completed
      if (statusColIndex !== -1) {
        const status = (cols[statusColIndex] || '').toLowerCase();
        if (status && status !== 'payment done' && status !== 'done' && status !== 'completed' && status !== 'sent to accounts') {
          continue;
        }
      }
      ids.push(id);
    }

    if (ids.length === 0) {
      setParseError('No valid Request IDs found in the file.');
      return;
    }

    setParsedIds(ids);
    setParseError('');

    // Match against current pending records
    const pendingRecords = records.filter((r) => r.status === 'Sent to Accounts');
    const matched = ids.filter((id) => pendingRecords.some((r) => r.id === id));
    const alreadyDone = ids.filter((id) => records.some((r) => r.id === id && r.status === 'Payment Done'));
    const notFound = ids.filter((id) => !records.some((r) => r.id === id));

    setMatchResult({ matched, alreadyDone, notFound, total: ids.length });
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv') && !f.name.endsWith('.txt')) {
      setParseError('Please upload a CSV file.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleConfirm = () => {
    if (matchResult && matchResult.matched.length > 0) {
      onConfirm(matchResult.matched);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Upload Bank Confirmation</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload the processed Excel/CSV file from the bank. The system will match Request IDs
          and mark corresponding payments as "Payment Done".
        </Typography>

        {/* Drop zone */}
        <Box
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${dragOver ? '#5B63D3' : '#e2e8f0'}`,
            borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer',
            bgcolor: dragOver ? '#eef2ff' : '#f8fafc',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#5B63D3', bgcolor: '#eef2ff' },
            mb: 2,
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 40, color: dragOver ? '#5B63D3' : '#94a3b8', mb: 1 }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: '#475569' }}>
            {file ? file.name : 'Drop CSV file here or click to browse'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Accepts .csv files with a "Request ID" column
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </Box>

        {/* Parse error */}
        {parseError && (
          <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {/* Match results */}
        {matchResult && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#1e293b' }}>
              Match Results
            </Typography>
            <Stack spacing={1}>
              {matchResult.matched.length > 0 && (
                <Alert severity="success" sx={{ borderRadius: 1.5, py: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {matchResult.matched.length} payment{matchResult.matched.length !== 1 ? 's' : ''} will be marked as "Payment Done"
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {matchResult.matched.join(', ')}
                  </Typography>
                </Alert>
              )}
              {matchResult.alreadyDone.length > 0 && (
                <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.5 }}>
                  <Typography variant="body2">
                    {matchResult.alreadyDone.length} already marked done — skipped: {matchResult.alreadyDone.join(', ')}
                  </Typography>
                </Alert>
              )}
              {matchResult.notFound.length > 0 && (
                <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5 }}>
                  <Typography variant="body2">
                    {matchResult.notFound.length} not found in system: {matchResult.notFound.join(', ')}
                  </Typography>
                </Alert>
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!matchResult || matchResult.matched.length === 0}
          sx={{
            textTransform: 'none', fontWeight: 600, borderRadius: 1.5, boxShadow: 'none',
            bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d', boxShadow: 'none' },
          }}
        >
          Confirm — Mark {matchResult?.matched.length || 0} as Done
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

/* ── IDFC FIRST Bank Bulk Payment format (.xlsx) ── */
function downloadBankFormat(records) {
  const pendingRecords = records.filter((r) => r.status === 'Sent to Accounts');
  if (pendingRecords.length === 0) return;

  const today = new Date();
  const ddmmyyyy = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  // Row 1: Headers
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
    'Custom Header – 1',
    'Custom Header – 2',
    'Custom Header – 3',
    'Custom Header – 4',
    'Custom Header – 5',
    'PAN',
  ];

  // Row 2: Instructions (matches exact IDFC template)
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
    'PAN',
  ];

  // Data rows — pre-filled from payment requests
  const dataRows = pendingRecords.map((r) => [
    r.vendorName || '',                    // Beneficiary Name
    r.accountNumber || '',                 // Beneficiary Account Number
    r.ifscCode || '',                      // IFSC
    'NEFT',                                // Transaction Type (default NEFT)
    '',                                    // Debit Account Number (accounts team fills)
    ddmmyyyy,                              // Transaction Date (today, editable)
    r.netAmount || 0,                      // Amount (net after TDS)
    'INR',                                 // Currency
    '',                                    // Beneficiary Email (optional)
    `${r.id} | ${r.workOrderNumber}`,      // Remarks — PR ID + WO number
    '',                                    // Custom 1
    '',                                    // Custom 2
    '',                                    // Custom 3
    '',                                    // Custom 4
    '',                                    // Custom 5
    r.panNumber || '',                     // PAN
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, instructions, ...dataRows]);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 10 },
    { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 8 },
    { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `BLKPAY_TTA_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ── Internal Excel (CSV) — full details ── */
function downloadInternalExcel(records, filename) {
  const rows = [
    ['Request ID', 'Work Order', 'Vendor Name', 'PAN', 'Bank Name', 'Account No', 'IFSC', 'Gross (₹)', 'TDS (₹)', 'Net Payable (₹)', 'Invoice Date', 'Status'],
    ...records.map((r) => [
      r.id, r.workOrderNumber || r.woNumber || '', r.vendorName, r.panNumber,
      r.bankName, r.accountNumber, r.ifscCode,
      r.grossAmount, r.tdsAmount, r.netAmount,
      r.invoiceDate || '', r.status,
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `payment_requests_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTDSExcel(records) {
  const rows = [
    ['TDS ID', 'Vendor Name', 'PAN', 'Section', 'Rate', 'Work Order', 'Month', 'Gross Amount', 'TDS Amount', 'Status', 'Deposited Date'],
    ...records.map((r) => [
      r.id, r.vendorName, r.panNumber, r.section, r.rate,
      r.woNumber, r.month, r.grossAmount, r.tdsAmount, r.status, r.depositedDate || '',
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tds_summary_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══ Main Page ══ */
function BankManagementPage() {
  const [tab, setTab] = useState(0);
  const [records, setRecords] = useState(FAKE_PAYMENT_REQUESTS);
  const [tdsRecords, setTdsRecords] = useState(FAKE_TDS_RECORDS);
  const [bounceDialog, setBounceDialog] = useState({ open: false, record: null });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [tdsDepositDialog, setTdsDepositDialog] = useState({ open: false, month: null });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const markDone = (id) => {
    setRecords((prev) => prev.map((r) => r.id === id
      ? { ...r, status: 'Payment Done', paymentDate: new Date().toISOString().slice(0, 10) }
      : r
    ));
    showToast('Payment marked as done — record locked');
  };

  const bulkMarkDone = (ids) => {
    const today = new Date().toISOString().slice(0, 10);
    setRecords((prev) => prev.map((r) =>
      ids.includes(r.id) && r.status === 'Sent to Accounts'
        ? { ...r, status: 'Payment Done', paymentDate: today }
        : r
    ));
    showToast(`${ids.length} payment${ids.length !== 1 ? 's' : ''} marked as done`);
  };

  const openBounce = (record) => setBounceDialog({ open: true, record });

  const handleBounceEdit = (updated) => {
    setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    showToast('Bank details updated — re-submitted to accounts');
  };

  const markTDSDeposited = (month) => {
    const today = new Date().toISOString().slice(0, 10);
    setTdsRecords((prev) => prev.map((t) =>
      t.month === month && t.status === 'Pending'
        ? { ...t, status: 'Deposited', depositedDate: today }
        : t
    ));
    setTdsDepositDialog({ open: false, month: null });
    showToast(`TDS for ${month} marked as deposited`);
  };

  const sentRecords = records.filter((r) => r.status !== 'Draft');
  const pendingTotal = records.filter((r) => r.status === 'Sent to Accounts').reduce((s, r) => s + r.netAmount, 0);
  const doneTotal = records.filter((r) => r.status === 'Payment Done').reduce((s, r) => s + r.netAmount, 0);
  const tdsTotal = FAKE_TDS_SUMMARY.reduce((s, t) => s + t.tdsAmount, 0);

  const tdsPending = tdsRecords.filter((t) => t.status === 'Pending');
  const tdsPendingTotal = tdsPending.reduce((s, t) => s + t.tdsAmount, 0);

  // Get unique months with pending TDS
  const pendingMonths = [...new Set(tdsPending.map((t) => t.month))];

  // Next month 7th
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 7);
  const dueStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
              Bank & TDS Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Process payments, track TDS deductions, and manage compliance.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<DownloadIcon />} endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
            sx={{
              mt: { xs: 2, sm: 0 }, textTransform: 'none', fontWeight: 600,
              borderRadius: 1.5, borderColor: '#5B63D3', color: '#5B63D3',
              '&:hover': { bgcolor: '#eef2ff', borderColor: '#4338ca' },
            }}>
            Download
          </Button>
          <Menu
            anchorEl={downloadMenuAnchor}
            open={Boolean(downloadMenuAnchor)}
            onClose={() => setDownloadMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 1.5, mt: 0.5, minWidth: 260 } }}
          >
            <MenuItem onClick={() => {
              downloadBankFormat(records);
              setDownloadMenuAnchor(null);
              const pending = records.filter(r => r.status === 'Sent to Accounts').length;
              if (pending > 0) showToast(`Bank format exported — ${pending} payment${pending !== 1 ? 's' : ''}`);
              else showToast('No pending payments to export', 'warning');
            }}>
              <ListItemIcon><BankIcon fontSize="small" sx={{ color: '#5B63D3' }} /></ListItemIcon>
              <ListItemText
                primary="IDFC Bank Format (.xlsx)"
                secondary="Bulk payment upload template"
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                secondaryTypographyProps={{ fontSize: '0.72rem' }}
              />
            </MenuItem>
            <MenuItem onClick={() => {
              downloadInternalExcel(sentRecords);
              setDownloadMenuAnchor(null);
            }}>
              <ListItemIcon><DownloadIcon fontSize="small" sx={{ color: '#64748b' }} /></ListItemIcon>
              <ListItemText
                primary="Internal Report (.csv)"
                secondary="All payment details for records"
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                secondaryTypographyProps={{ fontSize: '0.72rem' }}
              />
            </MenuItem>
          </Menu>
        </Stack>

        {/* TDS Due Date Banner — always visible when there's pending TDS */}
        {tdsPendingTotal > 0 && (
          <Alert
            severity={daysUntilDue <= 7 ? 'error' : 'warning'}
            icon={<WarnIcon />}
            sx={{ mb: 3, borderRadius: 2, border: daysUntilDue <= 7 ? '1px solid #fecaca' : '1px solid #fde68a' }}
          >
            <Typography variant="body2" fontWeight={700}>
              TDS Deposit Due: {dueStr} ({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} remaining)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtINR(tdsPendingTotal)} pending across {tdsPending.length} deduction{tdsPending.length !== 1 ? 's' : ''} — must be deposited by the 7th of next month (statutory deadline)
            </Typography>
          </Alert>
        )}

        {/* Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 4 }} flexWrap="wrap">
          {[
            { label: 'Pending Payments', value: fmtINR(pendingTotal), color: '#2563eb', bg: '#eff6ff' },
            { label: 'Payments Done', value: fmtINR(doneTotal), color: '#16a34a', bg: '#f0fdf4' },
            { label: 'TDS This Month', value: fmtINR(tdsTotal), color: '#d97706', bg: '#fffbeb' },
            { label: 'TDS Pending Deposit', value: fmtINR(tdsPendingTotal), color: '#dc2626', bg: '#fef2f2' },
          ].map((s) => (
            <Box key={s.label} sx={{
              flex: 1, minWidth: 160, p: 2, bgcolor: s.bg, borderRadius: 2,
              border: `1px solid ${s.color}22`,
            }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Tabs */}
        <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' },
                  '& .Mui-selected': { color: '#5B63D3' },
                  '& .MuiTabs-indicator': { bgcolor: '#5B63D3' } }}>
            <Tab icon={<BankIcon fontSize="small" />} iconPosition="start" label="Payment Processing" />
            <Tab icon={<TDSIcon fontSize="small" />} iconPosition="start" label="TDS Tracking" />
          </Tabs>
        </Box>

        {/* ══ TAB 0: Payment Processing ══ */}
        {tab === 0 && (
          <>
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
              <Button variant="outlined" startIcon={<UploadIcon />} size="small"
                onClick={() => setUploadDialog(true)}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                  borderColor: '#e2e8f0', color: '#475569',
                  '&:hover': { borderColor: '#94a3b8' },
                }}>
                Upload Confirmation
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined"
              sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['REQUEST ID', 'WORK ORDER', 'VENDOR', 'ACCOUNT DETAILS', 'GROSS', 'TDS', 'NET', 'INVOICE DATE', 'STATUS', 'ACTIONS'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px', py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sentRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No payment requests received yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sentRecords.map((r) => {
                      const s = PR_STATUS_COLORS[r.status] || PR_STATUS_COLORS['Sent to Accounts'];
                      const isLocked = r.status === 'Payment Done';
                      const isBounced = r.status === 'Payment Bounced';
                      return (
                        <TableRow key={r.id} hover sx={{
                          '&:last-child td': { border: 0 },
                          bgcolor: isLocked ? '#f0fdf410' : 'inherit',
                        }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#5B63D3' }}>{r.id}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>
                            <Typography variant="body2" fontWeight={600}>{r.workOrderNumber}</Typography>
                            {r.periodLabel && <Typography variant="caption" color="text.secondary">{r.periodLabel}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{r.vendorName}</Typography>
                            <Typography variant="caption" color="text.secondary">{r.panNumber}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>{r.bankName}</Typography>
                            <Typography variant="caption" color="text.secondary">{r.accountNumber}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{r.ifscCode}</Typography>
                            {isBounced && (
                              <Chip label="Wrong Details" size="small"
                                sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontSize: '0.6rem', height: 16, mt: 0.5 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtINR(r.grossAmount)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                            − {fmtINR(r.tdsAmount)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>
                            {fmtINR(r.netAmount)}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{fmtDate(r.invoiceDate)}</TableCell>
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
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {!isLocked && !isBounced && (
                                <>
                                  <Tooltip title="Mark Payment Done (locks record)">
                                    <IconButton size="small" onClick={() => markDone(r.id)} sx={{ color: '#16a34a' }}>
                                      <DoneIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Mark as Bounced">
                                    <IconButton size="small" onClick={() => openBounce(r)} sx={{ color: '#dc2626' }}>
                                      <BounceIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {isBounced && (
                                <Tooltip title="Edit bank details and re-submit">
                                  <IconButton size="small" onClick={() => openBounce(r)} sx={{ color: '#d97706' }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {isLocked && (
                                <Chip label="Locked" size="small"
                                  sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontSize: '0.65rem' }} />
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

        {/* ══ TAB 1: TDS Tracking ══ */}
        {tab === 1 && (
          <>
            {/* TDS due alert with export */}
            <Alert severity="warning" icon={<WarnIcon />}
              action={<Button size="small" color="warning" startIcon={<DownloadIcon />}
                onClick={() => downloadTDSExcel(tdsRecords)}>Export TDS</Button>}
              sx={{ mb: 3, borderRadius: 1.5 }}>
              <Typography variant="body2" fontWeight={700}>
                TDS Due — must be deposited by {dueStr}
              </Typography>
              <Typography variant="caption">
                Total pending: {fmtINR(tdsPendingTotal)} across {tdsPending.length} payment{tdsPending.length !== 1 ? 's' : ''}
              </Typography>
            </Alert>

            {/* Mark TDS Deposited — per month buttons */}
            {pendingMonths.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Mark TDS as Deposited
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {pendingMonths.map((month) => {
                    const monthRecords = tdsPending.filter((t) => t.month === month);
                    const monthTotal = monthRecords.reduce((s, t) => s + t.tdsAmount, 0);
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
                          borderColor: '#16a34a', color: '#16a34a',
                          '&:hover': { bgcolor: '#f0fdf4', borderColor: '#15803d' },
                        }}
                      >
                        {month} — {fmtINR(monthTotal)} ({monthRecords.length} record{monthRecords.length !== 1 ? 's' : ''})
                      </Button>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Monthly summary by TDS type */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              This Month — TDS Summary by Section
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
                  {FAKE_TDS_SUMMARY.map((t) => (
                    <TableRow key={t.section} hover sx={{ opacity: t.vendorCount === 0 ? 0.4 : 1, '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.section}</TableCell>
                      <TableCell>
                        <Chip label={t.rate} size="small"
                          sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{t.vendorCount}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {t.grossAmount > 0 ? fmtINR(t.grossAmount) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: t.tdsAmount > 0 ? '#dc2626' : '#94a3b8' }}>
                        {t.tdsAmount > 0 ? fmtINR(t.tdsAmount) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow sx={{ bgcolor: '#fef2f2' }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                      Total TDS to Deposit
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626' }}>
                      {fmtINR(tdsTotal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* TDS Register (detailed) */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#64748b', mb: 1.5, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              TDS Register (Detailed)
            </Typography>
            <TableContainer component={Paper} variant="outlined"
              sx={{ borderRadius: 2, borderColor: '#e2e8f0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['#', 'VENDOR', 'PAN', 'SECTION', 'WORK ORDER', 'MONTH', 'GROSS', 'TDS', 'STATUS', 'DEPOSITED'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.5px', py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tdsRecords.map((t) => (
                    <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.vendorName}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{t.panNumber}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{t.section}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.woNumber}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{t.month}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtINR(t.grossAmount)}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>{fmtINR(t.tdsAmount)}</TableCell>
                      <TableCell>
                        <Chip label={t.status} size="small" sx={{
                          bgcolor: t.status === 'Deposited' ? '#f0fdf4' : '#fef9c3',
                          color: t.status === 'Deposited' ? '#16a34a' : '#ca8a04',
                          fontWeight: 600, fontSize: '0.68rem',
                        }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {t.depositedDate ? fmtDate(t.depositedDate) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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

      {/* Upload confirmation dialog */}
      <UploadConfirmationDialog
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        onConfirm={bulkMarkDone}
        records={records}
      />

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
