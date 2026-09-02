// src/components/csr/CSRReportsPage.jsx
// Reports, across every grant — the sidebar destination from the 28 May visual
// flow, not the per-project tab.
//
// WHAT THIS PAGE IS: the EDITORIAL GATE. A report exists in one of two states —
// held internally, or released to the funder (visible_to_client). Deciding which
// is the CSR team's main job, and the state is the reason this page is a
// destination of its own rather than a file list. So the gate is the first thing
// the page says, the default view is the queue of things NOT yet released, and
// the state is a column rather than a detail you open a row to find.
//
// COLOUR. Two inks, both carrying the meaning they own:
//   ochre  — "waiting on you": written but not released. The queue.
//   teal   — "everything facing outward": released, the funder can see it.
// Nothing else is coloured. Released is not a money event, so moss stays out.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import '../../styles/csrDesign.css';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

// Where a report actually lives on the grant page. CSRProjectDetailPage reads
// location.state.tab, so a row can open on the Reports tab instead of dropping
// you on Overview to hunt for the record you just clicked.
const REPORTS_TAB = 3;

// The three views of the gate. 'Internal' is deliberately first in the list and
// is what the count in the header points at — it is the only one of the three
// that is somebody's outstanding work.
const VIEWS = [
  { value: 'Internal', label: 'Not yet released' },
  { value: 'Visible', label: 'Client-visible' },
  { value: 'All', label: 'All reports' },
];

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Steel for released, ochre for held back. Ochre means "waiting on you", which
// is exactly what an unreleased report is.
function GateChip({ visible }) {
  return (
    <span className={`pill ${visible ? 'act' : 'wait'}`}>
      {visible ? 'Client-visible' : 'Internal'}
    </span>
  );
}


export default function CSRReportsPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();

  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  // Opens on the queue, not on everything. The complete list is one click away;
  // the outstanding work should not be.
  const [view, setView] = useState('Internal');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // The report serializer ships projectId and activityId only — neither name
      // is on the row, so both lists are fetched and joined here.
      const [reps, projs, acts] = await Promise.all([
        csrAPI.reports.getAll(),
        csrAPI.projects.getAll(),
        csrAPI.activities.getAll(),
      ]);
      setReports(asList(reps));
      setProjects(asList(projs));
      setActivities(asList(acts));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load reports.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(() => load(true));

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [String(p.id), p.name]));
    return (id) => map.get(String(id)) || '—';
  }, [projects]);

  const activityTitle = useMemo(() => {
    const map = new Map(activities.map((a) => [String(a.id), a.title]));
    return (id) => (id == null ? '' : map.get(String(id)) || '');
  }, [activities]);

  const pending = reports.filter((r) => !r.visibleToClient).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (view === 'Internal') return !r.visibleToClient;
        if (view === 'Visible') return Boolean(r.visibleToClient);
        return true;
      })
      .filter((r) => projectFilter === 'All' || String(r.projectId) === String(projectFilter))
      .filter((r) => {
        if (!q) return true;
        return [r.fileName, projectName(r.projectId), activityTitle(r.activityId)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }, [reports, view, projectFilter, search, projectName, activityTitle]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Reports</h2>
          <p>
            Every report across every grant. A report reaches the funder only
            once it is marked client-visible.
          </p>
        </div>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* The gate, stated as a figure. A count of things waiting on you is the
          one number this page exists to keep at zero. */}
      {!loading && (
        <div className={`gate${pending > 0 ? ' hot' : ''}`}>
          <span className="gate-n fig">{pending}</span>
          <span className="gate-t">
            {pending === 1 ? 'report is' : 'reports are'} written but not yet
            released to the funder{reports.length > 0 && `, of ${reports.length} in all`}
          </span>
        </div>
      )}

      <div className="toolbar">
        <label className="sb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            placeholder="Search file, grant or activity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="sel" aria-label="Gate" value={view} onChange={(e) => setView(e.target.value)}>
          {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <select
          className="sel"
          aria-label="Grant"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="All">All grants</option>
          {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          <div className="lgrid lgrid-head">
            {['Added', 'File', 'Activity', 'Grant', 'Gate'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              <h3>{reports.length === 0 ? 'No reports yet' : 'No reports match'}</h3>
              {reports.length === 0
                ? 'A report is a document filed against a grant or one of its activities.'
                : 'Clear the search or change the filter.'}
            </div>
          ) : rows.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              className="lgrid lrow"
              aria-label={`Open ${r.fileName || 'Untitled'}, filed under ${projectName(r.projectId)}`}
              onClick={() => navigate(`/csr/${r.projectId}`, { state: { tab: REPORTS_TAB } })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/csr/${r.projectId}`, { state: { tab: REPORTS_TAB } });
                }
              }}
            >
              <span className="fig nowrap">{fmtDay(r.createdAt)}</span>
              <span className="t1wrap">
                <span className="t1">{r.fileName || 'Untitled'}</span>
                {r.fileUrl && (
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open document"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><path d="M15 3h6v6M10 14L21 3" /></svg>
                  </a>
                )}
              </span>
              <span className="t2">{activityTitle(r.activityId) || '—'}</span>
              <span className="t2">{projectName(r.projectId)}</span>
              <span><GateChip visible={Boolean(r.visibleToClient)} /></span>
            </div>
          ))}

          {rows.length > 0 && (
            <div className="tfoot">
              Showing {rows.length} of {reports.length}
              {' '}{reports.length === 1 ? 'report' : 'reports'} filed in total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
