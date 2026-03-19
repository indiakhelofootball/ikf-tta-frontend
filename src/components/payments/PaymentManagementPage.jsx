// src/components/payments/PaymentManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, TextField, InputAdornment,
  Chip, Snackbar, Alert, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  ReceiptLong as InvoiceIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as DoneIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';

import PaymentRequestModal from './PaymentRequestModal';
import PaymentDetailDialog from './PaymentDetailDialog';
import { FAKE_PAYMENT_REQUESTS, PR_STATUS_COLORS } from './paymentData';
import { vendorsAPI } from '../../services/api';

// Same fallback vendors used by WorkOrderManagementPage
const FALLBACK_VENDORS = [
  {
    id: 'local-1', vendorName: 'insaan', vendorType: 'Photography', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: 'N/A', panNumber: 'CVKPA1025N', contactPerson: 'Abhishek Anshuman',
    phone: '9097880029', email: 'abhi.ansh.one21@gmail.com', bankName: 'Punjab National Bank',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
  {
    id: 'local-2', vendorName: 'rda', vendorType: 'photographer', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: 'N/A', panNumber: 'CVKPA1025N', contactPerson: 'Abhishek Anshuman',
    phone: '9611601858', email: 'abhiansh2194@gmail.com', bankName: 'Punjab National Bank',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
  {
    id: 'local-3', vendorName: 'ClickMaster Studios Pvt Ltd', vendorType: 'Photography', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: '27XYZCS5678T1ZM', panNumber: 'XYZCS5678T', contactPerson: 'Priya Mehta',
    phone: '9845612300', email: 'priya@clickmaster.in', bankName: '',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

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

// ══════════════════════════════════════════════════════════════════════════════
function PaymentManagementPage() {
  const [payments, setPayments] = useState(FAKE_PAYMENT_REQUESTS);
  const [filtered, setFiltered] = useState(FAKE_PAYMENT_REQUESTS);
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState([]);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    vendorsAPI.getAll({ limit: 1000 })
      .then((res) => {
        const list = res.vendors || [];
        setVendors(list.length ? list : FALLBACK_VENDORS);
      })
      .catch(() => setVendors(FALLBACK_VENDORS));
  }, []);

  /* ── Filter ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? payments.filter(r =>
            r.id?.toLowerCase().includes(q) ||
            r.workOrderNumber?.toLowerCase().includes(q) ||
            r.vendorName?.toLowerCase().includes(q) ||
            r.vendorType?.toLowerCase().includes(q)
          )
        : payments
    );
  }, [payments, search]);

  /* ── Stats ──────────────────────────────────────────────────────────── */
  const totalGross = payments.reduce((s, r) => s + (r.grossAmount || 0), 0);
  const totalNetPaid = payments
    .filter(r => r.status === 'Payment Done')
    .reduce((s, r) => s + (r.netAmount || 0), 0);
  const pendingCount = payments.filter(r => r.status === 'Sent to Accounts').length;

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const showToast = (msg, severity = 'success') => setToast({ open: true, message: msg, severity });

  const handlePaymentRequestSave = (pr) => {
    setPayments(prev => [pr, ...prev]);
    setPrModalOpen(false);
    showToast(
      pr.status === 'Sent to Accounts'
        ? 'Payment request sent to accounts!'
        : 'Payment request saved as draft'
    );
  };

  const handlePaymentUpdate = (prId, updates) => {
    setPayments(prev => prev.map(p => p.id === prId ? { ...p, ...updates } : p));
    setDetailPayment(prev => prev ? { ...prev, ...updates } : prev);
    showToast('Payment request updated');
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
            icon={<DoneIcon fontSize="inherit" />}
            value={fmtINR(totalNetPaid)}
            label="Total Net Paid"
            color="#16a34a"
          />
          <StatCard
            icon={<PendingIcon fontSize="inherit" />}
            value={pendingCount}
            label="Pending with Accounts"
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

        {/* Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['REQUEST ID', 'WORK ORDER', 'VENDOR', 'GROSS', 'TDS', 'NET', 'INVOICE DATE', 'STATUS', 'ACTIONS'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.72rem', color: '#6b7280',
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
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No payment requests found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const statusStyle = PR_STATUS_COLORS[r.status] || PR_STATUS_COLORS.Draft;
                  return (
                    <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>

                      {/* REQUEST ID */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#5B63D3' }}>
                          {r.id}
                        </Typography>
                      </TableCell>

                      {/* WORK ORDER */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.workOrderNumber}</Typography>
                        {r.periodLabel && (
                          <Typography variant="caption" color="text.secondary">{r.periodLabel}</Typography>
                        )}
                      </TableCell>

                      {/* VENDOR */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{r.vendorName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.vendorType}</Typography>
                      </TableCell>

                      {/* GROSS */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{fmtINR(r.grossAmount)}</Typography>
                      </TableCell>

                      {/* TDS */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#dc2626' }}>
                          − {fmtINR(r.tdsAmount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">({r.tdsRate}%)</Typography>
                      </TableCell>

                      {/* NET */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                          {fmtINR(r.netAmount)}
                        </Typography>
                      </TableCell>

                      {/* INVOICE DATE */}
                      <TableCell sx={{ fontSize: '0.85rem', color: r.invoiceDate ? 'inherit' : 'text.disabled' }}>
                        {r.invoiceDate || '—'}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          sx={{
                            bgcolor: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            fontWeight: 600,
                            fontSize: '0.68rem',
                          }}
                        />
                      </TableCell>

                      {/* ACTIONS */}
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
                        </Stack>
                      </TableCell>

                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total Amount — prominently displayed below grid */}
        {filtered.length > 0 && (
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
                  <Typography variant="body1" fontWeight={700}>{fmtINR(filtered.reduce((s, r) => s + (r.grossAmount || 0), 0))}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">TDS</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ color: '#dc2626' }}>
                    − {fmtINR(filtered.reduce((s, r) => s + (r.tdsAmount || 0), 0))}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">Net Payable</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#16a34a' }}>
                    {fmtINR(filtered.reduce((s, r) => s + (r.netAmount || 0), 0))}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        )}
      </Container>

      {/* Payment Request Modal */}
      <PaymentRequestModal
        open={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        onSave={handlePaymentRequestSave}
        onNavigateToWO={() => { window.location.href = '/work-orders'; }}
        allVendors={vendors}
      />

      {/* Payment Detail / Edit Dialog */}
      <PaymentDetailDialog
        open={!!detailPayment}
        onClose={() => setDetailPayment(null)}
        payment={detailPayment}
        onUpdate={handlePaymentUpdate}
        mode={detailMode}
      />

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
