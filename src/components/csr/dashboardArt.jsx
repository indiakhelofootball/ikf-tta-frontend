// src/components/csr/dashboardArt.jsx
// Ambient artwork for the CSR dashboard tiles. Six marks, one per tile, each
// drawn ENTIRELY in the tile's own ink.
//
// WHY THE INK IS A PROP AND NOT A CONSTANT
// In this product an ink means one fixed thing -- moss is money utilised,
// indigo is what was promised, teal is everything facing outward, ochre is
// waiting on you (see `inks` in src/styles/ttaTheme.js). A drawing that picks
// its own colour would put a green mountain on an amber tile, which is a
// category error rather than a style choice. So every stop, stroke and fill
// below is `ink` at some opacity, and nothing else.
//
// THEY SIT BEHIND THE FIGURE
// Values live between 0.05 and 0.22 alpha, baked into the artwork rather than
// left to the caller: the alpha relationships INSIDE a drawing (near ridge
// darker than far ridge, endpoint darker than its line) are what make it read
// as a shape, and a single wrapper opacity would flatten them.
//
// GRADIENT IDS
// Six illustrations on one page means six sets of gradient ids, and duplicate
// ids collide silently -- the last definition in the document wins and quietly
// repaints every earlier drawing. Each component therefore takes a unique
// prefix from useId(), stripped of the colons React puts in it.
import { useId } from 'react';
import { Box } from '@mui/material';

// Shared frame. Anchored to the bottom-right and cropped, so the artwork
// bleeds off that corner however the caller sizes its box.
const frame = (viewBox, par = 'xMaxYMax slice') => ({
  component: 'svg',
  viewBox,
  preserveAspectRatio: par,
  width: '100%',
  height: '100%',
  'aria-hidden': true,
  focusable: 'false',
  sx: { display: 'block' },
});

const useIds = (names) => {
  const raw = useId().replace(/:/g, '');
  return names.reduce((acc, n) => ({ ...acc, [n]: `csrArt-${n}-${raw}` }), {});
};

