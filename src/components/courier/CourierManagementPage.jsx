import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Chip, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Paper,
  InputAdornment, Alert, Checkbox, FormControlLabel, Tooltip,
  CircularProgress, Menu,
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
import {
  SLIP_PAGE_PT, SLIP_BLANK_PNG, SLIP_ITEM_TILES, SLIP_BADGE_TILES,
  BARLOW_REGULAR_TTF, BARLOW_BOLD_TTF, BARLOW_EXTRABOLD_TTF,
} from './courierSlipAssets';
import { repAPI, courierAPI } from '../../services/api';
import { getCourierItems } from '../../utils/adminStorage';
import useGrants from '../../auth/useGrants';
import { canDeleteShipment, deleteShipmentTooltip } from './courierDeletePermission';
import { daysUntil, getShipmentFlag } from './courierShipmentFlag';
import {
  sanitizeQuantityInput, normalizeQuantity, normalizeItemsForSave, canSaveShipment,
} from './courierItemQuantity';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';

const TSHIRT_ITEM_NAME = 'Volunteer Tshirts';

const ZERO_REASON_OPTIONS = [
  { value: 'already_couriered', label: 'Already couriered' },
  { value: 'separate',          label: 'Will be couriered separately' },
  { value: 'not_sending',       label: 'Not to be sent' },
];

// Courier item names come from ONE place: the admin master list (config
// category 'courier_item', loaded via getCourierItems). There is no hardcoded
// item list — operators pick from the master list, so the contents are always
// the authoritative set and no one adds ad-hoc names. Build a shipment-item row
// from a master-list name here; Volunteer Tshirts start at qty 0 (the count
// depends on the volunteer headcount and is set at dispatch), everything else 1.
function makeCourierItem(name) {
  return {
    name,
    quantity: name === TSHIRT_ITEM_NAME ? 0 : 1,
    remarks: '',
    isCustom: false,
    productionStatus: 'Pending',
    zeroReason: '',
  };
}

const PRODUCTION_STATUSES = ['Pending', 'Sent for Printing', 'Received from Printer'];
const COURIERS = ['Blue Dart', 'DTDC', 'Delhivery', 'FedEx', 'India Post', 'Ekart', 'Professional Couriers', 'XpressBees', 'Other'];

const TRACKING_URLS = {
  'Blue Dart':            awb => `https://www.bluedart.com/tracking?trackingId=${encodeURIComponent(awb)}`,
  'DTDC':                 awb => `https://www.dtdc.com/tracking?awbNumber=${encodeURIComponent(awb)}`,
  'Delhivery':            awb => `https://www.delhivery.com/tracking?awb=${encodeURIComponent(awb)}`,
  'FedEx':                awb => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(awb)}`,
  'India Post':           ()  => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`,
  'Ekart':                awb => `https://ekartlogistics.com/track/${encodeURIComponent(awb)}`,
  'Professional Couriers': awb => `https://www.tpcindia.com/Tracking2014.aspx?id=${encodeURIComponent(awb)}`,
  'XpressBees':           awb => `https://www.xpressbees.com/track?awb=${encodeURIComponent(awb)}`,
};
function getTrackingUrl(courier, awb) {
  if (!awb) return null;
  const fn = TRACKING_URLS[courier];
  return fn ? fn(awb) : null;
}

const STATUS_CONFIG = {
  Draft:        { color: 'default', label: 'Draft' },
  Dispatched:   { color: 'warning', label: 'Dispatched' },
  'In Transit': { color: 'info',    label: 'In Transit' },
  Delivered:    { color: 'success', label: 'Delivered' },
  Returned:     { color: 'error',   label: 'Returned' },
  Lost:         { color: 'error',   label: 'Lost' },
};

// Active = in-flight shipments that still need work; Past = terminal states,
// kept permanently as history but filtered out of the default working view.
const ACTIVE_STATUSES = ['Draft', 'Dispatched', 'In Transit'];
const PAST_STATUSES = ['Delivered', 'Returned', 'Lost'];
const STATUS_FILTERS = ['active', 'past', 'all', 'Draft', 'Dispatched', 'In Transit', 'Delivered', 'Returned', 'Lost'];
const FILTER_LABELS = { active: 'Active', past: 'Past', all: 'All', deleted: 'Deleted' };

// daysUntil / getShipmentFlag now live in courierShipmentFlag.js — see the note
// there on why (#9: an items array missing its fallback blanked the whole page).

