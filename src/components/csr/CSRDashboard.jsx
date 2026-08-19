// src/components/csr/CSRDashboard.jsx
// The CSR app's landing page.
//
// WHAT THIS PAGE IS: a small number of tiles, each answering a DIFFERENT
// question. It is not a list of grants — every grant repeating the same six
// fields is a table wearing cards, and it was what this page used to be.
// Per-grant spend against its window belongs in the grants module, not here.
//
// Delivery leads (owner decision, 19 Aug): what was achieved, in the funder's
// own units, before any rupee figure. That is the number a grant is renewed on.
//
// NEVER SUM ACROSS UNITS. 318 players + 120 coaches is 438 people. Trials, kits
// and camps are events and objects — adding all five into one "people reached"
// figure is the same category error as pooling rupees across funders. Each
// deliverable therefore keeps its own line and its own unit.
//
// Colour has two axes and they must not cross:
//   Spine = grant IDENTITY (moss/indigo/teal, hashed by id, stable for life)
//   Text  = STATUS (ochre waiting, clay attention, plum closed)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Skeleton } from '@mui/material';
import {
  TaskAltOutlined as DeliveryIcon,
  PaymentsOutlined as MoneyIcon,
  FolderSpecialOutlined as GrantsIcon,
  DescriptionOutlined as ReportsIcon,
  HandshakeOutlined as FundersIcon,
  HistoryOutlined as RecentIcon,
} from '@mui/icons-material';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import { ttaProjectIdentity } from './CSRProjectDetailView';
import { surfaces, inks, figure, fonts, tabular } from '../../styles/ttaTheme';

const fmtINR = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);
};

const GRANT_INKS = [inks.moss, inks.indigo, inks.teal];

// Not every tile earns an ink. Activity and history carry no fixed meaning in
// this system, so they take the neutral rather than borrowing a colour that
// means something else — which is exactly how teal ended up on Activities.
const NEUTRAL = { tint: surfaces.sunken, text: '#4E5A54', fill: '#98A199' };
const inkFor = (id) => {
  const key = String(id ?? '');
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 100003;
  return GRANT_INKS[h % GRANT_INKS.length];
};

// ---------------------------------------------------------------------------
// Tile. One question each, and small — a dashboard tile is a glance, not a
// screen. The references average about 150px tall; the version this replaces
// was 190px per grant and said the same thing three times.
// ---------------------------------------------------------------------------
function Tile({ icon, label, children, span = 1, rowSpan = 1, onClick, ink = inks.moss }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        gridColumn: { xs: 'span 2', md: `span ${span}` },
        gridRow: { xs: 'auto', md: `span ${rowSpan}` },
        bgcolor: surfaces.surface,
        // No border. The references separate a card from its ground with tone
        // and a soft shadow, never a hairline outline — an outlined tile on a
        // tinted ground reads as a table cell.
        borderRadius: 2,
        boxShadow: '0 1px 2px rgba(20,28,24,0.04), 0 6px 16px rgba(20,28,24,0.05)',
        p: 2.75,
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 160ms cubic-bezier(0, 0, 0.2, 1)',
        ...(onClick && {
          '&:hover': { boxShadow: '0 2px 4px rgba(20,28,24,0.06), 0 10px 24px rgba(20,28,24,0.09)' },
        }),
      }}
    >
      {/* Badge and label on one line. Every reference leads its card this way,
          and it is why theirs read as objects rather than as fields: the badge
          gives the tile a fixed anchor and carries the tile's ink. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, flex: 'none',
          display: 'grid', placeItems: 'center',
          bgcolor: ink.tint, color: ink.text,
          '& svg': { fontSize: 18 },
        }}>
          {icon}
        </Box>
        {/* Sentence case at 13px, not 11px uppercase with wide tracking. The
            tracked-out micro-label is a bureaucratic tic and none of the
            references use one. */}
        <Box sx={{
          fontFamily: fonts.sans, fontSize: '0.8125rem', fontWeight: 600,
          color: 'text.secondary', letterSpacing: 0,
        }}>
          {label}
        </Box>
      </Box>
      {children}
    </Box>
  );
}

// A promised output against what has actually been delivered. The bar is the
// point — a count alone does not say whether it is nearly done.
function Promised({ title, done, target, ink }) {
  const met = target != null && done != null && done >= target;
  const pctRaw = target ? (done / target) * 100 : 0;
  return (
    <Box sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', gap: 1.5,
        alignItems: 'baseline', mb: 0.5,
      }}>
        <Box sx={{ fontFamily: fonts.sans, fontSize: '0.8125rem', minWidth: 0 }}>{title}</Box>
        <Box sx={{
          ...tabular, fontFamily: fonts.serif, fontSize: '0.9375rem',
          color: met ? inks.moss.text : 'text.primary', whiteSpace: 'nowrap',
        }}>
          {done == null ? '—' : done}<span style={{ color: '#5C6A63' }}> / {target ?? '—'}</span>
        </Box>
      </Box>
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: surfaces.sunken, overflow: 'hidden' }}>
        <Box sx={{
          height: '100%', width: `${Math.min(100, pctRaw)}%`,
          bgcolor: met ? inks.moss.fill : ink,
        }} />
      </Box>
    </Box>
  );
}

