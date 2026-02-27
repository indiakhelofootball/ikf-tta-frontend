// src/components/payments/PaymentManagementPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, TextField, InputAdornment,
  Chip, CircularProgress, Snackbar, Alert, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  ReceiptLong as InvoiceIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as DoneIcon,
  TrendingUp as PaidIcon,
  Schedule as UpcomingIcon,
} from '@mui/icons-material';

import PaymentModal from './PaymentModal';
import { paymentsAPI, vendorsAPI } from '../../services/api';

// ── Mock vendors (fallback when backend is disconnected) ─────────────────────
const MOCK_VENDORS = [
  {
    id: 1, vendorCode: 'VEND-001', vendorName: 'Mumbai Printers', vendorType: 'Printing',
    status: 'Verified', contactPerson: 'Rajesh Kumar', phone: '9876543210', email: 'info@mumbaiprinters.in',
    bankName: 'HDFC Bank', accountNumber: '50100123456789', accountType: 'Current', ifscCode: 'HDFC0001234',
  },
  {
    id: 2, vendorCode: 'VEND-002', vendorName: 'Delhi Logistics', vendorType: 'Logistics',
    status: 'Verified', contactPerson: 'Amit Sharma', phone: '9988776655', email: 'ops@delhilogistics.in',
    bankName: 'ICICI Bank', accountNumber: '123409876543', accountType: 'Current', ifscCode: 'ICIC0005678',
  },
  {
    id: 3, vendorCode: 'VEND-003', vendorName: 'Sports Equipment Co', vendorType: 'Equipment',
    status: 'Verified', contactPerson: 'Priya Singh', phone: '8877665544', email: 'sales@sportsequip.in',
    bankName: 'SBI', accountNumber: '32109876543210', accountType: 'Savings', ifscCode: 'SBIN0009012',
  },
  {
    id: 4, vendorCode: 'VEND-004', vendorName: 'Event Management Pro', vendorType: 'Events',
    status: 'Pending', contactPerson: 'Suresh Patel', phone: '7766554433', email: 'contact@eventpro.in',
    bankName: 'Axis Bank', accountNumber: '9201234567890', accountType: 'Current', ifscCode: 'UTIB0003456',
  },
];

// ── Mock work orders (replace with API once backend is ready) ────────────────
const MOCK_WORK_ORDERS = [
  { id: 'WO-2024-001', description: 'Tournament Banner Printing', vendorCode: 'VEND-001' },
  { id: 'WO-2024-005', description: 'Post-Event Printing Batch', vendorCode: 'VEND-001' },
  { id: 'WO-2024-002', description: 'Equipment Transport – Mumbai', vendorCode: 'VEND-002' },
  { id: 'WO-2024-003', description: 'Sports Kit Supply – Q1', vendorCode: 'VEND-003' },
  { id: 'WO-2024-004', description: 'Annual Event Setup & Management', vendorCode: 'VEND-004' },
];

// ── Mock data using NEW fields ──────────────────────────────────────────────
const MOCK_PAYMENTS = [
  {
    id: 'PAY-001', workOrder: 'WO-2024-001', vendorName: 'Mumbai Printers', vendorCode: 'VEND-001',
    totalAmount: 225000, invoiceDate: '2024-01-10', dueDate: '2024-02-15',
    paymentMode: 'Bank Transfer', frequency: 'Yearly', upcomingPayment: 0,
    installments: [
      { amount: '150000', paidBy: 'Kapil', date: '2024-01-20' },
      { amount: '75000', paidBy: 'Rahul', date: '2024-02-10' },
    ],
    isDone: true, isRefunded: false, refundReason: '',
    raisedBy: 'Admin', raisedByEmail: 'admin@ikf.com', notes: '',
  },
  {
    id: 'PAY-002', workOrder: 'WO-2024-002', vendorName: 'Delhi Logistics', vendorCode: 'VEND-002',
    totalAmount: 150000, invoiceDate: '2024-02-01', dueDate: '2024-02-20',
    paymentMode: 'NEFT/RTGS', frequency: 'Yearly', upcomingPayment: 50000,
    installments: [
      { amount: '100000', paidBy: 'Kapil', date: '2024-02-05' },
    ],
    isDone: false, isRefunded: false, refundReason: '',
    raisedBy: 'Admin', raisedByEmail: 'admin@ikf.com', notes: '',
  },
  {
    id: 'PAY-003', workOrder: 'WO-2024-003', vendorName: 'Sports Equipment Co', vendorCode: 'VEND-003',
    totalAmount: 450000, invoiceDate: '2024-01-05', dueDate: '2024-01-25',
    paymentMode: 'Cheque', frequency: 'Yearly', upcomingPayment: 0,
    installments: [
      { amount: '200000', paidBy: 'Kapil', date: '2024-01-10' },
      { amount: '250000', paidBy: 'Abhishek', date: '2024-01-22' },
    ],
    isDone: true, isRefunded: false, refundReason: '',
    raisedBy: 'Admin', raisedByEmail: 'admin@ikf.com', notes: '',
  },
  {
    id: 'PAY-004', workOrder: 'WO-2024-004', vendorName: 'Event Management Pro', vendorCode: 'VEND-004',
    totalAmount: 350000, invoiceDate: '', dueDate: '2024-01-30',
    paymentMode: 'Bank Transfer', frequency: 'Yearly', upcomingPayment: 350000,
    installments: [],
    isDone: false, isRefunded: false, refundReason: '',
    raisedBy: 'Admin', raisedByEmail: 'admin@ikf.com', notes: '',
  },
  {
    id: 'PAY-005', workOrder: 'WO-2024-005', vendorName: 'Mumbai Printers', vendorCode: 'VEND-001',
    totalAmount: 200000, invoiceDate: '', dueDate: '',
    paymentMode: '', frequency: 'Yearly', upcomingPayment: 200000,
    installments: [],
    isDone: false, isRefunded: false, refundReason: '',
    raisedBy: 'Admin', raisedByEmail: 'admin@ikf.com', notes: 'Invoice not yet raised formally',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPaidTotal(payment) {
  return (payment.installments || []).reduce(
    (sum, inst) => sum + (Number(inst.amount) || 0), 0
  );
}

function StatCard({ icon, amount, label, color }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2,
      p: 2.5, bgcolor: '#ffffff', borderRadius: 4, flex: 1,
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
    }}>
      <Box sx={{ color, fontSize: 36, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          ₹{amount.toLocaleString('en-IN')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500 }}>{label}</Typography>
      </Box>
    </Box>
  );
}