// Fetch a (possibly remote) image URL and return a data: URL for jsPDF.
// Data URLs are passed straight through; failures resolve to null (logo skipped).
async function urlToDataURL(url) {
  if (!url) return null;
  if (String(url).startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Branded IKF "TYGER-IKF Trial Kit" package slip — pixel-identical to the official
// artwork. The static layer (header, SHIP TO / DISPATCHED FROM labels, CONTENTS table
// with empty badges, sidebar, footer) is a high-res raster of the source PDF. Only the
// REP name, recipient details, PIN/MOB, QTY numbers and the REP logo are drawn live,
// in the artwork's own font (Barlow) at the exact baselines, colours and letter-spacing.
async function downloadPDF(shipment, logoDataURL) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: SLIP_PAGE_PT });
  const [pageW, pageH] = SLIP_PAGE_PT;   // 1440 x 810
  const NAVY = [0, 36, 74];              // artwork navy
  const QTY_COLOR = [241, 241, 241];     // off-white badge numbers

  // Static template (CONTENTS rows erased), full page. The rows themselves are
  // composited below from per-item tiles so zero-quantity contents are omitted.
  doc.addImage(SLIP_BLANK_PNG, 'PNG', 0, 0, pageW, pageH, 'slipBlank', 'FAST');

  // Register the artwork's fonts (full Barlow — covers any recipient text).
  doc.addFileToVFS('Barlow-Regular.ttf', BARLOW_REGULAR_TTF);
  doc.addFont('Barlow-Regular.ttf', 'Barlow', 'normal');
  doc.addFileToVFS('Barlow-Bold.ttf', BARLOW_BOLD_TTF);
  doc.addFont('Barlow-Bold.ttf', 'Barlow', 'bold');
  doc.addFileToVFS('Barlow-ExtraBold.ttf', BARLOW_EXTRABOLD_TTF);
  doc.addFont('Barlow-ExtraBold.ttf', 'BarlowXB', 'normal');

  // Draw tracked text at an exact baseline (x, y in pt from the source artwork).
  const put = (text, x, y, { font = 'Barlow', style = 'normal', size, color = NAVY, tc = 0, align } = {}) => {
    if (text === undefined || text === null || text === '') return;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setCharSpace(tc);
    doc.text(String(text), x, y, align ? { align } : undefined);
    doc.setCharSpace(0);
  };

  // Width-aware wrap honouring the active letter-spacing (Barlow Regular 23.809pt).
  const trackedWidth = (s, size, tc) => doc.getStringUnitWidth(s) * size + Math.max(0, s.length - 1) * tc;
  const wrapTracked = (text, size, tc, maxW, maxLines) => {
    const lines = [];
    let cur = '';
    for (const w of String(text).split(/\s+/).filter(Boolean)) {
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || trackedWidth(t, size, tc) <= maxW) cur = t;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
  };

  // ---- Header subtitle: "Trial kit for <REP>" (Barlow Regular 22.619pt) ----
  put(`Trial kit for ${shipment.snapRepName || ''}`, 259.23, 97.35, { size: 22.619, tc: 1.416 });

  // ---- SPOC name (Barlow ExtraBold 24.217pt) ----
  put(shipment.snapAcceptingName, 46.0, 223.39, { font: 'BarlowXB', size: 24.217 });

  // ---- Address (≤3 lines) + City + State, packed contiguously into the 5 slots ----
  const ADDR_SIZE = 23.809, ADDR_TC = 1.536, ADDR_X = 43.57;
  const SLOT_Y0 = 259.88, SLOT_STEP = 32.66;   // baselines: 259.88, 292.54, 325.19, 357.85, 390.51
  const addrLines = shipment.snapAddress
    ? wrapTracked(shipment.snapAddress, ADDR_SIZE, ADDR_TC, 640, 3)
    : [];
  const block = [...addrLines];
  if (shipment.snapCity) block.push(shipment.snapCity);
  if (shipment.snapState) block.push(shipment.snapState);
  block.slice(0, 5).forEach((line, i) => {
    put(line, ADDR_X, SLOT_Y0 + i * SLOT_STEP, { size: ADDR_SIZE, tc: ADDR_TC });
  });

  // ---- PIN / MOB line (Barlow Bold 18.584pt) — labels & divider at fixed x ----
  const PM = { size: 18.584, font: 'Barlow', style: 'bold', tc: 0.932 };
  const PM_Y = 433.58;
  put('PIN CODE', 43.57, PM_Y, PM);
  put(shipment.snapPinCode, 137.38, PM_Y, PM);
  put('|', 239.02, PM_Y, PM);
  put('MOB', 299.47, PM_Y, PM);
  put(shipment.snapAcceptingPhone, 352.46, PM_Y, PM);

  // ---- CONTENTS rows — every item with qty > 0 renders, packed top-down ----
  // The blank template has the rows erased. The six standard items are composited from
  // their original label tiles; anything else (admin-added items) is drawn as live Barlow
  // text fitted to the tile typography, so a custom item can neither vanish from the slip
  // nor steal a standard item's artwork. Badges (navy/orange, alternating by row position)
  // and QTY numbers are drawn live for both kinds.
  const QTY_X = 1207.7, QTY_SIZE = 17.02;
  const items = (shipment.items || []).filter((i) => Number(i.quantity || 0) > 0);
  const nameLower = (s) => String(s || '').toLowerCase();
  const pad2 = (n) => String(n).padStart(2, '0');

  // Canonical artwork rows in slip order. Each tile is claimed by at most ONE item —
  // an exact canonical name wins first, then a legacy keyword variant — so a custom
  // item like "School Banners Kit" can't steal the Banners artwork from the real
  // "Banners" row; unclaimed items fall through to text.
  const CONTENT_ROWS = [
    { tile: 'vol',  exact: 'volunteer tshirts',    match: (n) => n.includes('volunteer') || n.includes('shirt') },
    { tile: 'ban',  exact: 'banners',              match: (n) => n.includes('banner') },
    { tile: 'mat',  exact: 'matchsheet',           match: (n) => n.includes('matchsheet') },
    { tile: 'sco',  exact: 'scout dockets',        match: (n) => n.includes('scout') },
    { tile: 'bibo', exact: 'numbered bibs orange', match: (n) => n.includes('bib') && n.includes('orange') },
    { tile: 'bibg', exact: 'numbered bibs green',  match: (n) => n.includes('bib') && n.includes('green') },
  ];

  // Original slot geometry from the source art (pt). Surviving rows fill these from the
  // top; the all-six case reproduces the original layout pixel-for-pixel.
  const SLOT_CENTERS = [410.0, 468.5, 522.75, 579.0, 640.75, 706.0];
  const DIVIDER_YS   = [437.75, 494.25, 551.0, 607.25, 675.25];
  const LABEL_X = 690, LABEL_W = 320, LABEL_HALF = 25;   // label tile bounds (pt)
  const BADGE_CX = 1207.5, BADGE_HALF = 20;               // badge tile centre / half-size (pt)
  const DIV_X0 = 675, DIV_X1 = 1253;                      // divider rule extent in the source art

  // Text-row typography, measured from the tile pixels: the artwork weight (~Barlow
  // Medium) isn't embedded, but Bold at these metrics matches the measured tile text
  // widths within 1.6pt. x-offset and baseline are the tile averages.
  const ITEM_TXT = { x: LABEL_X + 29.8, base: 12.25, size: 15.1, tc: 1.35 };
  const ITEM_TXT_MAXW = BADGE_CX - BADGE_HALF - ITEM_TXT.x - 15;

  const claimed = new Set();
  const claims = new Map();
  CONTENT_ROWS.forEach((r) => {
    const it = items.find((i) => !claimed.has(i) && nameLower(i.name).trim() === r.exact);
    if (it) { claimed.add(it); claims.set(r.tile, it); }
  });
  CONTENT_ROWS.forEach((r) => {
    if (claims.has(r.tile)) return;
    const it = items.find((i) => !claimed.has(i) && r.match(nameLower(i.name)));
    if (it) { claimed.add(it); claims.set(r.tile, it); }
  });
  const tiled = CONTENT_ROWS
    .filter((r) => claims.has(r.tile))
    .map((r) => ({ tile: r.tile, qty: Number(claims.get(r.tile).quantity) }));
  const present = [
    ...tiled,
    ...items.filter((i) => !claimed.has(i))
      .map((i) => ({ text: String(i.name || '').trim(), qty: Number(i.quantity) })),
  ];

  // Six rows or fewer sit in the original slots; a surplus respaces the same vertical
  // span evenly and scales rows down proportionally so nothing overflows the template.
  const rowCount = present.length;
  const rowScale = rowCount <= 6 ? 1 : 6 / rowCount;
  const centers = rowCount <= 6
    ? SLOT_CENTERS
    : present.map((_, k) => 410.0 + (k * (706.0 - 410.0)) / (rowCount - 1));

  present.forEach((r, k) => {
    const cy = centers[k];
    if (r.tile) {
      // Label tile, left-aligned, scaled about the row centre.
      doc.addImage(SLIP_ITEM_TILES[r.tile], 'PNG',
        LABEL_X, cy - LABEL_HALF * rowScale, LABEL_W * rowScale, LABEL_HALF * 2 * rowScale);
    } else {
      // Custom item: live text, shrunk to fit the label span if the name runs long.
      doc.setFont('Barlow', 'bold');
      let size = ITEM_TXT.size * rowScale;
      const tc = ITEM_TXT.tc * rowScale;
      while (size > 9 && trackedWidth(r.text, size, tc) > ITEM_TXT_MAXW) size -= 0.5;
      put(r.text, ITEM_TXT.x, cy + ITEM_TXT.base * rowScale,
        { font: 'Barlow', style: 'bold', size, tc });
    }
    // Badge (colour alternates navy/orange by row position), kept centred as it scales.
    const badge = k % 2 === 0 ? SLIP_BADGE_TILES.navy : SLIP_BADGE_TILES.orange;
    doc.addImage(badge, 'PNG',
      BADGE_CX - BADGE_HALF * rowScale, cy - BADGE_HALF * rowScale,
      BADGE_HALF * 2 * rowScale, BADGE_HALF * 2 * rowScale);
    // QTY number — baseline = slot centre + half cap-height (6.84pt @17.02).
    put(pad2(r.qty), QTY_X, cy + 6.84 * rowScale,
      { font: 'BarlowXB', size: QTY_SIZE * rowScale, color: QTY_COLOR, align: 'center' });
    // Divider below every row except the last present one (matches the source rule).
    if (k < rowCount - 1) {
      doc.setDrawColor(228, 227, 222);
      doc.setLineWidth(0.75);
      const dy = rowCount <= 6 ? DIVIDER_YS[k] : (centers[k] + centers[k + 1]) / 2;
      doc.line(DIV_X0, dy, DIV_X1, dy);
    }
  });

  // ---- REP logo, fitted (aspect-preserved) into the <REP LOGO SPACE> box ----
  if (logoDataURL) {
    try {
      const props = doc.getImageProperties(logoDataURL);
      const boxX = 319.3, boxY = 515.6, boxW = 204.7, boxH = 204.7;
      const scale = Math.min(boxW / props.width, boxH / props.height);
      const w = props.width * scale, h = props.height * scale;
      doc.addImage(logoDataURL, props.fileType || 'PNG',
        boxX + (boxW - w) / 2, boxY + (boxH - h) / 2, w, h);
    } catch {
      /* logo optional — skip on any decode error */
    }
  }

  const city = (shipment.snapCity || 'Shipment').trim();
  doc.save(`Package Slip - ${city}.pdf`);
}

