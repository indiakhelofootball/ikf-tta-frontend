// src/components/csr/CSRDashboard.jsx
// CSR dashboard, laid out to the reference: a featured card and three stat
// tiles across the top with a Statistic panel beside them, then quick actions
// and a chart below.
//
// The shape is doing work, not decoration. The reference leads with ONE
// figure that matters and surrounds it with the numbers that qualify it —
// here the lead grant, then sanctioned / utilised / remaining, then the split
// by funder. The previous version gave four equal KPI tiles, which said all
// four numbers matter the same amount. They do not: a CSR operator is asked
// "how much is left" far more often than "how many funders".
//
// Data logic is unchanged. Render is pure markup styled by
// src/styles/csrDesign.css (scope: .csrx). No MUI sx.
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import '../../styles/csrDesign.css';

const fmtINR = (v) => {
  const n = Number(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
};
const DONUT = ['#1B5E42', '#2C6A4F', '#3E8C67', '#5CA684', '#8AC3A7', '#B7DCC9'];

// The donut. Segments are drawn as stroke-dasharray arcs on one circle rather
// than as pie wedges: an arc needs no path maths, stays crisp at any size, and
// leaves the middle genuinely empty for the total to sit in.
function Donut({ segments, centre, size = 132, stroke = 24 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF0EF" strokeWidth={stroke} />
        {segments.map((sgm) => {
          const len = (sgm.pct / 100) * c;
          const el = (
            <circle
              key={sgm.name}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={sgm.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="donut-ctr">
        <span className="donut-v fig">{centre}</span>
      </div>
    </div>
  );
}

// A paired bar chart with a hover card, as the reference draws it. Built from
// two divs per grant rather than a chart library: the whole series is at most
// eight pairs, and pulling in a charting dependency for that would cost more
// bundle than the entire CSR module.
//
// The tooltip is positioned by the hovered group's own offset, not by the
// mouse, so it cannot jitter and cannot escape the panel.
function BarPairs({ rows }) {
  const [hot, setHot] = React.useState(null);
  const row = hot === null ? null : rows[hot];
  return (
    <div className="pairs">
      <div className="pairs-plot">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`pairgrp${hot === i ? ' on' : ''}`}
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot((h) => (h === i ? null : h))}
          >
            <div className={`pairbars k${(i % 6) + 1}`}>
              <span className="bar sanc" style={{ height: `${Math.max(3, r.hs)}%` }} />
              <span className="bar util" style={{ height: `${Math.max(3, r.hu)}%` }} />
            </div>
            <span className="pairlbl">{r.name}</span>
          </div>
        ))}

        {row && (
          <div
            className="tip"
            style={{ left: `${((hot + 0.5) / rows.length) * 100}%` }}
            role="tooltip"
          >
            <div className="tip-t">{row.name}</div>
            <div className="tip-r"><span>Sanctioned</span><b className="fig">{fmtINR(row.sanc)}</b></div>
            <div className="tip-r"><span>Utilised</span><b className="fig">{fmtINR(row.util)}</b></div>
          </div>
        )}
      </div>
    </div>
  );
}

const ic = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

// The three figures that qualify the lead, in the order they are asked about.
// `trend` is a plain statement of the same number in another form, not an
// invented period-over-period delta — there is no history series behind this
// data, and a fabricated arrow would be a lie in a financial view.
// Four cards across the top, each a different figure. "Not counted" is the one
// an operator has to act on: money tagged to a grant whose payment never
// completed, invisible in every other total on this screen — sanctioned does
// not include it, utilised excludes it by definition, and remaining counts it
// as unspent.
const STATS = (sanctioned, utilised, remaining, excluded, excludedCount, utilPct, openCount) => [
  {
    k: 'Total Sanctioned',
    v: fmtINR(sanctioned),
    trend: `${openCount} open ${openCount === 1 ? 'grant' : 'grants'}`,
    tone: 'neutral',
    hue: 'n',
    icon: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.5-2.5.7-2.5 1.7 1 1.8 2.5 1.8 2.5-.8 2.5-1.8" /></>),
  },
  {
    k: 'Utilised',
    v: fmtINR(utilised || 0),
    trend: `${Math.round(utilPct)}% of sanction`,
    tone: utilPct > 100 ? 'bad' : 'good',
    hue: 'g',
    icon: ic(<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>),
  },
  {
    k: 'Remaining',
    v: fmtINR(remaining),
    trend: remaining < 0 ? 'overspent' : `${Math.round(100 - Math.min(100, utilPct))}% left`,
    tone: remaining < 0 ? 'bad' : 'info',
    hue: 'b',
    icon: ic(<><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 11h20" /></>),
  },
  {
    k: 'Not counted',
    v: fmtINR(excluded),
    trend: excludedCount === 0
      ? 'nothing pending'
      : `${excludedCount} ${excludedCount === 1 ? 'expense' : 'expenses'}`,
    tone: excluded > 0 ? 'bad' : 'warn',
    hue: 'o',
    icon: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>),
  },
];

// Four things an operator actually starts from. Every one is a real route.
const ACTIONS = [
  { label: 'New Project', to: '/csr/projects', icon: ic(<><path d="M12 5v14M5 12h14" /></>) },
  { label: 'Activities', to: '/csr/activities', icon: ic(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>) },
  { label: 'Reports', to: '/csr/reports', icon: ic(<><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /></>) },
  { label: 'Utilisation', to: '/csr/utilisation', icon: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
];


export default function CSRDashboard() {
  const { canView } = useGrants();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [utilised, setUtilised] = useState(null);
  const [utilByProject, setUtilByProject] = useState({});
  const [excluded, setExcluded] = useState({ amount: 0, count: 0 });
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
      .then(([ps]) => {
        if (!active) return undefined;
        setProjects(ps);
        const open = ps.filter((p) => p.status !== 'Closed');
        return Promise.all(
          open.map((p) =>
            csrAPI.utilisationCertificate(p.id)
              .then((c) => ({ id: p.id, cert: c }))
              .catch(() => ({ id: p.id, cert: null })))
        ).then((rowsOut) => {
          if (!active) return;
          const ok = rowsOut.filter((r) => r.cert);
          setUtilised(ok.reduce((a, r) => a + (Number(r.cert.totalUtilised) || 0), 0));
          // Keep the per-grant figure too. The chart pairs sanctioned against
          // utilised the way the reference pairs income against expense, and a
          // single portfolio total cannot be split back apart afterwards.
          setUtilByProject(Object.fromEntries(
            ok.map((r) => [String(r.id), Number(r.cert.totalUtilised) || 0]),
          ));
          const ex = ok.flatMap((r) => r.cert.excludedItems || []);
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

  const openP = projects.filter((p) => p.status !== 'Closed');
  const sanctioned = openP.reduce((s, p) => s + (Number(p.sanctionedAmount) || 0), 0);
  const utilPct = sanctioned > 0 ? ((utilised || 0) / sanctioned) * 100 : 0;
  const remaining = sanctioned - (utilised || 0);
  // Sanctioned against utilised, per grant — the pair the reference charts.
  const series = useMemo(() => {
    const rows = openP
      .map((p) => ({
        id: p.id,
        name: p.name,
        sanc: Number(p.sanctionedAmount) || 0,
        util: Number(utilByProject[String(p.id)]) || 0,
      }))
      .sort((a, b) => b.sanc - a.sanc)
      .slice(0, 8);
    const max = Math.max(1, ...rows.map((r) => Math.max(r.sanc, r.util)));
    return rows.map((r) => ({
      ...r,
      hs: (r.sanc / max) * 100,
      hu: (r.util / max) * 100,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, utilByProject]);

  // sanctioned by funder — donut segments
  const byFunder = useMemo(() => {
    const m = {};
    openP.forEach((p) => {
      const k = p.clientName || 'Unassigned';
      m[k] = (m[k] || 0) + (Number(p.sanctionedAmount) || 0);
    });
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amt], i) => ({ name, amt, pct: (amt / total) * 100, color: DONUT[i % DONUT.length] }));
  }, [openP]);


  if (!canView('csr')) {
    return <Alert severity="warning" sx={{ m: 3 }}>You do not have access to CSR.</Alert>;
  }

  return (
    <div className="csrx csrx-page">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <>
          {/* ---- row 1: the lead grant, the three figures, the split ---- */}
          <div className="dash">
            <div className="panel stats">
              {STATS(sanctioned, utilised, remaining, excluded.amount, excluded.count, utilPct, openP.length).map((t) => (
                <div className={`stat tint-${t.hue}`} key={t.k}>
                  <div className="stat-top">
                    <span className={`stat-ic ${t.hue}`}>{t.icon}</span>
                    <span className="stat-dots" aria-hidden="true">⋮</span>
                  </div>
                  <span className={`trend ${t.tone}`}>{t.trend}</span>
                  <div className="stat-k">{t.k}</div>
                  <div className="stat-v fig">{t.v}</div>
                </div>
              ))}
            </div>

            <div className="panel statistic">
              <div className="stat-head">
                <h3>Statistic</h3>
                <span className="stat-when">By funder</span>
              </div>
              <div className="stat-pair">
                <div><span>Utilised</span><span className="fig">{fmtINR(utilised || 0)}</span></div>
                <div><span>Remaining</span><span className="fig">{fmtINR(remaining)}</span></div>
              </div>
              <Donut segments={byFunder} centre={fmtINR(sanctioned)} />
              <div className="legend">
                {byFunder.length === 0 ? (
                  <div className="panel-empty">No grants yet.</div>
                ) : byFunder.map((f) => (
                  <div className="legend-row" key={f.name}>
                    <span className="legend-dot" style={{ background: f.color }} />
                    <span className="legend-nm">{f.name}</span>
                    <span className="legend-amt fig">{fmtINR(f.amt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- row 2: what you can do, and the shape of the money ---- */}
            <div className="panel quick">
              <div className="quick-grid">
                {ACTIONS.map((a) => (
                  <button type="button" className="qa" key={a.label} onClick={() => navigate(a.to)}>
                    <span className="qa-ic">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="limit">
                <div className="limit-top">
                  <span className="limit-k">Utilisation</span>
                  <span className="limit-pc fig">{Math.round(utilPct)}%</span>
                </div>
                <div className="limit-track">
                  <div
                    className={`limit-fill${utilPct > 100 ? ' over' : ''}`}
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>
                <div className="limit-sub fig">
                  {fmtINR(utilised || 0)} counted of {fmtINR(sanctioned)}
                </div>
                {excluded.count > 0 && (
                  <div className="limit-warn">{fmtINR(excluded.amount)} tagged, not yet counted</div>
                )}
              </div>
            </div>

            <div className="panel flow">
              <div className="stat-head">
                <h3>Sanctioned by grant</h3>
                <span className="stat-when">Open grants</span>
              </div>
              <div className="flow-k">Total sanctioned</div>
              <div className="flow-total fig">{fmtINR(sanctioned)}</div>
              <div className="flow-key">
                <span><span className="legend-dot" style={{ background: '#2C6A4F' }} /> Sanctioned</span>
                <span><span className="legend-dot" style={{ background: '#9FCBB4' }} /> Utilised</span>
              </div>
              {series.length === 0 ? (
                <div className="panel-empty">No grants yet.</div>
              ) : (
                <BarPairs rows={series} />
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