// ── Invoice PDF generation (opens print window) ─────────────────────────────
function generateInvoiceHTML(payment) {
  const paid = getPaidTotal(payment);
  const remaining = Math.max(0, payment.totalAmount - paid);

  const installmentRows = (payment.installments || []).map((inst, i) => `
    <tr>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;">₹${Number(inst.amount || 0).toLocaleString('en-IN')}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;">${inst.paidBy || '—'}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;">${inst.date || '—'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${payment.id}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1d1d1f; max-width: 800px; margin: 0 auto; }
        h1 { color: #6366F1; margin-bottom: 4px; }
        .subtitle { color: #86868b; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: 700; color: #6366F1; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 2px solid #6366F1; padding-bottom: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .label { font-size: 11px; color: #86868b; text-transform: uppercase; }
        .value { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f8fafc; padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #6b7280; }
        td { padding: 6px 12px; border: 1px solid #e5e7eb; }
        .summary-box { display: flex; gap: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 16px; }
        .summary-item .label { font-size: 10px; }
        .summary-item .value { font-size: 18px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #86868b; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .done { background: #dcfce7; color: #16a34a; }
        .pending { background: #fef9c3; color: #ca8a04; }
        .refunded { background: #fee2e2; color: #dc2626; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>INVOICE</h1>
      <p class="subtitle">${payment.id} &nbsp;|&nbsp; ${payment.invoiceDate || 'Date not set'}</p>

      <div class="section">
        <div class="section-title">Service Provider</div>
        <div class="grid">
          <div><div class="label">Name</div><div class="value">${payment.vendorName || '—'}</div></div>
          <div><div class="label">Work Order</div><div class="value">${payment.workOrder || '—'}</div></div>
          <div><div class="label">Payment Mode</div><div class="value">${payment.paymentMode || '—'}</div></div>
          <div><div class="label">Due Date</div><div class="value">${payment.dueDate || '—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Amount Summary</div>
        <div class="summary-box">
          <div class="summary-item">
            <div class="label">Work Order Amount</div>
            <div class="value">₹${payment.totalAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Paid</div>
            <div class="value" style="color:#16a34a">₹${paid.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-item">
            <div class="label">Remaining</div>
            <div class="value" style="color:${remaining > 0 ? '#dc2626' : '#16a34a'}">₹${remaining.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      ${(payment.installments || []).length > 0 ? `
      <div class="section">
        <div class="section-title">Payment Installments</div>
        <table>
          <thead><tr><th>#</th><th>Amount</th><th>Paid By</th><th>Date</th></tr></thead>
          <tbody>${installmentRows}</tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Status</div>
        ${payment.isDone
          ? payment.isRefunded
            ? `<span class="status refunded">Refunded</span>${payment.refundReason ? ` — ${payment.refundReason}` : ''}`
            : '<span class="status done">Payment Done</span>'
          : '<span class="status pending">Pending</span>'
        }
      </div>

      ${payment.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <p>${payment.notes}</p>
      </div>
      ` : ''}

      <div class="footer">
        Raised by: ${payment.raisedBy || '—'} &nbsp;|&nbsp; Generated on: ${new Date().toLocaleDateString('en-IN')}
      </div>
    </body>
    </html>
  `;
}

function downloadInvoice(payment) {
  const html = generateInvoiceHTML(payment);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    // Auto-trigger print after a short delay
    setTimeout(() => win.print(), 500);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
function PaymentManagementPage() {
  const [payments, setPayments]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [vendors, setVendors]       = useState([]);
  const [workOrders, setWorkOrders] = useState(MOCK_WORK_ORDERS);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [modalMode, setModalMode]   = useState('create'); // 'create' | 'edit' | 'view'
  const [toast, setToast]           = useState({ open: false, message: '', severity: 'success' });

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? payments.filter(p =>
            p.id?.toLowerCase().includes(q) ||
            p.workOrder?.toLowerCase().includes(q) ||
            p.vendorName?.toLowerCase().includes(q) ||
            p.vendorCode?.toLowerCase().includes(q)
          )
        : payments
    );
  }, [payments, search]);

  const loadAll = async () => {
    setLoading(true);
    try {
      try {
        const res = await paymentsAPI.getAll();
        setPayments(res.payments || res || []);
      } catch {
        setPayments(MOCK_PAYMENTS);
      }

      try {
        const vRes = await vendorsAPI.getAll();
        const vendorList = vRes.vendors || [];
        setVendors(vendorList.length > 0 ? vendorList : MOCK_VENDORS);
      } catch {
        setVendors(MOCK_VENDORS);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Stats ────────────────────────────────────────────────────────────── */
  const totalWorkOrderValue = payments.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + getPaidTotal(p), 0);
  const totalUpcoming = payments.filter(p => !p.isDone).reduce((s, p) => s + (p.upcomingPayment || 0), 0);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const showToast = (msg, severity = 'success') => setToast({ open: true, message: msg, severity });

  const handleSave = async (data) => {
    try {
      if (editing) {
        try { await paymentsAPI.update(editing.id, data); } catch {}
        setPayments(prev => prev.map(p => p.id === editing.id ? { ...p, ...data } : p));
        showToast('Payment updated!');
      } else {
        let created;
        try { created = await paymentsAPI.create(data); }
        catch {
          created = {
            ...data,
            id: `PAY-${String(payments.length + 1).padStart(3, '0')}`,
            vendorName: data.vendorName || data.vendor,
            vendorCode: data.vendor,
          };
        }
        setPayments(prev => [...prev, created]);
        showToast('Invoice raised!');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      showToast(err.message || 'Failed to save.', 'error');
      throw err;
    }
  };

  const handleEdit = (payment) => {
    setEditing({
      ...payment,
      vendor: payment.vendorCode || payment.vendorName || '',
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleView = (payment) => {
    setEditing({
      ...payment,
      vendor: payment.vendorCode || payment.vendorName || '',
    });
    setModalMode('view');
    setModalOpen(true);
  };

  const handleRaiseInvoice = () => {
    setEditing(null);
    setModalMode('create');
    setModalOpen(true);
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Header */}
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Payments
        </Typography>

        {/* Stat cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <StatCard
            icon={<WalletIcon fontSize="inherit" />}
            amount={totalWorkOrderValue}
            label="Total Work Order Value"
            color="#6366F1"
          />
          <StatCard
            icon={<PaidIcon fontSize="inherit" />}
            amount={totalPaid}
            label="Total Paid"
            color="#16a34a"
          />
          <StatCard
            icon={<UpcomingIcon fontSize="inherit" />}
            amount={totalUpcoming}
            label="Upcoming Payments"
            color="#F59E0B"
          />
        </Stack>

        {/* Search + Raise Invoice */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search payments..."
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
            onClick={handleRaiseInvoice}
            sx={{ whiteSpace: 'nowrap', bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}
          >
            Raise Invoice
          </Button>
        </Stack>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['PAYMENT ID', 'WORK ORDER', 'SERVICE PROVIDER', 'AMOUNT', 'PAID', 'INVOICE DATE', 'DUE DATE', 'DONE', 'ACTIONS'].map(h => (
                    <TableCell
                      key={h}
                      sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', letterSpacing: '0.05em' }}
                      align={h === 'DONE' ? 'center' : 'left'}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const paid = getPaidTotal(p);
                    const remaining = Math.max(0, p.totalAmount - paid);
                    return (
                      <TableRow key={p.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.id}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{p.workOrder}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{p.vendorName}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.vendorCode}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          ₹{p.totalAmount?.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ color: '#16a34a' }}>
                            ₹{paid.toLocaleString('en-IN')}
                          </Typography>
                          {remaining > 0 && (
                            <Typography variant="caption" color="error">
                              ₹{remaining.toLocaleString('en-IN')} left
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: p.invoiceDate ? 'inherit' : 'text.disabled' }}>
                          {p.invoiceDate || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: p.dueDate ? 'inherit' : 'text.disabled' }}>
                          {p.dueDate || '—'}
                        </TableCell>
                        <TableCell align="center">
                          {p.isRefunded ? (
                            <Chip label="Refunded" size="small"
                              sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: '0.7rem' }} />
                          ) : (
                            <Checkbox
                              checked={p.isDone || false}
                              disabled
                              sx={{ '&.Mui-checked': { color: '#16a34a' }, p: 0 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => handleView(p)} sx={{ color: '#6366F1' }}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEdit(p)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {p.isDone && !p.isRefunded && (
                              <Tooltip title="Download Invoice">
                                <IconButton size="small" onClick={() => downloadInvoice(p)} sx={{ color: '#ca8a04' }}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
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
        )}
      </Container>

      {/* Modal */}
      <PaymentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editingPayment={editing}
        vendors={vendors}
        workOrders={workOrders}
        mode={modalMode}
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
