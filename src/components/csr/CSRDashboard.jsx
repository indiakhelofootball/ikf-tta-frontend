// src/components/csr/CSRDashboard.jsx
// CSR dashboard — the DECIDED design (green · glass · Fontshare), rebuilt to the
// mockup: KPI row, a utilisation gauge, a sanctioned-by-funder donut, and a
// projects table. Data logic is unchanged; render is pure markup styled by
// src/styles/csrDesign.css (scope: .csrx). No coral tokens, no MUI sx.
import React, { useState, useEffect, useMemo } from 'react';
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
const DONUT = ['#2C6A4F', '#385DB2', '#B5651D', '#7A3E8F', '#1B678D', '#A8386A'];
const BARS = ['#2C6A4F', '#385DB2', '#B5651D', '#7A3E8F', '#1B678D', '#A8386A', '#5C7A1E', '#4A4FA8'];

function RadialGauge({ pct, size = 90, stroke = 9 }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const over = pct > 100;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="rg" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#DCE3DD" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={over ? '#B3352A' : '#2C6A4F'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
        />
      </svg>
      <div className="ctr" style={over ? { color: '#B3352A' } : undefined}>{Math.round(pct || 0)}%</div>
    </div>
  );
}

export default function CSRDashboard() {
  const { canView } = useGrants();
  const [projects, setProjects] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [utilised, setUtilised] = useState(null);
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
      .then(([ps, ds, as]) => {
        if (!active) return undefined;
        setProjects(ps);
        setDeliverables(ds);
        return Promise.all(
          ps.filter((p) => p.status !== 'Closed').map((p) =>
            csrAPI.utilisationCertificate(p.id).then((c) => c).catch(() => null))
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

  const openP = projects.filter((p) => p.status !== 'Closed');
  const sanctioned = openP.reduce((s, p) => s + (Number(p.sanctionedAmount) || 0), 0);
  const peopleWords = /player|coach|child|children|girl|boy|student|participant|athlete|volunteer/i;
  const people = deliverables
    .filter((d) => peopleWords.test(d.title || ''))
    .reduce((s, d) => s + (Number(d.completedCount) || 0), 0);
  const funders = useMemo(
    () => [...new Set(projects.map((p) => p.clientName).filter(Boolean))],
    [projects],
  );
  const utilPct = sanctioned > 0 ? ((utilised || 0) / sanctioned) * 100 : 0;

  // Histogram: sanctioned amount per project, each a distinct colour.
  const histo = useMemo(() => {
    const rows = openP
      .map((p, i) => ({ name: p.name, amt: Number(p.sanctionedAmount) || 0, color: BARS[i % BARS.length] }))
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 8);
    const max = Math.max(1, ...rows.map((r) => r.amt));
    return rows.map((r) => ({ ...r, h: (r.amt / max) * 100 }));
  }, [openP]);

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
          {/* KPI row */}
          <div className="kpis">
            <div className="glasscard kpi">
              <div className="top"><div className="ic g"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></svg></div><div className="k">Active Projects</div></div>
              <div className="v fig">{openP.length}</div>
              <div className="sub">{projects.length - openP.length > 0 ? `${projects.length - openP.length} closed` : 'all active'}</div>
            </div>
            <div className="glasscard kpi">
              <div className="top"><div className="ic b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.5-2.5.7-2.5 1.7 1 1.8 2.5 1.8 2.5-.8 2.5-1.8" /></svg></div><div className="k">Total Sanctioned</div></div>
              <div className="v fig">{fmtINR(sanctioned)}</div>
              <div className="sub">across {funders.length} funder{funders.length === 1 ? '' : 's'}</div>
            </div>
            <div className="glasscard kpi">
              <div className="top"><div className="ic o"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg></div><div className="k">Utilised</div></div>
              <div className="v fig">{Math.round(utilPct)}<small>%</small></div>
              <div className="sub">{fmtINR(utilised || 0)} counted</div>
            </div>
            <div className="glasscard kpi">
              <div className="top"><div className="ic p"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 010 6" /></svg></div><div className="k">Beneficiaries</div></div>
              <div className="v fig">{people.toLocaleString('en-IN')}</div>
              <div className="sub">people reached</div>
            </div>
          </div>

          {/* gauge + donut */}
          <div className="dgrid">
            <div className="glasscard panel">
              <div className="ph3"><h3>Utilisation of sanctioned amount</h3></div>
              <div className="gaugebig">
                <RadialGauge pct={utilPct} />
                <div className="lbl">
                  <div className="big fig">{fmtINR(utilised || 0)}</div>
                  <div className="sm">counted, of {fmtINR(sanctioned)} sanctioned</div>
                  {excluded.count > 0 && (
                    <div className="sm" style={{ color: '#B3352A', marginTop: 6 }}>
                      {fmtINR(excluded.amount)} tagged, not yet counted
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="glasscard panel">
              <div className="ph3"><h3>Sanctioned by funder</h3></div>
              {byFunder.length === 0 ? (
                <div className="panel-empty">No grants yet.</div>
              ) : (
                <div className="barchart">
                  {byFunder.map((f) => (
                    <div className="barrow" key={f.name}>
                      <div className="barrow-top">
                        <span className="barrow-nm">{f.name}</span>
                        <span className="barrow-amt fig">{fmtINR(f.amt)}</span>
                      </div>
                      <div className="bartrack">
                        <div className="barfill" style={{ width: `${f.pct}%`, background: f.color }} />
                      </div>
                      <span className="barrow-pc">{Math.round(f.pct)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {histo.length > 0 && (
            <div className="glasscard panel" style={{ marginTop: 16 }}>
              <div className="ph3"><h3>Sanctioned amount by project</h3></div>
              <div className="histo">
                {histo.map((r) => (
                  <div className="histbar" key={r.name} title={`${r.name}: ${fmtINR(r.amt)}`}>
                    <span className="histamt fig">{fmtINR(r.amt)}</span>
                    <div className="histcol" style={{ height: `${Math.max(6, r.h)}%`, background: r.color }} />
                    <span className="histlbl">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
