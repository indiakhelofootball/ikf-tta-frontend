// src/components/payments/PaymentRequestModal.jsx
// 3-step Payment Request flow

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton, Divider,
  Stack, Grid, Chip, Alert, Stepper, Step, StepLabel,
  FormControl, Select, MenuItem, Paper, Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccountBalance as BankIcon,
  Assignment as WOIcon,
  Add as AddIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Warning as WarnIcon,
  CheckCircle as DoneIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { getVendorWOs, getWORemainingGross, isWOFullyPaid, getPeriodLabel, loadWorkOrders, saveWorkOrders } from '../workorders/workOrderData';
import { generatePRNumber } from './paymentData';

const STEPS = ['Vendor & Work Order', 'Payment Amount', 'Preview & Submit'];

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } };
const labelSx = {
  fontWeight: 700, color: '#64748b', fontSize: '0.68rem',
  letterSpacing: '0.5px', textTransform: 'uppercase', mb: 1, display: 'block',
};
const sectionSx = {
  p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2,
};

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

/* ── WO status banner ── */
function WOStatusBanner({ vendorWOs, selectedWO, onSelectWO, onCreateWO }) {
  if (vendorWOs.length === 0) {
    return (
      <Alert severity="error" icon={<WarnIcon />}
        action={<Button size="small" color="error" startIcon={<AddIcon />} onClick={onCreateWO}>Create Work Order</Button>}
        sx={{ borderRadius: 1.5 }}>
        <Typography variant="body2" fontWeight={700}>No Work Order Found</Typography>
        <Typography variant="caption">No active work order exists for this vendor.</Typography>
      </Alert>
    );
  }

  const allPaid = vendorWOs.every(isWOFullyPaid);
  if (allPaid) {
    return (
      <Alert severity="success" icon={<DoneIcon />}
        action={<Button size="small" color="success" startIcon={<AddIcon />} onClick={onCreateWO}>New Work Order</Button>}
        sx={{ borderRadius: 1.5 }}>
        <Typography variant="body2" fontWeight={700}>All Payments Cleared</Typography>
        <Typography variant="caption">All work orders for this vendor are fully paid.</Typography>
      </Alert>
    );
  }

  const activeWOs = vendorWOs.filter((wo) => !isWOFullyPaid(wo));

  return (
    <Box>
      {activeWOs.length > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Multiple active work orders — select one:
        </Typography>
      )}
      {activeWOs.map((wo) => {
        const remaining = getWORemainingGross(wo);
        const paidGross = (wo.amount || 0) - remaining;
        const isSelected = selectedWO?.id === wo.id;
        return (
          <Paper key={wo.id} variant="outlined" onClick={() => onSelectWO(wo)}
            sx={{
              p: 1.5, mb: 1, borderRadius: 1.5, cursor: 'pointer',
              borderColor: isSelected ? '#5B63D3' : '#e2e8f0',
              bgcolor: isSelected ? '#eef2ff' : '#fff',
              transition: 'all 0.15s',
              '&:hover': { borderColor: '#5B63D3', bgcolor: '#f5f3ff' },
            }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700}>{wo.workOrderNumber}</Typography>
                  <Chip label={wo.type} size="small"
                    sx={{ bgcolor: wo.type === 'Periodic' ? '#f0fdf4' : '#eef2ff', color: wo.type === 'Periodic' ? '#16a34a' : '#4338ca', fontSize: '0.65rem', height: 16 }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">{wo.projectRef}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Remaining</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{fmtINR(remaining)}</Typography>
              </Box>
            </Stack>
            {/* Balance bar */}
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Paid: {fmtINR(paidGross)} of {fmtINR(wo.amount)}
                </Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color: '#dc2626' }}>
                  Balance: {fmtINR(remaining)}
                </Typography>
              </Stack>
              <Box sx={{ mt: 0.5, height: 4, bgcolor: '#e2e8f0', borderRadius: 2 }}>
                <Box sx={{
                  height: '100%', borderRadius: 2, bgcolor: '#16a34a',
                  width: `${Math.min(100, (paidGross / (wo.amount || 1)) * 100)}%`,
                }} />
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

/* ── Main Modal ── */
function PaymentRequestModal({ open, onClose, onSave, onNavigateToWO, allVendors = [] }) {
  const [step, setStep] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorWOs, setVendorWOs] = useState([]);
  const [selectedWO, setSelectedWO] = useState(null);
  const [prNumber, setPrNumber] = useState('');

  // search state
  const [searchServiceType, setSearchServiceType] = useState('');
  const [searchEntityType, setSearchEntityType] = useState('');

  // Step 2 fields
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');

  // Reset on open
  useEffect(() => {
    if (open) {
      setPrNumber(generatePRNumber());
      setStep(0);
      setSearchServiceType('');
      setSearchEntityType('');
      setSelectedVendor(null);
      setVendorWOs([]);
      setSelectedWO(null);
      setSelectedPeriod('');
      setGrossAmount('');
      setInvoiceDate('');
      setNotes('');
      setStatus('Draft');
    }
  }, [open]);

  /* ── 3-step search filter logic ── */
  const serviceTypeOptions = useMemo(() => {
    return [...new Set(allVendors.map(v => v.vendorType).filter(Boolean))].sort();
  }, [allVendors]);

  const entityTypeOptions = useMemo(() => {
    let pool = [...allVendors];
    if (searchServiceType) pool = pool.filter(v => v.vendorType === searchServiceType);
    const present = new Set(pool.map(v => v.companyType).filter(Boolean));
    const options = ['Individual'];
    [...present].filter(t => t !== 'Individual').sort().forEach(t => options.push(t));
    return options;
  }, [allVendors, searchServiceType]);

  const filteredVendors = useMemo(() => {
    let pool = [...allVendors];
    if (searchServiceType) pool = pool.filter(v => v.vendorType === searchServiceType);
    if (searchEntityType) pool = pool.filter(v => v.companyType === searchEntityType);
    return pool;
  }, [allVendors, searchServiceType, searchEntityType]);

  const handleServiceTypeChange = (val) => {
    setSearchServiceType(val);
    setSearchEntityType('');
    setSelectedVendor(null);
    setVendorWOs([]);
    setSelectedWO(null);
  };

  const handleEntityTypeChange = (val) => {
    setSearchEntityType(val);
    setSelectedVendor(null);
    setVendorWOs([]);
    setSelectedWO(null);
  };

  const handleVendorSelect = (_, vendor) => {
    if (!vendor) {
      setSelectedVendor(null);
      setVendorWOs([]);
      setSelectedWO(null);
      return;
    }
    setSelectedVendor(vendor);
    setSelectedWO(null);
    setSelectedPeriod('');
    setGrossAmount('');
    const wos = getVendorWOs(vendor._id || vendor.id);
    setVendorWOs(wos);
    const active = wos.filter((wo) => !isWOFullyPaid(wo));
    if (active.length === 1) setSelectedWO(active[0]);
  };

  const handleSelectWO = (wo) => {
    setSelectedWO(wo);
    setSelectedPeriod('');
    setGrossAmount('');
  };

  // When period selected (Periodic WO)
  const handlePeriodSelect = (periodNum) => {
    setSelectedPeriod(periodNum);
    setGrossAmount(String(selectedWO.amountPerPeriod || ''));
  };

  // Derived financials
  const gross = Number(grossAmount) || 0;
  const tdsRate = selectedVendor ? (selectedWO?.tdsRate || 0) : 0;
  const tdsAmount = Math.round(gross * tdsRate / 100);
  const netAmount = gross - tdsAmount;

  // Periodic: available periods (not yet paid)
  const availablePeriods = selectedWO?.type === 'Periodic'
    ? Array.from({ length: selectedWO.numberOfPeriods }, (_, i) => i + 1)
        .filter((p) => !(selectedWO.paidPeriods || []).includes(p))
    : [];

  const remaining = selectedWO ? getWORemainingGross(selectedWO) : 0;

  const canGoStep2 = selectedVendor && selectedWO && !isWOFullyPaid(selectedWO);
  const canGoStep3 = gross > 0 && invoiceDate && gross <= remaining;

  const handleSubmit = (sendToAccounts) => {
    const pr = {
      id: prNumber,
      workOrderNumber: selectedWO.workOrderNumber,
      workOrderId: selectedWO.id,
      vendorId: selectedVendor.id || selectedVendor._id,
      vendorName: selectedVendor.vendorName,
      vendorType: selectedVendor.vendorType,
      panNumber: selectedVendor.panNumber,
      gstNumber: selectedVendor.gstNumber,
      tdsType: selectedVendor.tdsType,
      bankName: selectedVendor.bankName,
      accountNumber: selectedVendor.accountNumber,
      ifscCode: selectedVendor.ifscCode,
      accountType: selectedVendor.accountType,
      woType: selectedWO.type,
      periodLabel: selectedWO.type === 'Periodic' ? getPeriodLabel(selectedWO, selectedPeriod) : null,
      periodNumber: selectedWO.type === 'Periodic' ? selectedPeriod : null,
      grossAmount: gross,
      tdsRate,
      tdsAmount,
      netAmount,
      invoiceDate,
      notes,
      status: sendToAccounts ? 'Sent to Accounts' : 'Draft',
      createdAt: new Date().toISOString(),
    };

    // Update WO balance in localStorage
    const allWOs = loadWorkOrders();
    const updatedWOs = allWOs.map(wo => {
      if (wo.id !== selectedWO.id) return wo;
      if (wo.type === 'Fixed') {
        return { ...wo, paidGrossAmount: (wo.paidGrossAmount || 0) + gross };
      }
      if (wo.type === 'Periodic' && selectedPeriod) {
        return { ...wo, paidPeriods: [...(wo.paidPeriods || []), selectedPeriod] };
      }
      return wo;
    });
    saveWorkOrders(updatedWOs);

    onSave(pr);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            Payment Request
          </Typography>
          <Chip label={prNumber} size="small"
            sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: '0.72rem', mt: 0.5 }} />
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Divider />

      {/* Stepper */}
      <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc' }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { fontSize: '0.72rem', fontWeight: 600 },
                '& .MuiStepIcon-root.Mui-active': { color: '#5B63D3' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#16a34a' },
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider />

      <DialogContent sx={{ pt: 2.5, minHeight: 340 }}>

        {/* ══ STEP 0: Vendor & Work Order ══ */}
        {step === 0 && (
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
              <FilterIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
              <Typography variant="caption" sx={{
                fontWeight: 700, color: '#5B63D3', fontSize: '0.7rem',
                letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                Find Vendor
              </Typography>
            </Stack>

            <Box sx={{ ...sectionSx }}>
              {/* Row 1: Service Type | Entity Type */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem', display: 'block' }}>
                    Service Type
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select value={searchServiceType} onChange={(e) => handleServiceTypeChange(e.target.value)}
                      displayEmpty renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All service types</em>}
                      sx={{ borderRadius: 1.5 }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                      <MenuItem value=""><em>All service types</em></MenuItem>
                      {serviceTypeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem', display: 'block' }}>
                    Entity Type
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select value={searchEntityType} onChange={(e) => handleEntityTypeChange(e.target.value)}
                      displayEmpty renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All entity types</em>}
                      sx={{ borderRadius: 1.5 }} MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}>
                      <MenuItem value=""><em>All entity types</em></MenuItem>
                      {entityTypeOptions.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.85rem' }}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Row 2: Vendor Name (full width) */}
              <Box>
                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem', display: 'block' }}>
                  Vendor Name *
                </Typography>
                <Autocomplete
                  options={filteredVendors}
                  getOptionLabel={(opt) => opt.vendorName || ''}
                  isOptionEqualToValue={(opt, val) => (opt._id || opt.id) === (val._id || val.id)}
                  filterOptions={(options, { inputValue }) =>
                    inputValue.trim() === ''
                      ? options
                      : options.filter((o) => {
                          const q = inputValue.toLowerCase();
                          return (
                            o.vendorName?.toLowerCase().includes(q) ||
                            o.entityName?.toLowerCase().includes(q) ||
                            o.contactPerson?.toLowerCase().includes(q)
                          );
                        })
                  }
                  value={selectedVendor}
                  onChange={handleVendorSelect}
                  noOptionsText="No vendor found — ask admin to add them first"
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={option._id || option.id} {...otherProps}
                        sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6',
                          '&:hover': { backgroundColor: '#f5f3ff !important' } }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{option.vendorName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.vendorType}
                            {option.companyType ? ` · ${option.companyType}` : ''}
                            {option.state ? ` · ${option.state}` : ''}
                            {option.city ? `, ${option.city}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Type to search vendor name..." sx={fieldSx} />
                  )}
                  slotProps={{ popper: { sx: { zIndex: 1500 } } }}
                />
              </Box>
            </Box>

            {selectedVendor && (
              <>
                <Typography sx={labelSx}>Work Order Status</Typography>
                <WOStatusBanner
                  vendorWOs={vendorWOs}
                  selectedWO={selectedWO}
                  onSelectWO={handleSelectWO}
                  onCreateWO={() => { onClose(); onNavigateToWO?.(); }}
                />
              </>
            )}
          </Box>
        )}

        {/* ══ STEP 1: Payment Amount ══ */}
        {step === 1 && selectedWO && (
          <Box>
            {/* WO summary */}
            <Box sx={{ ...sectionSx, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <WOIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1e40af' }}>
                  {selectedWO.workOrderNumber} — {selectedWO.type}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {selectedWO.projectRef}
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total WO Value</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmtINR(selectedWO.amount)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Remaining</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>{fmtINR(remaining)}</Typography>
                </Box>
              </Stack>
            </Box>

            {/* Periodic: period selector */}
            {selectedWO.type === 'Periodic' && (
              <>
                <Typography sx={labelSx}>Select Period</Typography>
                <Box sx={sectionSx}>
                  {availablePeriods.length === 0 ? (
                    <Alert severity="success">All periods have been paid for this work order.</Alert>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {Array.from({ length: selectedWO.numberOfPeriods }, (_, i) => i + 1).map((p) => {
                        const paid = (selectedWO.paidPeriods || []).includes(p);
                        const selected = selectedPeriod === p;
                        return (
                          <Chip key={p}
                            label={getPeriodLabel(selectedWO, p)}
                            onClick={paid ? undefined : () => handlePeriodSelect(p)}
                            sx={{
                              fontWeight: 600, cursor: paid ? 'not-allowed' : 'pointer',
                              bgcolor: paid ? '#f1f5f9' : selected ? '#5B63D3' : '#fff',
                              color: paid ? '#94a3b8' : selected ? '#fff' : '#1e293b',
                              border: `1px solid ${paid ? '#e2e8f0' : selected ? '#5B63D3' : '#cbd5e1'}`,
                              textDecoration: paid ? 'line-through' : 'none',
                            }}
                          />
                        );
                      })}
                    </Stack>
                  )}
                  {selectedPeriod && (
                    <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }}>
                      Amount auto-filled: {fmtINR(selectedWO.amountPerPeriod)} for {getPeriodLabel(selectedWO, selectedPeriod)}
                    </Alert>
                  )}
                </Box>
              </>
            )}

            {/* Amount entry */}
            <Typography sx={labelSx}>Payment Amount</Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Gross Amount (₹)" size="small" fullWidth type="number" sx={fieldSx}
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    disabled={selectedWO.type === 'Periodic' && !!selectedPeriod}
                    error={selectedWO.type === 'Fixed' && gross > remaining}
                    helperText={selectedWO.type === 'Fixed'
                      ? (gross > remaining
                          ? `Exceeds remaining ${fmtINR(remaining)}`
                          : `Max: ${fmtINR(remaining)}`)
                      : ''}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Invoice Date" type="date" size="small" fullWidth
                    InputLabelProps={{ shrink: true }} sx={fieldSx}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)} />
                </Grid>
              </Grid>

              {/* TDS breakdown */}
              {gross > 0 && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    TDS BREAKDOWN
                  </Typography>
                  <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Gross Amount</Typography>
                      <Typography variant="body2" fontWeight={700}>{fmtINR(gross)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: '#dc2626' }}>
                        TDS Deduction ({tdsRate}% — {selectedVendor?.tdsType !== 'None' ? selectedVendor?.tdsType : 'No TDS'})
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                        − {fmtINR(tdsAmount)}
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body1" fontWeight={700}>Amount to be Paid</Typography>
                      <Typography variant="body1" fontWeight={800} sx={{ color: '#16a34a' }}>
                        {fmtINR(netAmount)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              )}

              {/* Still pending after this payment */}
              {gross > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  {gross > remaining ? (
                    <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                      Amount exceeds remaining balance of {fmtINR(remaining)}!
                    </Alert>
                  ) : remaining - gross === 0 ? (
                    <Alert severity="success" sx={{ borderRadius: 1.5 }}>
                      This payment will fully clear the work order.
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                      After this payment, still pending: <strong>{fmtINR(remaining - gross)}</strong>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>

            <TextField label="Notes / Remarks" size="small" fullWidth multiline minRows={2} sx={fieldSx}
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Box>
        )}

        {/* ══ STEP 2: Preview ══ */}
        {step === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
              Review all details before submitting. Once sent to accounts, the request will be locked.
            </Alert>

            {/* Request info */}
            <Typography sx={labelSx}>Request Details</Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Request ID</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#5B63D3' }}>{prNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Invoice Date</Typography>
                  <Typography variant="body2" fontWeight={600}>{invoiceDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Work Order</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedWO?.workOrderNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">WO Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedWO?.type}</Typography>
                </Grid>
                {selectedPeriod && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Period</Typography>
                    <Typography variant="body2" fontWeight={600}>{getPeriodLabel(selectedWO, selectedPeriod)}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedWO?.projectRef}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Vendor details */}
            <Typography sx={labelSx}>Vendor</Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Vendor Name</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedVendor?.vendorName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Service Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.vendorType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">PAN Number</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.panNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">GST Number</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.gstNumber}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <BankIcon sx={{ fontSize: 13, color: '#64748b' }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Bank Details — linked to PAN {selectedVendor?.panNumber}
                </Typography>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Bank</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.bankName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.accountType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Number</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.accountNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IFSC Code</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor?.ifscCode}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Financial summary */}
            <Typography sx={labelSx}>Payment Summary</Typography>
            <Box sx={{ ...sectionSx, mb: 0 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Gross Amount</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmtINR(gross)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: '#dc2626' }}>
                    TDS ({tdsRate}%)
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                    − {fmtINR(tdsAmount)}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body1" fontWeight={800}>Amount to be Paid</Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ color: '#16a34a', fontSize: '1.1rem' }}>
                    {fmtINR(netAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: '#dc2626' }}>TDS to be Deposited</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                    {fmtINR(tdsAmount)}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">WO Balance Before</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtINR(remaining)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={700}
                    sx={{ color: remaining - gross <= 0 ? '#16a34a' : '#d97706' }}>
                    {remaining - gross <= 0 ? 'Fully Cleared' : 'Still Pending After Payment'}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}
                    sx={{ color: remaining - gross <= 0 ? '#16a34a' : '#d97706' }}>
                    {fmtINR(Math.max(0, remaining - gross))}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          startIcon={step > 0 ? <BackIcon /> : undefined}
          variant="outlined"
          sx={{
            textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0',
            color: '#475569', borderRadius: 1.5,
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
          }}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Box>
          {step < 2 && (
            <Button variant="contained" endIcon={<NextIcon />}
              disabled={step === 0 ? !canGoStep2 : !canGoStep3}
              onClick={() => setStep((s) => s + 1)}
              sx={{
                textTransform: 'none', fontWeight: 600, bgcolor: '#5B63D3',
                borderRadius: 1.5, px: 3, boxShadow: 'none',
                '&:hover': { bgcolor: '#4338ca', boxShadow: 'none' },
                '&:disabled': { bgcolor: '#f1f5f9', color: '#94a3b8' },
              }}>
              Next
            </Button>
          )}

          {step === 2 && (
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" startIcon={<SaveIcon />}
                onClick={() => handleSubmit(false)}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                  borderColor: '#e2e8f0', color: '#475569',
                  '&:hover': { borderColor: '#94a3b8' },
                }}>
                Save Draft
              </Button>
              <Button variant="contained" startIcon={<SendIcon />}
                onClick={() => handleSubmit(true)}
                sx={{
                  textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
                  color: '#1e293b', borderRadius: 1.5, px: 3, boxShadow: 'none',
                  '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                }}>
                Send to Accounts
              </Button>
            </Stack>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentRequestModal;
