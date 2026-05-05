// src/components/workorders/WorkOrderManagementPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert, Grid,
  TextField, InputAdornment,
  FormControl, Select, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as WOIcon,
  Search as SearchIcon,
  SwapVert as SortIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import WorkOrderCard from './WorkOrderCard';
import WorkOrderModal from './WorkOrderModal';
import WorkOrderDetailView from './WorkOrderDetailView';
import { vendorsAPI, workOrdersAPI } from '../../services/api';
import { getVendorTypeNames } from '../../utils/adminStorage';
import { WO_STATUSES, isWOFullyPaid, getPeriodLabel } from './workOrderData';


function WorkOrderManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWO, setEditingWO] = useState(null);
  const [detailWO, setDetailWO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preSelectedVendor, setPreSelectedVendor] = useState(null);

  const [showPastWOs, setShowPastWOs] = useState(false);

  // Search, filter, sort
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');         // Fixed | Periodic | ''
  const [filterService, setFilterService] = useState('');   // vendorType (service type)
  const [filterPayment, setFilterPayment] = useState('');   // Unpaid | Partial | Paid | ''
  const [filterStatus, setFilterStatus] = useState('');     // WO status filter
  const [sortBy, setSortBy] = useState('newest');           // newest | oldest | amountHigh | amountLow

  const serviceTypes = useMemo(() => getVendorTypeNames(), []);

  const filteredWorkOrders = useMemo(() => {
    let list = [...workOrders];

    // Search — vendor name or WO number
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((wo) =>
        wo.vendorName?.toLowerCase().includes(q) ||
        wo.workOrderNumber?.toLowerCase().includes(q)
      );
    }

    // Filter by type
    if (filterType) list = list.filter((wo) => wo.type === filterType);

    // Filter by service type (vendorType on the WO)
    if (filterService) list = list.filter((wo) => wo.vendorType === filterService);

    // Filter by status
    if (filterStatus) list = list.filter((wo) => wo.status === filterStatus);

    // Filter by payment progress
    if (filterPayment) {
      list = list.filter((wo) => {
        const paid = parseFloat(wo.paidGrossAmount) || 0;
        const total = parseFloat(wo.amount) || 0;
        if (filterPayment === 'Unpaid') return paid === 0;
        if (filterPayment === 'Partial') return paid > 0 && paid < total;
        if (filterPayment === 'Paid') return paid >= total && total > 0;
        return true;
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'amountHigh') return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      if (sortBy === 'amountLow') return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
      return 0;
    });

    return list;
  }, [workOrders, search, filterType, filterService, filterStatus, filterPayment, sortBy]);

  const bouncedWorkOrders = useMemo(
    () => filteredWorkOrders.filter((wo) => parseInt(wo.bouncedPaymentCount || 0, 10) > 0),
    [filteredWorkOrders]
  );

  const activeWorkOrders = useMemo(
    () => filteredWorkOrders.filter(
      (wo) => wo.status !== 'Fully Paid'
        && wo.status !== 'Cancelled'
        && parseInt(wo.bouncedPaymentCount || 0, 10) === 0
    ),
    [filteredWorkOrders]
  );

  const pastWorkOrders = useMemo(
    () => filteredWorkOrders.filter(
      (wo) => (wo.status === 'Fully Paid' || wo.status === 'Cancelled')
        && parseInt(wo.bouncedPaymentCount || 0, 10) === 0
    ),
    [filteredWorkOrders]
  );

  const downloadWOPdf = (wo) => {
    const doc = new jsPDF();
    const fmtINR = (n) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(parseFloat(n) || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order Summary', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 28);
    doc.setTextColor(0);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(wo.workOrderNumber || '', 14, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${wo.vendorName || ''} - ${wo.vendorType || ''}`, 14, 47);

    const details = [
      ['Status', wo.status || '-'],
      ['Type', wo.type || '-'],
      ['Total Amount', fmtINR(wo.amount)],
      ['Paid Amount', fmtINR(wo.paidGrossAmount)],
      ['TDS Rate', wo.tdsRate ? `${wo.tdsRate}%` : '-'],
      ['Service Description', wo.serviceDescription || '-'],
      ['Created', fmtDate(wo.createdAt)],
    ];

    if (wo.type === 'Periodic') {
      details.push(
        ['Amount / Period', fmtINR(wo.amountPerPeriod)],
        ['Periods', `${(wo.paidPeriods || []).length} / ${wo.numberOfPeriods} paid`],
      );
    }

    autoTable(doc, {
      startY: 54,
      head: [['Field', 'Value']],
      body: details,
      theme: 'grid',
      headStyles: { fillColor: [91, 99, 211], fontSize: 10 },
      styles: { fontSize: 9.5, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    });

    let y = doc.lastAutoTable.finalY + 10;

    if (wo.type === 'Periodic' && wo.numberOfPeriods) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Period Details', 14, y);
      y += 4;
      const paidSet = new Set(wo.paidPeriods || []);
      const periodRows = Array.from({ length: wo.numberOfPeriods }, (_, i) => {
        const p = i + 1;
        return [getPeriodLabel(wo, p), fmtINR(wo.amountPerPeriod), paidSet.has(p) ? 'Paid' : 'Unpaid'];
      });
      autoTable(doc, {
        startY: y,
        head: [['Period', 'Amount', 'Status']],
        body: periodRows,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], fontSize: 10 },
        styles: { fontSize: 9.5, cellPadding: 3 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (wo.bankName || wo.accountNumber || wo.ifscCode) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details', 14, y);
      y += 4;
      const bankRows = [
        ['Bank', wo.bankName || '-'],
        ['Account Number', wo.accountNumber || '-'],
        ['IFSC', wo.ifscCode || '-'],
        ['Account Type', wo.accountType || '-'],
      ];
      if (wo.panNumber) bankRows.push(['PAN', wo.panNumber.toUpperCase()]);
      autoTable(doc, {
        startY: y,
        head: [['Field', 'Value']],
        body: bankRows,
        theme: 'grid',
        headStyles: { fillColor: [146, 64, 14], fontSize: 10 },
        styles: { fontSize: 9.5, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      });
    }

    doc.save(`${wo.workOrderNumber || 'WorkOrder'}.pdf`);
  };

  const fetchVendors = () => {
    vendorsAPI.getAll({ limit: 1000 })
      .then((res) => {
        setVendors(res.vendors || []);
      })
      .catch(() => setVendors([]));
  };

  const fetchWorkOrders = () => {
    workOrdersAPI.getAll()
      .then((res) => {
        setWorkOrders(res.workOrders || []);
      })
      .catch(() => setWorkOrders([]));
  };

  useEffect(() => { fetchVendors(); fetchWorkOrders(); }, []);

  // Auto-open modal when navigated from Vendor page with a vendor
  useEffect(() => {
    if (location.state?.vendor) {
      setPreSelectedVendor(location.state.vendor);
      setEditingWO(null);
      setModalOpen(true);
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingWO) {
        await workOrdersAPI.update(editingWO.id, data);
        showToast('Work order updated');
      } else {
        await workOrdersAPI.create(data);
        showToast('Work order created');
      }
      fetchWorkOrders();
      setModalOpen(false);
      setEditingWO(null);
    } catch (err) {
      showToast(err.message || 'Failed to save work order. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (wo) => {
    setEditingWO(wo);
    setModalOpen(true);
    fetchVendors();
  };

  const handleDelete = async (wo) => {
    if (!window.confirm(`Delete work order ${wo.workOrderNumber}?`)) return;
    try {
      await workOrdersAPI.delete(wo.id || wo._id);
      showToast('Work order deleted');
      fetchWorkOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete work order. Please try again.', 'error');
    }
  };

  const handleResolveBounced = async (wo) => {
    const msg =
      `Resolve bounced payments on ${wo.workOrderNumber}?\n\n` +
      `This will permanently discard ${wo.bouncedPaymentCount} bounced payment record(s) ` +
      `and move this work order to Past Work Orders (Cancelled). This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await workOrdersAPI.resolveBounced(wo.id || wo._id);
      showToast('Bounced payments discarded; work order closed');
      fetchWorkOrders();
    } catch (err) {
      showToast(err.message || 'Failed to resolve bounced payments.', 'error');
    }
  };

  /** Navigate to Payments with vendor + WO so Raise Payment modal can prefill (see PaymentManagementPage). */
  const handleRaisePayment = (wo) => {
    const vid = wo.vendorId ?? wo.vendor_id;
    const vendor = vendors.find((v) => (v.id ?? v._id) === vid);
    navigate('/payments', {
      state: {
        prefillRaisePayment: {
          workOrder: wo,
          vendor: vendor || null,
          vendorId: vid,
        },
      },
    });
  };


  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
              Work Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage work orders for vendors.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingWO(null); setModalOpen(true); fetchVendors(); }}
            sx={{
              mt: { xs: 2, sm: 0 },
              bgcolor: '#FDE68A',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 1.5,
              px: 3,
              color: '#1e293b',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            }}
          >
            New Work Order
          </Button>
        </Stack>

        {/* Search / Filter / Sort toolbar */}
        {workOrders.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {/* Row 1 — Search + Sort */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search by vendor name or WO number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  startAdornment={<SortIcon sx={{ fontSize: 16, color: '#64748b', mr: 0.5 }} />}
                  sx={{ borderRadius: 1.5, fontSize: '0.85rem' }}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="amountHigh">Amount: High → Low</MenuItem>
                  <MenuItem value="amountLow">Amount: Low → High</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Row 2 — Filters */}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              {/* Type filter */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  displayEmpty
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{
                    borderRadius: 1.5, fontSize: '0.85rem', height: 36,
                    bgcolor: filterType ? '#5B63D3' : undefined,
                    color: filterType ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: filterType ? '#5B63D3' : '#e2e8f0' },
                    '& .MuiSelect-icon': { color: filterType ? '#fff' : '#94a3b8' },
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="Fixed">Fixed</MenuItem>
                  <MenuItem value="Periodic">Periodic</MenuItem>
                </Select>
              </FormControl>

              {/* Service type filter */}
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select
                  displayEmpty
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  sx={{
                    borderRadius: 1.5, fontSize: '0.85rem', height: 36,
                    bgcolor: filterService ? '#5B63D3' : undefined,
                    color: filterService ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: filterService ? '#5B63D3' : '#e2e8f0' },
                    '& .MuiSelect-icon': { color: filterService ? '#fff' : '#94a3b8' },
                  }}
                >
                  <MenuItem value="">All Service Types</MenuItem>
                  {serviceTypes.map((st) => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status filter */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  displayEmpty
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{
                    borderRadius: 1.5, fontSize: '0.85rem', height: 36,
                    bgcolor: filterStatus ? '#5B63D3' : undefined,
                    color: filterStatus ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: filterStatus ? '#5B63D3' : '#e2e8f0' },
                    '& .MuiSelect-icon': { color: filterStatus ? '#fff' : '#94a3b8' },
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {WO_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Payment progress filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  displayEmpty
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  sx={{
                    borderRadius: 1.5, fontSize: '0.85rem', height: 36,
                    bgcolor: filterPayment ? (filterPayment === 'Unpaid' ? '#dc2626' : filterPayment === 'Partial' ? '#f59e0b' : '#16a34a') : undefined,
                    color: filterPayment ? '#fff' : undefined,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: filterPayment ? 'transparent' : '#e2e8f0' },
                    '& .MuiSelect-icon': { color: filterPayment ? '#fff' : '#94a3b8' },
                  }}
                >
                  <MenuItem value="">All Payments</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Partial">Partial</MenuItem>
                  <MenuItem value="Paid">Fully Paid</MenuItem>
                </Select>
              </FormControl>

              {/* Clear all filters */}
              {(search || filterType || filterService || filterStatus || filterPayment || sortBy !== 'newest') && (
                <Button
                  size="small"
                  onClick={() => { setSearch(''); setFilterType(''); setFilterService(''); setFilterStatus(''); setFilterPayment(''); setSortBy('newest'); }}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', color: '#dc2626', borderRadius: 1.5, border: '1px solid #fecaca', '&:hover': { bgcolor: '#fef2f2' } }}
                >
                  Clear All
                </Button>
              )}
            </Stack>

            {/* Result count */}
            {(search || filterType || filterService || filterStatus || filterPayment) && (
              <Typography variant="caption" sx={{ color: '#64748b', mt: 1.5, display: 'block' }}>
                Showing {filteredWorkOrders.length} of {workOrders.length} work orders
              </Typography>
            )}
          </Box>
        )}

        {/* Content */}
        {workOrders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <WOIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              No work orders yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a work order to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditingWO(null); setModalOpen(true); fetchVendors(); }}
              sx={{
                bgcolor: '#FDE68A', textTransform: 'none', fontWeight: 600,
                borderRadius: 1.5, color: '#1e293b', boxShadow: 'none',
                '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
              }}
            >
              New Work Order
            </Button>
          </Box>
        ) : filteredWorkOrders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <SearchIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1.5 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
              No work orders match your filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Bounced Work Orders — surfaced above active so they can't be missed */}
            {bouncedWorkOrders.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ color: '#dc2626', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  Bounced Payments — Needs Resolution ({bouncedWorkOrders.length})
                </Typography>
                <Grid container spacing={2.5}>
                  {bouncedWorkOrders.map((wo) => (
                    <Grid item xs={12} sm={6} md={4} key={wo.id}>
                      <WorkOrderCard
                        workOrder={wo}
                        onView={(w) => setDetailWO(w)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onResolveBounced={handleResolveBounced}
                        onDownloadPDF={downloadWOPdf}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Active Work Orders */}
            {activeWorkOrders.length > 0 && (
              <Grid container spacing={2.5}>
                {activeWorkOrders.map((wo) => (
                  <Grid item xs={12} sm={6} md={4} key={wo.id}>
                    <WorkOrderCard
                      workOrder={wo}
                      onView={(w) => setDetailWO(w)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onRaisePayment={handleRaisePayment}
                      onDownloadPDF={downloadWOPdf}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Past Work Orders */}
        {pastWorkOrders.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              endIcon={showPastWOs ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowPastWOs((p) => !p)}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
                borderColor: '#e2e8f0', color: '#64748b', borderRadius: 1.5, mb: 2,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              Past Work Orders ({pastWorkOrders.length})
            </Button>

            {showPastWOs && (
              <Grid container spacing={2.5}>
                {pastWorkOrders.map((wo) => (
                  <Grid item xs={12} sm={6} md={4} key={wo.id}>
                    <WorkOrderCard
                      workOrder={wo}
                      isPast
                      onView={(w) => setDetailWO(w)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDownloadPDF={downloadWOPdf}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Container>

      {/* Modals */}
      <WorkOrderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingWO(null); setPreSelectedVendor(null); }}
        onSave={handleSave}
        workOrder={editingWO}
        saving={saving}
        allVendors={vendors}
        allWorkOrders={workOrders}
        preSelectedVendor={preSelectedVendor}
        onOpenWO={(wo) => { setModalOpen(false); setDetailWO(wo); }}
      />

      <WorkOrderDetailView
        open={!!detailWO}
        onClose={() => setDetailWO(null)}
        workOrder={detailWO}
        onEdit={handleEdit}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default WorkOrderManagementPage;
