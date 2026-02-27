// src/components/payments/PaymentModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Typography, IconButton,
  MenuItem, Box, CircularProgress, Alert,
  Chip, Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  CheckCircle as ApproveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';

const PAYMENT_MODES = ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'NEFT/RTGS'];

const EMPTY_INSTALLMENT = { amount: '', paidBy: '', date: '' };

const EMPTY_FORM = {
  vendor: '',
  vendorName: '',
  workOrder: '',
  paymentMode: '',
  frequency: 'Yearly',
  totalAmount: '',
  installments: [],
  upcomingPayment: '',
  invoiceDate: '',
  dueDate: '',
  isDone: false,
  isRefunded: false,
  refundReason: '',
  raisedBy: '',
  raisedByEmail: '',
  notes: '',
};

function SectionLabel({ text }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{ color: '#6366F1', fontWeight: 700, mb: 2, mt: 1,
        textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.8rem' }}
    >
      {text}
    </Typography>
  );
}

function PaymentModal({ open, onClose, onSave, editingPayment, vendors = [], workOrders = [], mode = 'create' }) {
  // mode: 'create' | 'edit' | 'view'
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const { user } = useAuth();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      if (editingPayment) {
        setFormData({
          vendor:             editingPayment.vendor            || '',
          vendorName:         editingPayment.vendorName        || '',
          workOrder:          editingPayment.workOrder         || '',
          paymentMode:        editingPayment.paymentMode       || '',
          frequency:          'Yearly',
          totalAmount:        editingPayment.totalAmount       || '',
          installments:       editingPayment.installments      || [],
          upcomingPayment:    editingPayment.upcomingPayment   || '',
          invoiceDate:        editingPayment.invoiceDate       || '',
          dueDate:            editingPayment.dueDate           || '',
          isDone:             editingPayment.isDone            || false,
          isRefunded:         editingPayment.isRefunded        || false,
          refundReason:       editingPayment.refundReason      || '',
          raisedBy:           editingPayment.raisedBy          || user?.name || '',
          raisedByEmail:      editingPayment.raisedByEmail     || user?.email || '',
          notes:              editingPayment.notes             || '',
        });
      } else {
        setFormData({
          ...EMPTY_FORM,
          raisedBy: user?.name || '',
          raisedByEmail: user?.email || '',
        });
      }
      setErrors({});
      setFormError('');
    }
  }, [open, editingPayment, user]);

  // ── Computed: total paid from installments ──
  const totalPaidTillDate = formData.installments.reduce(
    (sum, inst) => sum + (Number(inst.amount) || 0), 0
  );
  const remaining = Math.max(0, (Number(formData.totalAmount) || 0) - totalPaidTillDate);

  const handleChange = (field) => (e) => {
    if (isViewMode) return;
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'isDone' && !value) {
        updated.isRefunded = false;
        updated.refundReason = '';
      }
      return updated;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    setFormError('');
  };

  const handleVendorChange = (e) => {
    if (isViewMode) return;
    const vendorId = e.target.value;
    const selected = vendors.find(v => String(v.id) === String(vendorId));
    setFormData(prev => ({
      ...prev,
      vendor:     vendorId,
      vendorName: selected ? selected.vendorName : '',
      workOrder:  '',
    }));
    if (errors.vendor) setErrors(prev => ({ ...prev, vendor: '' }));
    setFormError('');
  };

  // ── Installment handlers ──
  const addInstallment = () => {
    setFormData(prev => ({
      ...prev,
      installments: [...prev.installments, { ...EMPTY_INSTALLMENT }],
    }));
  };

  const updateInstallment = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.installments];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installments: updated };
    });
  };

  const removeInstallment = (index) => {
    setFormData(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== index),
    }));
  };

  // Get selected vendor's full details (including bank info)
  const selectedVendorObj = vendors.find(v => String(v.id) === String(formData.vendor));

  // Filter work orders for the selected service provider
  const filteredWorkOrders = formData.vendor && selectedVendorObj
    ? workOrders.filter(wo =>
        wo.vendorCode === selectedVendorObj.vendorCode ||
        String(wo.vendorId) === String(selectedVendorObj.id)
      )
    : [];

  const validate = () => {
    const errs = {};
    if (!formData.vendor)    errs.vendor    = 'Service Provider is required';
    if (!formData.workOrder) errs.workOrder = 'Work Order is required';
    if (!formData.totalAmount || isNaN(Number(formData.totalAmount)) || Number(formData.totalAmount) <= 0) {
      errs.totalAmount = 'Enter a valid amount';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (approve = false) => {
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        ...formData,
        totalAmount:       Number(formData.totalAmount),
        totalPaidTillDate,
        upcomingPayment:   Number(formData.upcomingPayment) || 0,
        approved:          approve,
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasBankDetails = selectedVendorObj &&
    (selectedVendorObj.bankName || selectedVendorObj.accountNumber || selectedVendorObj.ifscCode);

  const dialogTitle = isViewMode
    ? 'View Invoice'
    : isEditMode ? 'Edit Invoice' : 'Raise Invoice';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}>

      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={600}>
            {dialogTitle}
          </Typography>
          {formData.raisedBy && (
            <Chip
              label={`Raised by: ${formData.raisedBy}`}
              size="small"
              sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 500, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ pt: 1 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}

          {/* ── SERVICE PROVIDER ── */}
          <SectionLabel text="Service Provider" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Service Provider *
              </Typography>
              {isViewMode ? (
                <Typography variant="body2" fontWeight={600}>{formData.vendorName || '—'}</Typography>
              ) : (
                <TextField
                  select fullWidth size="small"
                  value={formData.vendor}
                  onChange={handleVendorChange}
                  error={!!errors.vendor}
                  helperText={errors.vendor}
                  disabled={saving}
                >
                  <MenuItem value=""><em>Select Service Provider</em></MenuItem>
                  {vendors.map(v => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.vendorName}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>
          </Grid>

          {/* ── BANK ACCOUNT DETAILS (read-only, shown when vendor selected) ── */}
          {hasBankDetails && (
            <>
              <SectionLabel text="Bank Account Details" />
              <Box sx={{
                mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 2,
                border: '1px solid #bae6fd',
              }}>
                <Grid container spacing={1.5}>
                  {selectedVendorObj.bankName && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Bank Name
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedVendorObj.bankName}
                      </Typography>
                    </Grid>
                  )}
                  {selectedVendorObj.accountNumber && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Account Number
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedVendorObj.accountNumber}
                      </Typography>
                    </Grid>
                  )}
                  {selectedVendorObj.accountType && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Account Type
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedVendorObj.accountType}
                      </Typography>
                    </Grid>
                  )}
                  {selectedVendorObj.ifscCode && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        IFSC Code
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedVendorObj.ifscCode}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </>
          )}

          {/* ── WORK ORDER ── */}
          <SectionLabel text="Work Order" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Work Order *
              </Typography>
              {isViewMode ? (
                <Typography variant="body2" fontWeight={600}>{formData.workOrder || '—'}</Typography>
              ) : (
                <TextField
                  select fullWidth size="small"
                  value={formData.workOrder}
                  onChange={handleChange('workOrder')}
                  error={!!errors.workOrder}
                  helperText={errors.workOrder || (!formData.vendor ? 'Select a service provider first' : '')}
                  disabled={saving || !formData.vendor}
                >
                  <MenuItem value=""><em>Select Work Order</em></MenuItem>
                  {filteredWorkOrders.length > 0
                    ? filteredWorkOrders.map(wo => (
                        <MenuItem key={wo.id} value={wo.id}>
                          {wo.id} – {wo.description}
                        </MenuItem>
                      ))
                    : formData.vendor && (
                        <MenuItem value="" disabled>
                          <em>No work orders for this service provider</em>
                        </MenuItem>
                      )
                  }
                </TextField>
              )}
            </Grid>
          </Grid>

          {/* ── PAYMENT DETAILS ── */}
          <SectionLabel text="Payment Details" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Payment Mode
              </Typography>
              {isViewMode ? (
                <Typography variant="body2">{formData.paymentMode || '—'}</Typography>
              ) : (
                <TextField
                  select fullWidth size="small"
                  value={formData.paymentMode}
                  onChange={handleChange('paymentMode')}
                  disabled={saving}
                >
                  <MenuItem value=""><em>Select Mode</em></MenuItem>
                  {PAYMENT_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              )}
            </Grid>

            <Grid item xs={6} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Frequency
              </Typography>
              <Chip
                label="Yearly"
                size="small"
                sx={{ bgcolor: '#e0e7ff', color: '#4338ca', fontWeight: 600, fontSize: '0.8rem', height: 36, px: 1 }}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Upcoming Payment (₹)
              </Typography>
              {isViewMode ? (
                <Typography variant="body2" fontWeight={600}>
                  ₹{Number(formData.upcomingPayment || 0).toLocaleString('en-IN')}
                </Typography>
              ) : (
                <TextField
                  fullWidth size="small" type="number" placeholder="0"
                  value={formData.upcomingPayment}
                  onChange={handleChange('upcomingPayment')}
                  disabled={saving}
                  inputProps={{ min: 0, step: 'any' }}
                />
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Work Order Amount (₹) *
              </Typography>
              {isViewMode ? (
                <Typography variant="body1" fontWeight={700} sx={{ color: '#1d1d1f' }}>
                  ₹{Number(formData.totalAmount || 0).toLocaleString('en-IN')}
                </Typography>
              ) : (
                <TextField
                  fullWidth size="small" type="number" placeholder="0"
                  value={formData.totalAmount}
                  onChange={handleChange('totalAmount')}
                  error={!!errors.totalAmount}
                  helperText={errors.totalAmount}
                  disabled={saving}
                  inputProps={{ min: 0, step: 'any' }}
                />
              )}
            </Grid>
          </Grid>

          {/* ── TOTAL & PARTS TOGETHER — Installment Tracking ── */}
          <SectionLabel text="Payment Installments" />
          {/* Summary bar */}
          <Box sx={{
            display: 'flex', gap: 2, mb: 2, p: 1.5, bgcolor: '#fafafa',
            borderRadius: 2, border: '1px solid #e5e7eb', flexWrap: 'wrap',
          }}>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Work Order Amount
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                ₹{Number(formData.totalAmount || 0).toLocaleString('en-IN')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Total Paid Till Date
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#16a34a' }}>
                ₹{totalPaidTillDate.toLocaleString('en-IN')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Remaining
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                ₹{remaining.toLocaleString('en-IN')}
              </Typography>
            </Box>
          </Box>

          {/* Installment entries */}
          {formData.installments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {formData.installments.map((inst, idx) => (
                <Box key={idx} sx={{
                  display: 'flex', gap: 1, mb: 1, alignItems: 'center',
                  p: 1.5, bgcolor: '#fff', borderRadius: 1.5,
                  border: '1px solid #e5e7eb',
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#6366F1', minWidth: 24 }}>
                    #{idx + 1}
                  </Typography>
                  {isViewMode ? (
                    <>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        ₹{Number(inst.amount || 0).toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {inst.paidBy || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {inst.date || '—'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <TextField
                        size="small" type="number" placeholder="Amount"
                        value={inst.amount}
                        onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                        disabled={saving}
                        sx={{ flex: 1 }}
                        inputProps={{ min: 0, step: 'any' }}
                      />
                      <TextField
                        size="small" placeholder="Paid by"
                        value={inst.paidBy}
                        onChange={(e) => updateInstallment(idx, 'paidBy', e.target.value)}
                        disabled={saving}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small" type="date"
                        value={inst.date}
                        onChange={(e) => updateInstallment(idx, 'date', e.target.value)}
                        disabled={saving}
                        sx={{ flex: 1 }}
                      />
                      <IconButton size="small" onClick={() => removeInstallment(idx)} disabled={saving}
                        sx={{ color: '#dc2626' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {formData.installments.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              No installments recorded yet.
            </Typography>
          )}

          {!isViewMode && (
            <Button
              size="small" startIcon={<AddIcon />}
              onClick={addInstallment}
              disabled={saving}
              sx={{ mb: 3, color: '#6366F1' }}
            >
              Add Installment
            </Button>
          )}

          {/* ── DATES ── */}
          <SectionLabel text="Dates" />
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Invoice Date
              </Typography>
              {isViewMode ? (
                <Typography variant="body2">{formData.invoiceDate || '—'}</Typography>
              ) : (
                <TextField
                  fullWidth size="small" type="date"
                  value={formData.invoiceDate}
                  onChange={handleChange('invoiceDate')}
                  InputLabelProps={{ shrink: true }}
                  disabled={saving}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Due Date
              </Typography>
              {isViewMode ? (
                <Typography variant="body2">{formData.dueDate || '—'}</Typography>
              ) : (
                <TextField
                  fullWidth size="small" type="date"
                  value={formData.dueDate}
                  onChange={handleChange('dueDate')}
                  InputLabelProps={{ shrink: true }}
                  disabled={saving}
                />
              )}
            </Grid>
          </Grid>

          {/* ── PAYMENT STATUS (simple tick) ── */}
          <SectionLabel text="Payment Status" />
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isDone}
                  onChange={handleChange('isDone')}
                  sx={{ '&.Mui-checked': { color: '#16a34a' } }}
                  disabled={saving || isViewMode}
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  Payment Done
                </Typography>
              }
            />

            {formData.isDone && (
              <Box sx={{ ml: 4, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isRefunded}
                      onChange={handleChange('isRefunded')}
                      sx={{ '&.Mui-checked': { color: '#dc2626' } }}
                      disabled={saving || isViewMode}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500} color="error">
                      Payment Refunded
                    </Typography>
                  }
                />
                {formData.isRefunded && (
                  isViewMode ? (
                    <Typography variant="body2" color="error" sx={{ ml: 4 }}>
                      {formData.refundReason || 'No reason provided'}
                    </Typography>
                  ) : (
                    <TextField
                      fullWidth size="small" multiline rows={2}
                      placeholder="Reason for refund..."
                      value={formData.refundReason}
                      onChange={handleChange('refundReason')}
                      disabled={saving}
                      sx={{ mt: 1 }}
                    />
                  )
                )}
              </Box>
            )}
          </Box>

          {/* ── NOTES ── */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Notes / Remarks
              </Typography>
              {isViewMode ? (
                <Typography variant="body2">{formData.notes || '—'}</Typography>
              ) : (
                <TextField
                  fullWidth multiline rows={2} size="small"
                  placeholder="Any notes about this payment..."
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  disabled={saving}
                />
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          {isViewMode ? 'Close' : 'Cancel'}
        </Button>
        {!isViewMode && (
          <>
            <Button
              variant="outlined"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <ApproveIcon />}
              onClick={() => handleSave(true)}
              disabled={saving}
              sx={{
                minWidth: 100, color: '#16a34a', borderColor: '#16a34a',
                '&:hover': { borderColor: '#15803d', bgcolor: '#f0fdf4' },
              }}
            >
              Approve
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={() => handleSave(false)}
              disabled={saving}
              sx={{ minWidth: 100, bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default PaymentModal;
