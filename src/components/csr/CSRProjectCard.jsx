// src/components/csr/CSRProjectCard.jsx
//
// One row in the projects list. It is a SELECTOR, not a container: the row's
// whole job is to say which grant you are looking at and hand selection back to
// CSRProjectManagementPage, which paints the detail beside it. The card used to
// carry its own expand/collapse detail, its own edit and delete buttons and its
// own "open" icon — five controls on a row that is itself a control. In a
// master-detail layout the detail has a pane of its own and the verbs live in
// its header, so the row keeps exactly two affordances: click it, and a chevron
// that says clicking does something.
//
// COLOUR. Two axes, and they must not cross (same rule as CSRDashboard):
//   spine = grant IDENTITY — moss/indigo/teal, hashed by id, stable for life
//   dot   = STATUS — plum when closed, neutral when active
// "Active" is not one of the six inks' meanings. Moss means money utilised and
// nothing else, so an active grant gets the neutral grey rather than borrowing
// a colour that already has a job.

import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import {
  ChevronRight as ChevronIcon,
  CheckCircle as SelectedIcon,
} from '@mui/icons-material';

import { ttaProjectIdentity } from './CSRProjectDetailView';
import { surfaces, inks, text, figure, motion } from '../../styles/ttaTheme';

// Identity inks, in the dashboard's order. The hash below is character-for-
// character the one in CSRDashboard.jsx: a grant that is teal on the dashboard
// and indigo here would be worse than no colour at all, so if either copy
// changes the other has to change with it.
const GRANT_INKS = [inks.moss, inks.indigo, inks.teal];

export const grantInk = (id) => {
  const key = String(id ?? '');
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 100003;
  return GRANT_INKS[h % GRANT_INKS.length];
};

// Status carries a word as well as a colour, always — see the MuiChip note in
// ttaTheme.js. The dot is redundancy, not the message.
export const statusInk = (status) =>
  (status === 'Closed'
    ? { dot: inks.plum.accent, text: inks.plum.text }
    : { dot: text.neutral, text: text.secondary });

export const formatMoney = (value) =>
  (value == null || value === ''
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);

export default function CSRProjectCard({ project, selected = false, onSelect }) {
  const ink = grantInk(project.id);
  const status = statusInk(project.status);
  const identity = ttaProjectIdentity(project);

  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        borderBottom: `1px solid ${surfaces.hairlineSoft}`,
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <ButtonBase
        onClick={() => onSelect?.(project)}
        aria-current={selected ? 'true' : undefined}
        sx={{
          width: '100%',
          textAlign: 'left',
          justifyContent: 'stretch',
          alignItems: 'stretch',
          px: 0,
          py: 0,
          // Named property only — the catch-all keyword would animate the
          // row's box metrics on every selection change.
          transition: `background-color ${motion.feedback} ${motion.easeOut}`,
          bgcolor: selected ? ink.tint : 'transparent',
          '&:hover': { bgcolor: selected ? ink.tint : surfaces.canvas },
          '&:focus-visible': { outline: `2px solid ${ink.accent}`, outlineOffset: -2 },
        }}
      >
        {/* The identity spine. Present on every row so the colour reads as a
            property of the grant rather than of the selection. Selection itself
            must not be colour-only (a tint a colour-blind reader can't
            separate from "hover" is not a selected state), so the spine also
            WIDENS when selected — a shape change, not just a stronger tint.
            Width is in ttaTheme's NEVER_ANIMATE list (it thrashes layout), so
            it switches instantly; only the opacity transitions. */}
        <Box
          aria-hidden
          sx={{
            width: selected ? 5 : 3,
            flexShrink: 0,
            bgcolor: ink.accent,
            // 0.22 was set against the dark fill. The accent is a much lighter
            // colour, so the same alpha over this card composites to almost
            // nothing; 0.4 holds the spine at roughly the weight it had.
            opacity: selected ? 1 : 0.4,
            transition: `opacity ${motion.feedback} ${motion.easeOut}`,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0, px: 1.75, py: 1.5 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              sx={{
                fontSize: '0.9375rem',
                // Weight carries selection too — never colour alone. Weight is
                // in NEVER_ANIMATE, so this switches instantly with no
                // transition rather than tweening through the font faces.
                fontWeight: selected ? 700 : 500,
                letterSpacing: '-0.01em',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {project.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8125rem' }}>
              {project.clientName || '—'}
            </Typography>
            {/* The TTA identity only when it exists — an unlinked grant's row
                stays two lines rather than growing a placeholder. */}
            {identity && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem' }}>
                {identity}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Box sx={{ ...figure.row, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              {formatMoney(project.sanctionedAmount)}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75, mt: 0.25 }}>
              <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: status.dot }} />
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: status.text }}>
                {project.status}
              </Typography>
            </Box>
          </Box>
          {/* The one unambiguous selected marker: a filled glyph replacing an
              outline one. Shape, not colour, carries the meaning, so it reads
              the same to a colour-blind viewer and survives any repaint of
              `ink`. The plain chevron still says "this row opens something"
              on every other row. */}
          {selected ? (
            <SelectedIcon fontSize="small" aria-hidden sx={{ color: ink.text, flexShrink: 0 }} />
          ) : (
            <ChevronIcon fontSize="small" sx={{ color: surfaces.hairline, flexShrink: 0 }} />
          )}
        </Box>
      </ButtonBase>
    </Box>
  );
}