// ---------------------------------------------------------------------------
// SummitArt — delivery against promises. A near ridge and a far ridge with a
// flag planted on the near summit: a target reached, not a landscape.
// ---------------------------------------------------------------------------
export function SummitArt({ ink }) {
  const id = useIds(['far', 'near']);
  return (
    <Box {...frame('0 0 180 100')}>
      <defs>
        <linearGradient id={id.far} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.14" />
          <stop offset="1" stopColor={ink} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={id.near} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.22" />
          <stop offset="1" stopColor={ink} stopOpacity="0.07" />
        </linearGradient>
      </defs>
      {/* far ridge */}
      <path d="M8 100 L54 34 L84 74 L104 52 L146 100 Z" fill={`url(#${id.far})`} />
      {/* near summit, with a snowline notch so the peak reads as a peak */}
      <path d="M60 100 L112 22 L172 100 Z" fill={`url(#${id.near})`} />
      <path d="M100 40 L112 22 L124 40 L117 36 L110 42 L104 37 Z" fill={ink} fillOpacity="0.16" />
      {/* flag */}
      <rect x="111" y="4" width="1.6" height="20" fill={ink} fillOpacity="0.28" rx="0.8" />
      <path d="M113 5 L128 9.5 L113 14 Z" fill={ink} fillOpacity="0.24" />
      {/* No trees at the foot. Two of them were drawn here and read as loose
          spikes rather than scale -- at this alpha a conifer is a triangle, and
          a triangle beside a mountain is just a smaller mountain. */}
      <rect x="8" y="98.4" width="164" height="1.6" fill={ink} fillOpacity="0.13" />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// TrendArt — money utilised. A rising line over a soft area fill, with the
// last reading held as a marked point: spend to date, not a forecast.
// ---------------------------------------------------------------------------
export function TrendArt({ ink }) {
  const id = useIds(['area']);
  const line = 'M2 64 L24 58 L44 61 L64 46 L84 50 L106 32 L128 36 L152 14';
  return (
    <Box {...frame('0 0 160 80')}>
      <defs>
        <linearGradient id={id.area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.18" />
          <stop offset="1" stopColor={ink} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={`${line} L152 80 L2 80 Z`} fill={`url(#${id.area})`} />
      <path
        d={line}
        fill="none"
        stroke={ink}
        strokeOpacity="0.22"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="152" cy="14" r="7" fill={ink} fillOpacity="0.08" />
      <circle cx="152" cy="14" r="3.4" fill={ink} fillOpacity="0.22" />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// StackArt — grants. Layered sheets in a shallow stack: several contracts
// held together, the front one legible and the ones behind implied.
// ---------------------------------------------------------------------------
export function StackArt({ ink }) {
  const id = useIds(['front']);
  return (
    <Box {...frame('0 0 140 100')}>
      <defs>
        <linearGradient id={id.front} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.20" />
          <stop offset="1" stopColor={ink} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect x="20" y="10" width="92" height="72" rx="7" fill={ink} fillOpacity="0.07" />
      <rect x="32" y="22" width="92" height="72" rx="7" fill={ink} fillOpacity="0.11" />
      <rect x="44" y="34" width="92" height="72" rx="7" fill={`url(#${id.front})`} />
      {/* a seal and three ruled lines: enough to say "contract" without text */}
      <circle cx="62" cy="54" r="7" fill={ink} fillOpacity="0.20" />
      <rect x="76" y="50.5" width="48" height="3.4" rx="1.7" fill={ink} fillOpacity="0.17" />
      <rect x="58" y="72" width="66" height="3.4" rx="1.7" fill={ink} fillOpacity="0.13" />
      <rect x="58" y="84" width="40" height="3.4" rx="1.7" fill={ink} fillOpacity="0.13" />
      <rect x="58" y="96" width="52" height="3.4" rx="1.7" fill={ink} fillOpacity="0.13" />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// LinkArt — funders. One hub with satellites wired to it, the largest sitting
// outward on the right: a relationship that faces out of the organisation.
// ---------------------------------------------------------------------------
export function LinkArt({ ink }) {
  const id = useIds(['hub']);
  const edge = { stroke: ink, strokeOpacity: 0.15, strokeWidth: 2, strokeLinecap: 'round' };
  return (
    <Box {...frame('0 0 140 100')}>
      <defs>
        <radialGradient id={id.hub}>
          <stop offset="0" stopColor={ink} stopOpacity="0.24" />
          <stop offset="1" stopColor={ink} stopOpacity="0.10" />
        </radialGradient>
      </defs>
      {/* Edges stop at the circumference of both circles they join. Drawn full
          length they crossed under the translucent hub and the whole mark read
          as an asterisk rather than as a hub with satellites. */}
      <line x1="44.8" y1="45.0" x2="25.3" y2="28.5" {...edge} />
      <line x1="45.4" y1="71.7" x2="30.4" y2="85.9" {...edge} />
      <line x1="74.8" y1="44.6" x2="97.7" y2="23.7" {...edge} />
      <line x1="78.9" y1="64.5" x2="111.7" y2="75.8" {...edge} />
      <circle cx="60" cy="58" r="20" fill={`url(#${id.hub})`} />
      <circle cx="60" cy="58" r="20" fill="none" stroke={ink} strokeOpacity="0.20" strokeWidth="1.5" />
      <circle cx="20" cy="24" r="7" fill={ink} fillOpacity="0.14" />
      <circle cx="26" cy="90" r="6" fill={ink} fillOpacity="0.12" />
      <circle cx="104" cy="18" r="8.5" fill={ink} fillOpacity="0.16" />
      {/* the largest satellite sits outward, low and right -- the direction the
          rest of this product calls "facing out of the organisation" */}
      <circle cx="124" cy="80" r="13" fill={ink} fillOpacity="0.21" />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// PagesArt — reports. A sheet with a turned corner and ruled lines, a second
// sheet behind it, sitting at a slight angle so it reads as paper on a desk.
// ---------------------------------------------------------------------------
export function PagesArt({ ink }) {
  const id = useIds(['sheet']);
  return (
    <Box {...frame('0 0 120 110')}>
      <defs>
        <linearGradient id={id.sheet} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.19" />
          <stop offset="1" stopColor={ink} stopOpacity="0.07" />
        </linearGradient>
      </defs>
      <rect x="20" y="16" width="66" height="86" rx="5" fill={ink} fillOpacity="0.08" transform="rotate(-7 53 59)" />
      <g transform="rotate(4 66 62)">
        {/* the turned corner is cut out of the outline, not drawn over it */}
        <path d="M34 20 h44 l18 18 v66 a5 5 0 0 1 -5 5 h-57 a5 5 0 0 1 -5 -5 v-79 a5 5 0 0 1 5 -5 z" fill={`url(#${id.sheet})`} />
        <path d="M78 20 l18 18 h-18 z" fill={ink} fillOpacity="0.22" />
        <rect x="42" y="48" width="42" height="3.2" rx="1.6" fill={ink} fillOpacity="0.16" />
        <rect x="42" y="60" width="46" height="3.2" rx="1.6" fill={ink} fillOpacity="0.13" />
        <rect x="42" y="72" width="46" height="3.2" rx="1.6" fill={ink} fillOpacity="0.13" />
        <rect x="42" y="84" width="26" height="3.2" rx="1.6" fill={ink} fillOpacity="0.13" />
      </g>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// PulseArt — the delivery pipeline. Ascending columns over a low baseline,
// the last one carried further and darker: throughput, still climbing.
// ---------------------------------------------------------------------------
export function PulseArt({ ink }) {
  const id = useIds(['col', 'last']);
  // o scales the shared column gradient so the near columns sit forward of
  // the far ones without needing five gradients.
  const bars = [
    { x: 6, y: 62, o: 0.55 },
    { x: 26, y: 50, o: 0.7 },
    { x: 46, y: 54, o: 0.65 },
    { x: 66, y: 36, o: 0.85 },
    { x: 86, y: 26, o: 1 },
  ];
  return (
    <Box {...frame('0 0 130 90')}>
      <defs>
        <linearGradient id={id.col} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.20" />
          <stop offset="1" stopColor={ink} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={id.last} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity="0.28" />
          <stop offset="1" stopColor={ink} stopOpacity="0.10" />
        </linearGradient>
      </defs>
      {/* a soft swell behind the columns, as the reference tiles have */}
      <path d="M0 90 C22 74 40 82 62 72 C86 61 104 66 130 56 L130 90 Z" fill={ink} fillOpacity="0.05" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={b.y} width="13" height={80 - b.y} rx="3.5" fill={`url(#${id.col})`} opacity={b.o} />
      ))}
      <rect x="106" y="12" width="13" height="68" rx="3.5" fill={`url(#${id.last})`} />
      <rect x="0" y="79" width="130" height="1.8" rx="0.9" fill={ink} fillOpacity="0.14" />
    </Box>
  );
}