const cardSx = { bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 2.5, mb: 2 };
const labelSx = { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' };
const secHeaderSx = { fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 };

const STAT_COLORS = {
  grey:    { bg: '#f3f4f6', fg: '#5B6270' },
  warning: { bg: '#fef3c7', fg: '#d97706' },
  info:    { bg: '#dbeafe', fg: '#2563eb' },
  success: { bg: '#dcfce7', fg: '#16a34a' },
};

function StatCard({ icon, label, value, color, active, onClick }) {
  const c = STAT_COLORS[color] || STAT_COLORS.grey;
  return (
    <Box onClick={onClick}
      sx={{
        bgcolor: '#fff',
        border: active ? `2px solid ${c.fg}` : '1px solid #e5e7eb',
        borderRadius: '14px',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        boxShadow: active ? `0 2px 10px ${c.fg}33` : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        '&:hover': onClick ? { borderColor: c.fg, boxShadow: `0 2px 10px ${c.fg}33`, transform: 'translateY(-1px)' } : {},
      }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function AddressCard({ assignment }) {
  if (!assignment) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '10px', p: 2, color: '#5A6B82', fontSize: '0.82rem', textAlign: 'center' }}>
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
      <TextField size="small" value={item.name}
        slotProps={{ input: { readOnly: true } }}
        sx={{ '& .MuiInputBase-root': { bgcolor: '#fff', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' } }} />
      <TextField size="small" type="number" value={item.quantity} placeholder="Qty"
        onChange={e => onChange(index, 'quantity', sanitizeQuantityInput(e.target.value))}
        onBlur={e => onChange(index, 'quantity', normalizeQuantity(e.target.value))}
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
  const { canEdit, isSuper } = useGrants();
  const canEditCourier = canEdit('courier');
  const [shipments, setShipments] = useState([]);
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  // new/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // updatedAt of the shipment as loaded into the edit form — the optimistic
  // lock token sent back on save.
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState('');
  const [fRepId, setFRepId] = useState('');
  const [fAsgId, setFAsgId] = useState('');
  const [fItems, setFItems] = useState([]);
  const [fNotes, setFNotes] = useState('');

  // dispatch modal
  const [dispOpen, setDispOpen] = useState(false);
  const [dispId, setDispId] = useState(null);
  const [dispCourier, setDispCourier] = useState('');
  const [dispCourierOther, setDispCourierOther] = useState('');
  const [dispAwb, setDispAwb] = useState('');
  const [dispNotes, setDispNotes] = useState('');
  const [dispTshirtReason, setDispTshirtReason] = useState('');

  // delivery modal
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryId, setDeliveryId] = useState(null);
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState('');
  const [deliveryWhatsapp, setDeliveryWhatsapp] = useState(false);
  const [deliveryPhone, setDeliveryPhone] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryImage, setDeliveryImage] = useState('');

  // return confirm
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnId, setReturnId] = useState(null);
  const [returnNote, setReturnNote] = useState('');

  // admin-configured courier items + "+ Add Item" dropdown anchor
  const [adminItems, setAdminItems] = useState([]);
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);

  const selectedRep = reps.find(r => r.id === fRepId) || null;
  const selectedAsg = selectedRep?.cityAssignments?.find(a => a.id === fAsgId) || null;

  const viewingDeleted = filterStatus === 'deleted';

  async function loadData({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const [repsData, shipmentsData] = await Promise.all([
        repAPI.getAll({ limit: 100 }),
        courierAPI.getAll(viewingDeleted ? { deleted: true } : {}),
      ]);
      const repList = Array.isArray(repsData)
        ? repsData
        : (repsData.reps || repsData.results || []);
      setReps(repList);
      setShipments(Array.isArray(shipmentsData) ? shipmentsData : (shipmentsData.results || []));
      setAdminItems(getCourierItems());
    } catch {
      if (!silent) setError('Failed to load data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Reload when toggling between the live list and the Deleted (super-admin) view,
  // since those are two different server queries.
  useEffect(() => { loadData(); }, [viewingDeleted]); // eslint-disable-line react-hooks/exhaustive-deps
  useRefetchOnFocus(() => loadData({ silent: true }));

  // Resolve the shipment's REP logo (via assignmentId → rep) then render the slip PDF.
  async function handleDownload(s) {
    let repLogoUrl = '';
    for (const r of reps) {
      if ((r.cityAssignments || []).some(a => a.id === s.assignmentId)) {
        repLogoUrl = r.repLogoUrl || '';
        break;
      }
    }
    const logoData = await urlToDataURL(repLogoUrl);
    await downloadPDF(s, logoData);
  }

  const stats = useMemo(() => ({
    Draft: shipments.filter(s => s.status === 'Draft').length,
    Dispatched: shipments.filter(s => s.status === 'Dispatched').length,
    'In Transit': shipments.filter(s => s.status === 'In Transit').length,
    Delivered: shipments.filter(s => s.status === 'Delivered').length,
  }), [shipments]);

  const filtered = useMemo(() => shipments.filter(s => {
    // In the Deleted view the server already returns only soft-deleted rows; skip the
    // active/past/status filters and just honour the search box.
    if (!viewingDeleted) {
      if (filterStatus === 'active' && !ACTIVE_STATUSES.includes(s.status)) return false;
      if (filterStatus === 'past' && !PAST_STATUSES.includes(s.status)) return false;
      if (!['all', 'active', 'past'].includes(filterStatus) && s.status !== filterStatus) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return [s.refNumber, s.snapRepName, s.snapCity, s.trackingNumber || ''].join(' ').toLowerCase().includes(q);
    }
    return true;
  }), [shipments, filterStatus, search, viewingDeleted]);

  async function handleDeleteShipment(s) {
    const isDraft = s.status === 'Draft';
    const msg = isDraft
      ? `Delete draft shipment ${s.refNumber}?\n\nIt will be archived (not destroyed) — a super admin can restore it from the Deleted view.`
      : `Delete shipment ${s.refNumber} (${s.status})?\n\nIt will be archived (not destroyed) and can be restored from the Deleted view.`;
    if (!window.confirm(msg)) return;
    try {
      await courierAPI.delete(s.id);
      setShipments(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      setError(e.message || 'Failed to delete shipment.');
    }
  }

  async function handleRestoreShipment(s) {
    try {
      await courierAPI.restore(s.id);
      setShipments(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      setError(e.message || 'Failed to restore shipment.');
    }
  }

  function openNew() {
    setEditingId(null); setFRepId(''); setFAsgId(''); setFItems([]); setFNotes(''); setError('');
    // Clear the lock token too. A new shipment has no version to check against,
    // and leaving the previous edit's token here means any future code path
    // that reads it while creating would be checking against a different row.
    setLoadedUpdatedAt('');
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
    // Remember the version this form was opened against. Saving sends it back
    // so the server can refuse a write that would erase someone else's edit.
    setLoadedUpdatedAt(s.updatedAt || '');
    setModalOpen(true);
  }

  function onRepChange(repId) { setFRepId(repId); setFAsgId(''); }

  // Add every master-list item not already on the shipment (convenience for the
  // common case of sending the full standard set).
  function addAllItems() {
    const existing = new Set(fItems.map(i => i.name));
    const toAdd = adminItems.filter(a => !existing.has(a.name)).map(a => makeCourierItem(a.name));
    if (toAdd.length) setFItems(prev => [...prev, ...toAdd]);
  }

  function addAdminItem(name) {
    setFItems(prev => [...prev, makeCourierItem(name)]);
    setAddMenuAnchor(null);
  }

  const availableAdminItems = useMemo(() => {
    const existing = new Set(fItems.map(i => i.name));
    return adminItems.filter(a => !existing.has(a.name));
  }, [adminItems, fItems]);

  function changeItem(index, field, value) {
    setFItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function deleteItem(index) { setFItems(prev => prev.filter((_, i) => i !== index)); }

  async function saveShipment() {
    // Updates only send notes/items, so they must not require a live
    // assignment — a shipment whose assignment was deleted is still editable.
    if (!canSaveShipment({ editingId, assignmentId: fAsgId, items: fItems })) return;
    setSaving(true);
    setError('');
    // A quantity box left empty mid-edit holds '' — coerce here so the API
    // contract stays numeric no matter what the box was showing.
    const itemsForSave = normalizeItemsForSave(fItems);
    try {
      if (editingId) {
        const updated = await courierAPI.update(editingId, {
          notes: fNotes,
          items: itemsForSave,
          expectedUpdatedAt: loadedUpdatedAt,
        });
        setShipments(prev => prev.map(s => s.id === editingId ? updated : s));
      } else {
        const created = await courierAPI.create({
          assignmentId: fAsgId,
          notes: fNotes,
          items: itemsForSave.map((it, i) => ({ ...it, order: i })),
        });
        setShipments(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (e) {
      // A stale-write refusal has to leave the user somewhere they can act.
      // Without this the form keeps the token it loaded with, so every retry
      // hits the same 409 and the only way out is closing the dialog — the
      // save is refused correctly and the user is stranded, which is its own
      // defect. The server returns currentUpdatedAt precisely so the client
      // can recover; the API layer already carries it on err.response.data.
      const code = e?.response?.data?.code;
      if (code === 'stale_write' || code === 'missing_version_token') {
        try {
          const fresh = await courierAPI.getById(editingId);
          setShipments(prev => prev.map(s => s.id === editingId ? fresh : s));
          setFItems((fresh.items || []).map(i => ({ ...i })));
          setFNotes(fresh.notes || '');
          setLoadedUpdatedAt(fresh.updatedAt || '');
          setError(
            'Someone else changed this shipment while you had it open. Their '
            + 'version is now loaded above — your unsaved changes were not '
            + 'applied. Redo them and save again.'
          );
        } catch {
          // Even the reload failed; say what is known rather than nothing.
          setError(
            (e.message || 'Save failed.')
            + ' Reloading the shipment also failed — close and reopen it.'
          );
        }
      } else {
        setError(e.message || 'Save failed.');
      }
    } finally {
      setSaving(false);
    }
  }

  function openDispatch(id) {
    setDispId(id); setDispCourier(''); setDispCourierOther(''); setDispAwb(''); setDispNotes('');
    const shipment = shipments.find(s => s.id === id);
    const existing = (shipment?.items || []).find(
      i => i.name === TSHIRT_ITEM_NAME && Number(i.quantity || 0) === 0
    );
    setDispTshirtReason(existing?.zeroReason || '');
    setError('');
    setDispOpen(true);
  }

  const dispShipment = useMemo(() => shipments.find(s => s.id === dispId) || null, [shipments, dispId]);
  const dispTshirtZero = useMemo(
    () => (dispShipment?.items || []).some(i => i.name === TSHIRT_ITEM_NAME && Number(i.quantity || 0) === 0),
    [dispShipment]
  );

  async function saveDispatch() {
    const finalCourier = dispCourier === 'Other' ? dispCourierOther.trim() : dispCourier;
    if (!finalCourier || !dispAwb) return;
    if (dispTshirtZero && !dispTshirtReason) {
      setError('Select a Tshirt status before dispatching.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await courierAPI.dispatch(dispId, {
        courierProvider: finalCourier,
        trackingNumber: dispAwb,
        dispatchNotes: dispNotes,
        tshirtZeroReason: dispTshirtZero ? dispTshirtReason : '',
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
    setDeliveryWhatsapp(false); setDeliveryPhone(false); setDeliveryNotes('');
    setDeliveryImage(''); setError('');
    setDeliveryOpen(true);
  }

  function onDeliveryImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError('Image too large (max 4MB).'); return; }
    const reader = new FileReader();
    reader.onload = ev => setDeliveryImage(ev.target.result);
    reader.readAsDataURL(file);
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
        deliveryImageUrl: deliveryImage,
      });
      setShipments(prev => prev.map(s => s.id === deliveryId ? updated : s));
      setDeliveryOpen(false);
    } catch (e) {
      setError(e.message || 'Failed to mark delivered.');
    } finally {
      setSaving(false);
    }
  }

  async function saveReturn() {
    setSaving(true);
    setError('');
    try {
      const updated = await courierAPI.return(returnId, returnNote);
      setShipments(prev => prev.map(s => s.id === returnId ? updated : s));
      setReturnOpen(false);
      setReturnNote('');
    } catch (e) {
      setError(e.message || 'Failed to mark as returned.');
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
        {canEditCourier && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
            sx={{ bgcolor: '#FDE68A', color: '#1e293b', fontWeight: 700, boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
            New Shipment
          </Button>
        )}
      </Stack>

      {error && !modalOpen && !dispOpen && !deliveryOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        {[
          { icon: <BoxIcon fontSize="small" />, label: 'Draft', key: 'Draft', color: 'grey' },
          { icon: <ShipIcon fontSize="small" />, label: 'Dispatched', key: 'Dispatched', color: 'warning' },
          { icon: <TransitIcon fontSize="small" />, label: 'In Transit', key: 'In Transit', color: 'info' },
          { icon: <CheckIcon fontSize="small" />, label: 'Delivered', key: 'Delivered', color: 'success' },
        ].map(card => (
          <StatCard key={card.key}
            icon={card.icon} label={card.label} value={stats[card.key]} color={card.color}
            active={filterStatus === card.key}
            onClick={() => setFilterStatus(prev => prev === card.key ? 'active' : card.key)} />
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="center">
          <TextField size="small" placeholder="Search by ID, REP, city, AWB…" value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#5A6B82' }} /></InputAdornment> } }}
            sx={{ flex: 1, minWidth: 220 }} />
          <Stack direction="row" gap={1} flexWrap="wrap">
            {[...STATUS_FILTERS, ...(isSuper ? ['deleted'] : [])].map(s => (
              <Chip key={s} label={FILTER_LABELS[s] || s} size="small"
                onClick={() => setFilterStatus(s)}
                variant={filterStatus === s ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, cursor: 'pointer',
                  ...(filterStatus === s
                    ? { bgcolor: s === 'deleted' ? '#b91c1c' : '#5B63D3', color: '#fff', borderColor: s === 'deleted' ? '#b91c1c' : '#5B63D3' }
                    : { color: s === 'deleted' ? '#b91c1c' : '#64748b' }) }} />
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f7' }}>
              {['', 'REP', 'City', 'Trial Date', 'Items', 'AWB', 'Courier', 'Dispatch Date', 'Status', ''].map((h, i) => (
                <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', py: 1.25 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {!filtered.length ? (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: '#5A6B82' }}>
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
                    <Typography component="span" sx={{ fontSize: '0.75rem', color: '#5A6B82' }}>
                      ({(s.items || []).reduce((a, b) => a + Number(b.quantity || 0), 0)} qty)
                    </Typography>
                    {(s.items || []).some(i => i.isCustom) && (
                      <Chip label="custom" size="small" sx={{ ml: 0.5, fontSize: '0.65rem', height: 16, bgcolor: '#fef9c3', color: '#92400e' }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>
                    {s.trackingNumber ? (() => {
                      const url = getTrackingUrl(s.courierProvider, s.trackingNumber);
                      return url ? (
                        <Tooltip title={`Track on ${s.courierProvider}`}>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#3B82F6', textDecoration: 'none', borderBottom: '1px dashed #3B82F6' }}>
                            {s.trackingNumber}
                          </a>
                        </Tooltip>
                      ) : <span>{s.trackingNumber}</span>;
                    })() : <Typography component="span" sx={{ color: '#cbd5e1' }}>—</Typography>}
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
                      {viewingDeleted ? (
                        <>
                          <Tooltip title="Download packing slip PDF">
                            <IconButton size="small" onClick={() => handleDownload(s)} sx={{ color: '#5B63D3' }}>
                              <PdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Button size="small" variant="contained" color="success" onClick={() => handleRestoreShipment(s)}
                            sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>Restore</Button>
                        </>
                      ) : (<>
                      {s.status === 'Draft' && (
                        <>
                          <Tooltip title="Download packing slip PDF">
                            <IconButton size="small" onClick={() => handleDownload(s)} sx={{ color: '#5B63D3' }}>
                              <PdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canEditCourier && (
                            <>
                              <Button size="small" variant="outlined" onClick={() => openEdit(s)}
                                sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>Edit</Button>
                              <Button size="small" variant="contained" onClick={() => openDispatch(s.id)}
                                sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto', bgcolor: '#FDE68A', color: '#1e293b', boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
                                Dispatch
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {['Dispatched', 'In Transit'].includes(s.status) && (
                        <>
                          <Tooltip title="Download dispatch PDF">
                            <IconButton size="small" onClick={() => handleDownload(s)} sx={{ color: '#5B63D3' }}>
                              <PdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canEditCourier && (
                            <>
                              <Button size="small" variant="outlined" color="success" onClick={() => openDelivery(s.id)}
                                sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>
                                Delivered
                              </Button>
                              <Button size="small" variant="outlined" color="error"
                                onClick={() => { setReturnId(s.id); setReturnNote(''); setReturnOpen(true); }}
                                sx={{ fontSize: '0.72rem', py: 0.3, px: 1, minWidth: 'auto' }}>
                                Returned
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {s.status === 'Delivered' && (
                        <Tooltip title="Download dispatch PDF">
                          <IconButton size="small" onClick={() => handleDownload(s)} sx={{ color: '#5B63D3' }}>
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* One delete control per row, for every status. A draft is
                          deletable by anyone who can edit courier; anything already
                          dispatched is a super admin call. Deletion is a soft delete
                          either way — the row moves to the Deleted view and can be
                          restored, which is what handleDeleteShipment's confirm says. */}
                      {canDeleteShipment({ isSuper, canEditCourier, status: s.status }) && (
                        <Tooltip title={deleteShipmentTooltip(s.status)}>
                          <IconButton size="small" onClick={() => handleDeleteShipment(s)} sx={{ color: '#ef4444' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      </>)}
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
                  <MenuItem value="" disabled sx={{ color: '#5A6B82' }}>— Select REP —</MenuItem>
                  {reps.map(r => <MenuItem key={r.id} value={r.id}>{r.repName}</MenuItem>)}
                </TextField>
              </Box>
              <Box>
                <Typography sx={labelSx}>City <span style={{ color: '#ef4444' }}>*</span></Typography>
                <TextField select fullWidth size="small" value={fAsgId} disabled={!selectedRep || !!editingId}
                  onChange={e => setFAsgId(e.target.value)}>
                  <MenuItem value="" disabled sx={{ color: '#5A6B82' }}>
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
                <Button size="small" variant="outlined" onClick={addAllItems}
                  disabled={!adminItems.length}
                  sx={{ fontSize: '0.75rem', py: 0.5, borderColor: '#22c55e', color: '#15803d', '&:hover': { bgcolor: '#f0fdf4', borderColor: '#16a34a' } }}>
                  + Add All Items
                </Button>
                <Button size="small" variant="outlined"
                  onClick={e => setAddMenuAnchor(e.currentTarget)}
                  disabled={!adminItems.length}
                  sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  + Add Item
                </Button>
                <Menu
                  anchorEl={addMenuAnchor}
                  open={Boolean(addMenuAnchor)}
                  onClose={() => setAddMenuAnchor(null)}
                  slotProps={{ paper: { sx: { maxHeight: 320, minWidth: 220 } } }}
                >
                  {!adminItems.length ? (
                    <MenuItem disabled sx={{ fontSize: '0.82rem', color: '#5A6B82' }}>
                      No items configured by admin
                    </MenuItem>
                  ) : !availableAdminItems.length ? (
                    <MenuItem disabled sx={{ fontSize: '0.82rem', color: '#5A6B82' }}>
                      All items already added
                    </MenuItem>
                  ) : availableAdminItems.map(a => (
                    <MenuItem key={a.id} onClick={() => addAdminItem(a.name)}
                      sx={{ fontSize: '0.85rem' }}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Menu>
              </Stack>
            </Stack>

            {!fItems.length ? (
              <Box sx={{ bgcolor: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '10px', p: 3, textAlign: 'center', color: '#5A6B82', fontSize: '0.82rem' }}>
                {adminItems.length
                  ? 'No items yet — click "Add All Items" or pick from "+ Add Item"'
                  : 'No courier items configured yet — add them in Admin → Courier Items first.'}
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px auto 1fr 36px', gap: 1, px: 1, mb: 0.5 }}>
                  {['Item Name', 'Qty', 'Custom?', 'Remarks / Production Status', ''].map(h => (
                    <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
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
                <MenuItem value="" disabled sx={{ color: '#5A6B82' }}>— Select courier —</MenuItem>
                {COURIERS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              {dispCourier === 'Other' && (
                <TextField
                  fullWidth size="small" sx={{ mt: 1.25 }}
                  value={dispCourierOther}
                  onChange={e => setDispCourierOther(e.target.value)}
                  placeholder="Enter courier company name"
                  autoFocus
                />
              )}
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
            {dispTshirtZero && (
              <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', p: 1.5 }}>
                <Typography sx={{ ...labelSx, color: '#92400e' }}>
                  Tshirt status <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#92400e', mb: 1 }}>
                  Volunteer Tshirts has qty 0 on this shipment. Pick a reason — it gets printed on the dispatch slip when applicable.
                </Typography>
                <TextField select fullWidth size="small" value={dispTshirtReason}
                  onChange={e => setDispTshirtReason(e.target.value)}>
                  <MenuItem value="" disabled sx={{ color: '#5A6B82', fontSize: '0.82rem' }}>— Select reason —</MenuItem>
                  {ZERO_REASON_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.82rem' }}>{o.label}</MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDispOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" onClick={saveDispatch}
            disabled={
              saving
              || !dispAwb
              || !dispCourier
              || (dispCourier === 'Other' && !dispCourierOther.trim())
              || (dispTshirtZero && !dispTshirtReason)
            }
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
              <Typography sx={labelSx}>Proof of Delivery (image)</Typography>
              {deliveryImage ? (
                <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  <Box component="img" src={deliveryImage} alt="proof"
                    sx={{ display: 'block', maxWidth: '100%', maxHeight: 220 }} />
                  <IconButton size="small" onClick={() => setDeliveryImage('')}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button variant="outlined" component="label"
                  sx={{ fontSize: '0.8rem', textTransform: 'none' }}>
                  Upload screenshot / photo
                  <input type="file" accept="image/*" hidden onChange={onDeliveryImageChange} />
                </Button>
              )}
              <Typography sx={{ fontSize: '0.72rem', color: '#5A6B82', mt: 0.5 }}>
                WhatsApp confirmation screenshot or photo of received package. Max 4MB.
              </Typography>
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

      {/* RETURN CONFIRM DIALOG */}
      <Dialog open={returnOpen} onClose={() => setReturnOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid #e5e7eb' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Mark as Returned</Typography>
            <IconButton size="small" onClick={() => setReturnOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 2 }}>
            This marks the shipment as returned by the courier. The shipment can be re-dispatched by creating a new shipment.
          </Typography>
          <Box>
            <Typography sx={labelSx}>Note (optional)</Typography>
            <TextField fullWidth size="small" multiline minRows={2} value={returnNote}
              onChange={e => setReturnNote(e.target.value)} placeholder="Reason for return, courier note, etc." />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setReturnOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={saveReturn} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Mark Returned'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