export default function CSRDashboard() {
  const navigate = useNavigate();
  const { canView } = useGrants();
  const [projects, setProjects] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [activities, setActivities] = useState([]);
  const [utilised, setUtilised] = useState(null);
  // Tagged money that does NOT count yet. certificate.py only sums tags whose
  // payment reached 'Payment Done'; Draft, Sent to Accounts and Bounced go to
  // excludedItems instead. Showing the counted figure alone reports a total
  // that is correct and a shortfall that is invisible — a bounced payment is
  // someone's job to fix before the certificate is right.
  const [excluded, setExcluded] = useState({ amount: 0, count: 0 });
  const [pendingReports, setPendingReports] = useState(null);
  const [reportedCount, setReportedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const rows = (r) => r?.results || r || [];

    Promise.all([
      csrAPI.projects.getAll().then(rows).catch(() => []),
      csrAPI.deliverables.getAll().then(rows).catch(() => []),
      csrAPI.activities.getAll().then(rows).catch(() => []),
      csrAPI.reports.getAll().then(rows).catch(() => []),
    ])
      .then(([ps, ds, as, rs]) => {
        if (!active) return undefined;
        setProjects(ps);
        setDeliverables(ds);
        setActivities(as);
        setPendingReports(rs.filter((r) => !r.visibleToClient).length);
        // Distinct activities that have at least one report attached — the
        // middle step of the pipeline.
        setReportedCount(new Set(rs.map((r) => r.activityId).filter(Boolean)).size);

        // The certificate endpoint is the only server-authoritative source of
        // "utilised" — it already applies the Payment Done rule. Summing tags
        // client-side would drift from the PDF a funder is handed.
        return Promise.all(
          ps.filter((p) => p.status !== 'Closed').map((p) =>
            csrAPI.utilisationCertificate(p.id)
              .then((c) => c)
              .catch(() => null))
        ).then((certs) => {
          if (!active) return;
          const ok = certs.filter(Boolean);
          setUtilised(ok.reduce((a, c) => a + (Number(c.totalUtilised) || 0), 0));
          const ex = ok.flatMap((c) => c.excludedItems || []);
          setExcluded({
            amount: ex.reduce((a, i) => a + (Number(i.amount) || 0), 0),
            count: ex.length,
          });
        });
      })
      .catch(() => { if (active) setError('Could not load the CSR dashboard.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const open = projects.filter((p) => p.status !== 'Closed');
  const sanctioned = open.reduce((s, p) => s + (Number(p.sanctionedAmount) || 0), 0);

  // People, and only people. Trials, kits and camps are counted separately
  // because they are not people — see the header note.
  const peopleWords = /player|coach|child|children|girl|boy|student|participant|athlete|volunteer/i;
  const people = deliverables
    .filter((d) => peopleWords.test(d.title || ''))
    .reduce((s, d) => s + (Number(d.completedCount) || 0), 0);

  // Distinct funding organisations. Derived from the projects already loaded
  // rather than a fifth request — the name is on every project row.
  const funders = useMemo(
    () => [...new Set(projects.map((p) => p.clientName).filter(Boolean))],
    [projects],
  );

  const recent = useMemo(() => [...activities]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 6), [activities]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" height={i === 0 ? 300 : 140}
            sx={{ gridColumn: i === 0 ? 'span 2' : 'span 1' }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        // No alignItems override: the default `stretch` makes tiles in a row
        // share a bottom edge. `start` left every row ragged. Rows stay
        // content-sized — forcing them equal made the short tiles half empty.
      }}>

        {/* ---- Row 1: four short stat tiles, one number each ---- */}
        {/* ---- Utilisation: one number, no per-grant breakdown ---- */}
        <Tile icon={<MoneyIcon />} label="Utilised" ink={inks.moss} onClick={() => navigate('/csr/projects')}>
          <Box sx={{ ...figure.large, color: inks.moss.text }}>{fmtINR(utilised)}</Box>
          <Box sx={figure.unit}>counted, of {fmtINR(sanctioned)} sanctioned</Box>
          {excluded.count > 0 && (
            <Box sx={{ ...figure.unit, color: inks.clay.text, mt: 0.75, fontWeight: 600 }}>
              {fmtINR(excluded.amount)} tagged, not yet counted
            </Box>
          )}
        </Tile>
        {/* ---- Grants ---- */}
        <Tile icon={<GrantsIcon />} label="Grants" ink={inks.indigo} onClick={() => navigate('/csr/projects')}>
          <Box sx={figure.large}>{open.length}</Box>
          <Box sx={figure.unit}>
            active{projects.length > open.length && ` · ${projects.length - open.length} closed`}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }}>
            {open.map((p) => (
              // The tile shows a count and one bar per grant; the name lives
              // only in the tooltip, so that is the single honest place for the
              // identity here. Appended, never replacing the name.
              <Box key={p.id} title={[p.name, ttaProjectIdentity(p)].filter(Boolean).join(' · ')} sx={{
                height: 3, flex: 1, borderRadius: 1, bgcolor: inkFor(p.id).fill,
              }} />
            ))}
          </Box>
        </Tile>
        {/* ---- Funders. Teal is the system's outward-facing ink and this is
             the only outward-facing thing on the page. ---- */}
        <Tile icon={<FundersIcon />} label="Funders" ink={inks.teal}
              onClick={() => navigate('/csr/clients')}>
          <Box sx={{ ...figure.large, color: inks.teal.text }}>{funders.length}</Box>
          <Box sx={figure.unit}>
            {funders.length === 1 ? 'organisation' : 'organisations'} funding this work
          </Box>
        </Tile>
        {/* ---- Reports queue. Ochre means one thing: waiting on you. ---- */}
        {/* The flowchart names Chain B as a pipeline: activity happens (logged
            after the fact) -> report added -> visible_to_client, "the editorial
            gate" -> funder sees it. That gate is the CSR team's actual job.
            Rendering only the tail as a scalar could not say whether work was
            stuck at "no report yet" or at "written, not released" -- different
            problems, different people. */}
        <Tile icon={<ReportsIcon />} label="Delivery pipeline" ink={inks.ochre}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {[
              { n: activities.length, label: 'activities logged', ink: NEUTRAL },
              { n: reportedCount, label: 'have a report', ink: NEUTRAL },
              { n: pendingReports ?? 0, label: 'not yet released', ink: inks.ochre },
            ].map((step) => (
              <Box key={step.label} sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Box sx={{
                  ...figure.row, fontSize: '1.125rem', width: 26, flex: 'none',
                  color: step.ink === inks.ochre && step.n > 0 ? inks.ochre.text : 'text.primary',
                }}>
                  {step.n}
                </Box>
                <Box sx={figure.unit}>{step.label}</Box>
              </Box>
            ))}
          </Box>
        </Tile>

        {/* ---- Row 2: the two tiles with real content in them ---- */}
        {/* ---- FEATURE: what was actually delivered ---- */}
        <Tile icon={<DeliveryIcon />} label="Delivery against promises" span={2} ink={inks.indigo}>
          {people > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={figure.hero}>{people.toLocaleString('en-IN')}</Box>
              <Box sx={figure.unit}>people reached, across every grant</Box>
              <Box sx={{ height: '1px', bgcolor: 'divider', mt: 2 }} />
            </Box>
          )}
          {deliverables.filter((d) => d.targetCount != null).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No deliverables recorded yet.
            </Typography>
          ) : deliverables.filter((d) => d.targetCount != null).slice(0, 5).map((d) => (
            <Promised
              key={d.id}
              title={d.title}
              done={d.completedCount}
              target={d.targetCount}
              ink={inks.indigo.fill}
            />
          ))}
        </Tile>

        {/* ---- Recent, wide. The activity count rides in the label: a bare
             tally of things that happened is not a peer of the money or the
             funder count, and giving it a tile of its own forced a fifth
             object into a four-column row. ---- */}
        <Tile
          icon={<RecentIcon />}
          span={2}
          ink={NEUTRAL}
          label={`Recent activity · ${activities.length} logged`}
        >
          {recent.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Nothing logged yet.
            </Typography>
          ) : recent.map((a) => (
            <Box
              key={a.id}
              sx={{
                display: 'flex', gap: 2, alignItems: 'baseline', py: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
            >
              <Box sx={{ ...figure.unit, ...tabular, width: 66, flex: 'none' }}>
                {a.date
                  ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : '—'}
              </Box>
              <Box sx={{ fontFamily: fonts.sans, fontSize: '0.8125rem', flex: 1, minWidth: 0 }}>
                {a.title}
              </Box>
              <Box sx={{
                ...figure.unit,
                // Deliberately NOT moss: moss means money utilised, and an
                // activity completing is not a money event. Only 'Planned'
                // takes an ink, because only it is waiting on someone.
                color: a.status === 'Planned' ? inks.ochre.text : undefined,
              }}>
                {a.status}
              </Box>
            </Box>
          ))}
        </Tile>
      </Box>
    </Box>
  );
}
