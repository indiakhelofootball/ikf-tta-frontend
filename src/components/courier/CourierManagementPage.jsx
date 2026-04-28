import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  InputAdornment, Alert, Checkbox, FormControlLabel, Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  LocalShipping as ShipIcon,
  Inventory2 as BoxIcon,
  CheckCircle as CheckIcon,
  DirectionsBus as TransitIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Warning as WarnIcon,
  WhatsApp as WhatsAppIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { repAPI, courierAPI } from '../../services/api';

const PREDEFINED_ITEMS = [
  { name: 'Volunteer Tshirts', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
  { name: 'Banners', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
  { name: 'Matchsheet', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
  { name: 'Scout Dockets', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
  { name: 'Numbered Bibs Orange', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
  { name: 'Numbered Bibs Green', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' },
];

const PRODUCTION_STATUSES = ['Pending', 'Sent for Printing', 'Received from Printer'];
const COURIERS = ['Blue Dart', 'DTDC', 'Delhivery', 'FedEx', 'India Post', 'Ekart', 'Professional Couriers', 'XpressBees'];

const STATUS_CONFIG = {
  Draft:        { color: 'default', label: 'Draft' },
  Dispatched:   { color: 'warning', label: 'Dispatched' },
  'In Transit': { color: 'info',    label: 'In Transit' },
  Delivered:    { color: 'success', label: 'Delivered' },
  Returned:     { color: 'error',   label: 'Returned' },
  Lost:         { color: 'error',   label: 'Lost' },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function getShipmentFlag(shipment) {
  const days = daysUntil(shipment.snapTrialDate);
  if (days === null) return null;
  if (['Delivered', 'Returned', 'Lost'].includes(shipment.status)) return null;
  const hasUnreadyCustom = shipment.items.some(i => i.isCustom && i.productionStatus !== 'Received from Printer');
  if (hasUnreadyCustom && days <= 60) return { level: 'error', msg: `Custom items not ready — trial in ${days}d` };
  if (shipment.status === 'Draft' && days <= 30) return { level: 'error', msg: `Not dispatched — trial in ${days}d` };
  if (hasUnreadyCustom && days <= 75) return { level: 'warning', msg: `Custom items pending — trial in ${days}d` };
  if (shipment.status === 'Draft' && days <= 45) return { level: 'warning', msg: `Dispatch soon — trial in ${days}d` };
  return null;
}

function downloadPDF(shipment) {
  const isDraft = shipment.status === 'Draft';
  const docTitle = isDraft ? 'Packing Slip' : 'Shipment Dispatch Note';
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`TTA — ${docTitle}`, 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let y = 28;
  doc.text(`Shipment ID: ${shipment.refNumber}`, 14, y); y += 6;
  doc.text(`Status: ${shipment.status}`, 14, y); y += 6;
  if (!isDraft) {
    doc.text(`Dispatch Date: ${shipment.dispatchedAt ? shipment.dispatchedAt.slice(0, 10) : '-'}`, 14, y); y += 6;
    doc.text(`Courier: ${shipment.courierProvider || '-'}`, 14, y); y += 6;
    doc.text(`AWB / Tracking ID: ${shipment.trackingNumber || '-'}`, 14, y); y += 6;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Destination', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`REP: ${shipment.snapRepName || '-'}`, 14, y); y += 6;
  doc.text(`Recipient: ${shipment.snapAcceptingName || '-'}${shipment.snapAcceptingPhone ? ` | ${shipment.snapAcceptingPhone}` : ''}`, 14, y); y += 6;
  if (shipment.snapAddress) { doc.text(`Address: ${shipment.snapAddress}`, 14, y); y += 6; }
  if (shipment.snapSubArea) { doc.text(`Sub-Area: ${shipment.snapSubArea}`, 14, y); y += 6; }
  doc.text(`City: ${shipment.snapCity || '-'}, ${shipment.snapState || '-'} - ${shipment.snapPinCode || '-'}`, 14, y); y += 6;
  if (shipment.snapDistrict || shipment.snapCourierState) {
    doc.text(`District: ${shipment.snapDistrict || '-'} | Courier State: ${shipment.snapCourierState || '-'}`, 14, y); y += 6;
  }
  if (shipment.snapTrialName) {
    doc.text(`Trial: ${shipment.snapTrialName}${shipment.snapTrialDate ? ` (Trial Date: ${shipment.snapTrialDate})` : ''}`, 14, y); y += 6;
  }

  doc.autoTable({
    startY: y + 4,
    head: [['#', 'Item', 'Qty', 'Custom', 'Production Status / Remarks']],
    body: (shipment.items || []).map((i, idx) => [
      idx + 1,
      i.name,
      i.quantity,
      i.isCustom ? 'Yes' : '',
      i.isCustom ? (i.productionStatus || '') : (i.remarks || ''),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [91, 99, 211], textColor: 255 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 16 }, 3: { cellWidth: 18 } },
  });

  let endY = doc.lastAutoTable.finalY + 4;
  const totalQty = (shipment.items || []).reduce((a, b) => a + Number(b.quantity || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Items: ${(shipment.items || []).length}   Total Qty: ${totalQty}`, 14, endY);
  endY += 8;

  if (shipment.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, endY); endY += 6;
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(shipment.notes, 180);
    doc.text(split, 14, endY);
  }

  const suffix = isDraft ? 'packing_slip' : 'dispatch';
  doc.save(`${shipment.refNumber}_${suffix}.pdf`);
}

const cardSx = { bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 2.5, mb: 2 };
const labelSx = { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' };
const secHeaderSx = { fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 };

const STAT_COLORS = {
  grey:    { bg: '#f3f4f6', fg: '#6b7280' },
  warning: { bg: '#fef3c7', fg: '#d97706' },
  info:    { bg: '#dbeafe', fg: '#2563eb' },
  success: { bg: '#dcfce7', fg: '#16a34a' },
};

function StatCard({ icon, label, value, color }) {
  const c = STAT_COLORS[color] || STAT_COLORS.grey;
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function AddressCard({ assignment }) {
  if (!assignment) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '10px', p: 2, color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center' }}>
        Select a REP and city to see courier address
      </Box>
    );
  }
  return (
    <Box sx={{ bgcolor: '#eff6ff', border: '1.5px solid #3B82F6', borderRadius: '10px', p: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af', mb: 0.5 }}>{assignment.courierAcceptingName || '—'}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#1e293b' }}>{assignment.courierAddress}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>{assignment.city}, {assignment.state} — {assignment.courierPinCode}</Typography>
      {assignment.courierAcceptingPhone && (
        <Typography sx={{ fontSize: '0.82rem', color: '#475569' }}>Ph: {assignment.courierAcceptingPhone}</Typography>
      )}
      {assignment.trialDate && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #bfdbfe', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>
            Trial: {assignment.trialName}
          </Typography>
          <Chip label={assignment.trialDate} size="small"
            sx={{ fontSize: '0.7rem', fontWeight: 700, bgcolor: '#dbeafe', color: '#1e40af' }} />
          {(() => {
            const days = daysUntil(assignment.trialDate);
            if (days !== null && days <= 30) return <Chip label={`${days}d away`} size="small" color="error" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />;
            if (days !== null && days <= 60) return <Chip label={`${days}d away`} size="small" color="warning" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />;
            return <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{days}d away</Typography>;
          })()}
        </Box>
      )}
    </Box>
  );
}

function ItemRow({ item, index, onChange, onDelete }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px auto 1fr 36px', gap: 1, alignItems: 'center', bgcolor: item.isCustom ? '#fefce8' : '#f8fafc', borderRadius: '8px', p: 1, mb: 0.75 }}>
      <TextField size="small" value={item.name} placeholder="Item name"
        onChange={e => onChange(index, 'name', e.target.value)}
        sx={{ '& .MuiInputBase-root': { bgcolor: '#fff', fontSize: '0.82rem' } }} />
      <TextField size="small" type="number" value={item.quantity} placeholder="Qty"
        onChange={e => onChange(index, 'quantity', Number(e.target.value))}
        sx={{ '& .MuiInputBase-root': { bgcolor: '#fff', fontSize: '0.82rem' } }} />
      <Tooltip title="Mark as custom item (needs printing/production)">
        <FormControlLabel
          control={
            <Checkbox size="small" checked={!!item.isCustom}
              onChange={e => onChange(index, 'isCustom', e.target.checked)}
              sx={{ p: 0.5 }} />
          }
          label={<Typography sx={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>Custom</Typography>}
          sx={{ m: 0 }}
        />
      </Tooltip>
      {item.isCustom ? (
        <TextField select size="small" value={item.productionStatus || 'Pending'}
          onChange={e => onChange(index, 'productionStatus', e.target.value)}
          sx={{ '& .MuiInputBase-root': { bgcolor: '#fff', fontSize: '0.78rem' } }}>
          {PRODUCTION_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ fontSize: '0.82rem' }}>{s}</MenuItem>)}
        </TextField>
      ) : (
        <TextField size="small" value={item.remarks} placeholder="Remarks (optional)"
          onChange={e => onChange(index, 'remarks', e.target.value)}
          sx={{ '& .MuiInputBase-root': { bgcolor: '#fff', fontSize: '0.82rem' } }} />
      )}
      <IconButton size="small" onClick={() => onDelete(index)} sx={{ color: '#ef4444' }}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function CourierManagementPage() {
  const [shipments, setShipments] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // new/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fRepId, setFRepId] = useState('');
  const [fAsgId, setFAsgId] = useState('');
  const [fItems, setFItems] = useState([]);
  const [fNotes, setFNotes] = useState('');

  // dispatch modal
  const [dispOpen, setDispOpen] = useState(false);
  const [dispId, setDispId] = useState(null);
  const [dispCourier, setDispCourier] = useState('');
  const [dispAwb, setDispAwb] = useState('');
  const [dispNotes, setDispNotes] = useState('');

  // delivery modal
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryId, setDeliveryId] = useState(null);
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState('');
  const [deliveryWhatsapp, setDeliveryWhatsapp] = useState(false);
  const [deliveryPhone, setDeliveryPhone] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const selectedRep = reps.find(r => r.id === fRepId) || null;
  const selectedAsg = selectedRep?.cityAssignments?.find(a => a.id === fAsgId) || null;

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [repsData, shipmentsData] = await Promise.all([
          repAPI.getAll({ limit: 1000 }),
          courierAPI.getAll(),
        ]);
        const repList = Array.isArray(repsData) ? repsData : (repsData.results || []);
        setReps(repList);
        setShipments(Array.isArray(shipmentsData) ? shipmentsData : (shipmentsData.results || []));
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const stats = useMemo(() => ({
    Draft: shipments.filter(s => s.status === 'Draft').length,
    Dispatched: shipments.filter(s => s.status === 'Dispatched').length,
    'In Transit': shipments.filter(s => s.status === 'In Transit').length,
    Delivered: shipments.filter(s => s.status === 'Delivered').length,
  }), [shipments]);

  const filtered = useMemo(() => shipments.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [s.refNumber, s.snapRepName, s.snapCity, s.trackingNumber || ''].join(' ').toLowerCase().includes(q);
    }
    return true;
  }), [shipments, filterStatus, search]);

  function openNew() {
    setEditingId(null); setFRepId(''); setFAsgId(''); setFItems([]); setFNotes(''); setError('');
    setModalOpen(true);
  }

  function openEdit(s) {
    let foundRepId = '';
    for (const r of reps) {
      if ((r.cityAssignments || []).some(a => a.id === s.assignmentId)) {
        foundRepId = r.id;
        break;
      }
    }
    setEditingId(s.id); setFRepId(foundRepId); setFAsgId(s.assignmentId || '');
    setFItems((s.items || []).map(i => ({ ...i }))); setFNotes(s.notes || ''); setError('');
    setModalOpen(true);
  }

  function onRepChange(repId) { setFRepId(repId); setFAsgId(''); }

  function addPredefined() {
    const existing = new Set(fItems.map(i => i.name));
    const toAdd = PREDEFINED_ITEMS.filter(p => !existing.has(p.name)).map(p => ({ ...p }));
    if (toAdd.length) setFItems(prev => [...prev, ...toAdd]);
  }

  function addBlankItem() {
    setFItems(prev => [...prev, { name: '', quantity: 1, remarks: '', isCustom: false, productionStatus: 'Pending' }]);
  }

  function changeItem(index, field, value) {
    setFItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function deleteItem(index) { setFItems(prev => prev.filter((_, i) => i !== index)); }

  async function saveShipment() {
    if (!fAsgId || !fItems.length) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const updated = await courierAPI.update(editingId, { notes: fNotes, items: fItems });
        setShipments(prev => prev.map(s => s.id === editingId ? updated : s));
      } else {
        const created = await courierAPI.create({
          assignmentId: fAsgId,
          notes: fNotes,
          items: fItems.map((it, i) => ({ ...it, order: i })),
        });
        setShipments(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function openDispatch(id) {
    setDispId(id); setDispCourier(''); setDispAwb(''); setDispNotes(''); setError('');
    setDispOpen(true);
  }

  async function saveDispatch() {
    if (!dispCourier || !dispAwb) return;
    setSaving(true);
    setError('');
    try {
      const updated = await courierAPI.dispatch(dispId, {
        courierProvider: dispCourier,
        trackingNumber: dispAwb,
        dispatchNotes: dispNotes,
      });
      setShipments(prev => prev.map(s => s.id === dispId ? updated : s));
      setDispOpen(false);
    } catch (e) {
      setError(e.message || 'Dispatch failed.');
    } finally {
      setSaving(false);
    }
  }

  function openDelivery(id) {
    setDeliveryId(id); setDeliveryReceivedBy('');
    setDeliveryWhatsapp(false); setDeliveryPhone(false); setDeliveryNotes(''); setError('');
    setDeliveryOpen(true);
  }

  async function saveDelivery() {
    setSaving(true);
    setError('');
    try {
      const updated = await courierAPI.deliver(deliveryId, {
        deliveryConfirmedBy: deliveryReceivedBy,
        deliveryVerifiedWhatsapp: deliveryWhatsapp,
        deliveryVerifiedPhone: deliveryPhone,
        deliveryNotes: deliveryNotes,
      });
      setShipments(prev => prev.map(s => s.id === deliveryId ? updated : s));
      setDeliveryOpen(false);
    } catch (e) {
      setError(e.message || 'Failed to mark delivered.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#FCD34D' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>
            Courier Management
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mt: 0.5 }}>
            Track shipments dispatched to REPs across trial cities
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ bgcolor: '#FDE68A', color: '#1e293b', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
          New Shipment
        </Button>
      </Stack>

      {error && !modalOpen && !dispOpen && !deliveryOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        <StatCard icon={<BoxIcon fontSize="small" />} label="Draft" value={stats.Draft} color="grey" />
        <StatCard icon={<ShipIcon fontSize="small" />} label="Dispatched" value={stats.Dispatched} color="warning" />
        <StatCard icon={<TransitIcon fontSize="small" />} label="In Transit" value={stats['In Transit']} color="info" />
        <StatCard icon={<CheckIcon fontSize="small" />} label="Delivered" value={stats.Delivered} color="success" />
      </Box>

      {/* Filters */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="center">
          <TextField size="small" placeholder="Search by ID, REP, city, AWB…" value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> } }}
            sx={{ flex: 1, minWidth: 220 }} />
          <Stack direction="row" gap={1} flexWrap="wrap">
            {['all', 'Draft', 'Dispatched', 'In Transit', 'Delivered', 'Returned', 'Lost'].map(s => (
              <Chip key={s} label={s === 'all' ? 'All' : s} size="small"
                onClick={() => setFilterStatus(s)}
                variant={filterStatus === s ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, cursor: 'pointer',
                  ...(filterStatus === s ? { bgcolor: '#5B63D3', color: '#fff', borderColor: '#5B63D3' } : { color: '#64748b' }) }} />
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f7' }}>
              {['', 'Shipment ID', 'REP', 'City', 'Trial Date', 'Items', 'AWB', 'Courier', 'Dispatch Date', 'Status', ''].map((h, i) => (
                <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', py: 1.25 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {!filtered.length ? (
              <TableRow>
                <TableCell colSpan={11} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                  <BoxIcon sx={{ fontSize: 36, display: 'block', mx: 'auto', mb: 1, opacity: 0.4 }} />
                  No shipments found.
                </TableCell>
              </TableRow>
            ) : filtered.map(s => {
              const flag = getShipmentFlag(s);
              return (
                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: '#f8fafc' }, ...(flag?.level === 'error' ? { bgcolor: '#fff7f7' } : flag?.level === 'warning' ? { bgcolor: '#fffbeb' } : {}) }}>
                  <TableCell sx={{ width: 28, pr: 0 }}>
                    {flag && (
                      <Tooltip title={flag.msg}>
                        <WarnIcon sx={{ fontSize: 18, color: flag.level === 'error' ? '#ef4444' : '#f59e0b' }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{s.refNumber}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{s.snapRepName}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem', color: '#475569' }}>{s.snapCity}, {s.snapState}</TableCell>
                  <TableCell>
                    {s.snapTrialDate ? (
                      <Stack direction="row" gap={0.5} alignItems="center">
                        <Typography sx={{ fontSize: '0.8rem' }}>{s.snapTrialDate}</Typography>
                        {(() => {
                          const d = daysUntil(s.snapTrialDate);
                          if (d !== null && d <= 30) return <Chip label={`${d}d`} size="small" color="error" sx={{ fontSize: '0.65rem', height: 18 }} />;
                          if (d !== null && d <= 60) return <Chip label={`${d}d`} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 18 }} />;
                          return null;
                        })()}
                      </Stack>
                    ) : <Typography sx={{ color: '#cbd5e1' }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>
                    {(s.items || []).length} item{(s.items || []).length !== 1 ? 's' : ''}{' '}
                    <Typography component="span" sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      ({(s.items || []).reduce((a, b) => a + Number(b.quantity || 0), 0)} qty)
                    </Typography>
                    {(s.items || []).some(i => i.isCustom) && (
                      <Chip label="custom" size="small" sx={{ ml: 0.5, fontSize: '0.65rem', height: 16, bgcolor: '#fef9c3', color: '#92400e' }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>
                    {s.trackingNumber || <Typography component="span" sx={{ color: '#cbd5e1' }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{s.courierProvider || <Typography component="span" sx={{ color: '#cbd5e1' }}>—</Typography>}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>
                    {s.dispatchedAt ? s.dispatchedAt.slice(0, 10) : <Typography component="span" sx={{ color: '#cbd5e1' }}>—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip label={s.status} size="small"
                      color={STATUS_CONFIG[s.status]?.color || 'default'}
                      sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {s.status === 'Draft' && (
                        <>
                          <Tooltip title="Download packing slip PDF">
                            <IconButton size="small" onClick={() => downloadPDF(s)} sx={{ color: '#5B63D3' }}>
                              <PdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Button size="small" variant="outlined" onClick={() => openEdit(s)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>Edit</Button>
                          <Button size="small" variant="contained" onClick={() => openDispatch(s.id)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto', bgcolor: '#FDE68A', color: '#1e293b', boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
                            Dispatch
                          </Button>
                        </>
                      )}
                      {['Dispatched', 'In Transit'].includes(s.status) && (
                        <>
                          <Tooltip title="Download dispatch PDF">
                            <IconButton size="small" onClick={() => downloadPDF(s)} sx={{ color: '#5B63D3' }}>
                              <PdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Button size="small" variant="outlined" color="success" onClick={() => openDelivery(s.id)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>
                            Delivered
                          </Button>
                        </>
                      )}
                      {s.status === 'Delivered' && (
                        <Tooltip title="Download dispatch PDF">
                          <IconButton size="small" onClick={() => downloadPDF(s)} sx={{ color: '#5B63D3' }}>
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* NEW / EDIT SHIPMENT MODAL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {editingId ? `Edit Shipment` : 'New Shipment'}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mt: 0.25 }}>
                Fill in what you are sending and to whom
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setModalOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Destination */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Destination</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography sx={labelSx}>REP <span style={{ color: '#ef4444' }}>*</span></Typography>
                <TextField select fullWidth size="small" value={fRepId} onChange={e => onRepChange(e.target.value)}
                  disabled={!!editingId}>
                  <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>— Select REP —</MenuItem>
                  {reps.map(r => <MenuItem key={r.id} value={r.id}>{r.repName}</MenuItem>)}
                </TextField>
              </Box>
              <Box>
                <Typography sx={labelSx}>City <span style={{ color: '#ef4444' }}>*</span></Typography>
                <TextField select fullWidth size="small" value={fAsgId} disabled={!selectedRep || !!editingId}
                  onChange={e => setFAsgId(e.target.value)}>
                  <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>
                    {selectedRep ? '— Select city —' : 'Pick a REP first'}
                  </MenuItem>
                  {(selectedRep?.cityAssignments || []).map(a => (
                    <MenuItem key={a.id} value={a.id}>{a.city}, {a.state}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <AddressCard assignment={selectedAsg} />
            </Box>
          </Box>

          {/* Items */}
          <Box sx={cardSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography sx={secHeaderSx}>Items</Typography>
              <Stack direction="row" gap={1}>
                <Button size="small" variant="outlined" onClick={addPredefined}
                  sx={{ fontSize: '0.75rem', py: 0.5, borderColor: '#22c55e', color: '#15803d', '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' } }}>
                  + Add Predefined Items
                </Button>
                <Button size="small" variant="outlined" onClick={addBlankItem}
                  sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  + Add Item
                </Button>
              </Stack>
            </Stack>

            {!fItems.length ? (
              <Box sx={{ bgcolor: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '10px', p: 3, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No items yet — click "Add Predefined Items" or "Add Item"
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px auto 1fr 36px', gap: 1, px: 1, mb: 0.5 }}>
                  {['Item Name', 'Qty', 'Custom?', 'Remarks / Production Status', ''].map(h => (
                    <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
                  ))}
                </Box>
                {fItems.map((it, i) => (
                  <ItemRow key={i} item={it} index={i} onChange={changeItem} onDelete={deleteItem} />
                ))}
                {fItems.some(i => i.isCustom) && (
                  <Alert severity="info" sx={{ mt: 1, fontSize: '0.78rem' }}>
                    Custom items show production status. Update as printing progresses.
                  </Alert>
                )}
              </>
            )}
          </Box>

          {/* Notes */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Notes</Typography>
            <TextField fullWidth multiline minRows={2} size="small" value={fNotes}
              onChange={e => setFNotes(e.target.value)}
              placeholder="Special handling, urgency notes…" />
          </Box>

          {(!editingId && (!fRepId || !fAsgId)) && (
            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>Select a REP and city before saving.</Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setModalOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={saveShipment}
            disabled={saving || (!editingId && (!fRepId || !fAsgId)) || !fItems.length}
            sx={{ bgcolor: '#FDE68A', color: '#1e293b', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#92400e' }} /> : 'Save as Draft'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DISPATCH MODAL */}
      <Dialog open={dispOpen} onClose={() => setDispOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', pb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Mark as Dispatched</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mt: 0.25 }}>Enter courier and tracking details</Typography>
            </Box>
            <IconButton size="small" onClick={() => setDispOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack gap={2}>
            <Box>
              <Typography sx={labelSx}>Courier Company <span style={{ color: '#ef4444' }}>*</span></Typography>
              <TextField select fullWidth size="small" value={dispCourier} onChange={e => setDispCourier(e.target.value)}>
                <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>— Select courier —</MenuItem>
                {COURIERS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Box>
            <Box>
              <Typography sx={labelSx}>AWB / Tracking ID <span style={{ color: '#ef4444' }}>*</span></Typography>
              <TextField fullWidth size="small" value={dispAwb} onChange={e => setDispAwb(e.target.value)} placeholder="e.g. BD-87432109" />
            </Box>
            <Box>
              <Typography sx={labelSx}>Notes</Typography>
              <TextField fullWidth size="small" multiline minRows={2} value={dispNotes}
                onChange={e => setDispNotes(e.target.value)} placeholder="Any dispatch notes…" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDispOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={saveDispatch}
            disabled={saving || !dispCourier || !dispAwb}
            sx={{ bgcolor: '#FDE68A', color: '#1e293b', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#92400e' }} /> : 'Dispatch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELIVERY MODAL */}
      <Dialog open={deliveryOpen} onClose={() => setDeliveryOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', pb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Mark as Delivered</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#64748b', mt: 0.25 }}>Confirm receipt details</Typography>
            </Box>
            <IconButton size="small" onClick={() => setDeliveryOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack gap={2.5}>
            <Box>
              <Typography sx={labelSx}>Received By</Typography>
              <TextField fullWidth size="small" value={deliveryReceivedBy}
                onChange={e => setDeliveryReceivedBy(e.target.value)}
                placeholder="Name of person who received" />
            </Box>
            <Box>
              <Typography sx={{ ...labelSx, mb: 1 }}>Verification (tick any that apply)</Typography>
              <Stack gap={1}>
                <FormControlLabel
                  control={<Checkbox checked={deliveryWhatsapp} onChange={e => setDeliveryWhatsapp(e.target.checked)} size="small" sx={{ color: '#25d366', '&.Mui-checked': { color: '#25d366' } }} />}
                  label={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <WhatsAppIcon sx={{ fontSize: 16, color: '#25d366' }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>Confirmed via WhatsApp message</Typography>
                    </Stack>
                  } />
                <FormControlLabel
                  control={<Checkbox checked={deliveryPhone} onChange={e => setDeliveryPhone(e.target.checked)} size="small" />}
                  label={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <PhoneIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                      <Typography sx={{ fontSize: '0.85rem' }}>Confirmed via phone call</Typography>
                    </Stack>
                  } />
              </Stack>
            </Box>
            <Box>
              <Typography sx={labelSx}>Notes</Typography>
              <TextField fullWidth size="small" multiline minRows={2} value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)} placeholder="Any delivery notes…" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDeliveryOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={saveDelivery}
            disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Mark Delivered'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
