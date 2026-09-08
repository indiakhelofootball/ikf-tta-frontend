import jsPDF from 'jspdf';
import {
  SLIP_PAGE_PT, SLIP_BLANK_PNG, SLIP_ITEM_TILES, SLIP_BADGE_TILES,
  BARLOW_REGULAR_TTF, BARLOW_BOLD_TTF, BARLOW_EXTRABOLD_TTF,
} from './courierSlipAssets';
import { fitAddressBlock, fitBadgeNumber } from './courierSlipText';
import { assignSlipRows } from './courierSlipRows';

export function buildSlipDoc(shipment, logoDataURL) {
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

  // Width in the CURRENTLY SELECTED font, honouring letter-spacing. The wrap points
  // depend on which font is active when this is called, so nothing may set a font
  // between here and the address block without changing where lines break.
  const trackedWidth = (s, size, tc) => doc.getStringUnitWidth(s) * size + Math.max(0, s.length - 1) * tc;

  // ---- Header subtitle: "Trial kit for <REP>" (Barlow Regular 22.619pt) ----
  put(`Trial kit for ${shipment.snapRepName || ''}`, 259.23, 97.35, { size: 22.619, tc: 1.416 });

  // ---- SPOC name (Barlow ExtraBold 24.217pt) ----
  put(shipment.snapAcceptingName, 46.0, 223.39, { font: 'BarlowXB', size: 24.217 });

  // ---- Street / sub-area / city / district / state, packed into the 5 slots ----
  // Sub-area and district are captured on the REP city assignment for the courier's
  // benefit and used to be dropped here. The block shrinks a long address to fit
  // rather than cutting a word off the end of it.
  const ADDR_SIZE = 23.809, ADDR_TC = 1.536, ADDR_X = 43.57;
  const SLOT_Y0 = 259.88, SLOT_STEP = 32.66;   // baselines: 259.88, 292.54, 325.19, 357.85, 390.51
  const addr = fitAddressBlock({
    address: shipment.snapAddress,
    subArea: shipment.snapSubArea,
    city: shipment.snapCity,
    district: shipment.snapDistrict,
    state: shipment.snapState,
    size: ADDR_SIZE, tc: ADDR_TC, maxW: 640, measure: trackedWidth,
  });
  addr.lines.forEach((line, i) => {
    put(line, ADDR_X, SLOT_Y0 + i * SLOT_STEP, { size: addr.size, tc: addr.tc });
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
  const pad2 = (n) => String(n).padStart(2, '0');

  // Which items claim the six artwork tiles lives in ./courierSlipRows, so the
  // rule can be tested without jsPDF. A tile has its word baked into the image,
  // so only an exactly-named item may claim one.


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
  //
  // `x` is an INSET FROM LABEL_X, not an absolute position, and it has to scale
  // with the row like everything else here. The tile image is drawn at LABEL_X
  // with width LABEL_W * rowScale, so the text inside the artwork moves left as
  // rows compress — while an absolute x for the live text did not. Measured on
  // three generated slips: at 6 rows both sit at 720.5pt and agree exactly, at
  // 7 rows the tiles move to 716.25 and the text stayed at 720.5, and at 10 rows
  // the gap reaches 11.7pt. Six rows is the common case, which is why an
  // admin-added item only looked misaligned on a long shipment.
  const ITEM_TXT = { inset: 29.8, base: 12.25, size: 15.1, tc: 1.35 };

  const present = assignSlipRows(items);


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
      // The inset scales with the row so this lines up with the tile artwork at
      // every row count, not only at six.
      doc.setFont('Barlow', 'bold');
      const tx = LABEL_X + ITEM_TXT.inset * rowScale;
      // Recomputed per row: both ends move as the row scales — the text start
      // with the inset above, the badge with BADGE_HALF * rowScale below.
      const maxw = (BADGE_CX - BADGE_HALF * rowScale) - tx - 15 * rowScale;
      let size = ITEM_TXT.size * rowScale;
      const tc = ITEM_TXT.tc * rowScale;
      while (size > 9 && trackedWidth(r.text, size, tc) > maxw) size -= 0.5;
      put(r.text, tx, cy + ITEM_TXT.base * rowScale,
        { font: 'Barlow', style: 'bold', size, tc });
    }
    // Badge (colour alternates navy/orange by row position), kept centred as it scales.
    const badge = k % 2 === 0 ? SLIP_BADGE_TILES.navy : SLIP_BADGE_TILES.orange;
    doc.addImage(badge, 'PNG',
      BADGE_CX - BADGE_HALF * rowScale, cy - BADGE_HALF * rowScale,
      BADGE_HALF * 2 * rowScale, BADGE_HALF * 2 * rowScale);
    // QTY number, shrunk only if it would print over the edges of its badge. Anything
    // up to four digits fits the 40pt tile and keeps QTY_SIZE * rowScale exactly;
    // five digits used to hang 2.3pt off each side, six digits 5.5pt.
    const qtyText = pad2(r.qty);
    doc.setFont('BarlowXB', 'normal');   // trackedWidth measures the ACTIVE font
    const qtySize = fitBadgeNumber(qtyText, QTY_SIZE * rowScale,
      BADGE_HALF * 2 * rowScale, 2 * rowScale, trackedWidth);
    // Baseline = slot centre + half cap-height (6.84pt @17.02), scaled with the size
    // actually used so a shrunken number stays vertically centred in the badge.
    put(qtyText, QTY_X, cy + 6.84 * (qtySize / QTY_SIZE),
      { font: 'BarlowXB', size: qtySize, color: QTY_COLOR, align: 'center' });
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

  // The operator's only warning that the printed address is not the whole address —
  // the slip itself has nowhere to say so without altering the artwork.
  return { doc, addressOverflow: addr.overflow, addressDropped: addr.dropped };
}

// The page's download entry point. Kept here so the whole slip build is one
// importable unit: CourierManagementPage.jsx cannot be loaded under Jest or node.
export async function downloadSlipPdf(shipment, logoDataURL) {
  const { doc, addressOverflow, addressDropped } = buildSlipDoc(shipment, logoDataURL);
  const city = (shipment.snapCity || 'Shipment').trim();
  doc.save(`Package Slip - ${city}.pdf`);
  return { addressOverflow, addressDropped };
}
