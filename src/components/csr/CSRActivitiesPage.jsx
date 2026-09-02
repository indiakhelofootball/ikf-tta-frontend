// src/components/csr/CSRActivitiesPage.jsx
// Activities, across every grant — the sidebar destination the 28 May visual
// flow names, not the per-project tab.
//
// WHAT THIS PAGE IS: a LOG. The spec is explicit that CSR work is reactive —
// "No advance schedule. Activities and payments get filled in as they happen."
// So there is no calendar, no scheduler and no "upcoming" section: newest first,
// oldest last, and a filter for the one axis that matters (which grant).
//
// Grouping by project was the alternative and it is wrong here. A log's whole
// value is that the most recent thing is at the top; grouping shatters that into
// per-grant piles and makes "what happened this week" unanswerable. The project
// is a column and a filter instead.
//
// COLOUR. Activity carries no fixed meaning in the ledger system — see the
// NEUTRAL note in CSRDashboard — so the page leads neutral. The one ink that
// genuinely applies is ochre on 'Planned': logged but not yet done is precisely
// "waiting on you". 'Completed' takes the neutral chip rather than moss, because
// moss means money and an activity is not money.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import '../../styles/csrDesign.css';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

// Where an activity actually lives on the grant page. CSRProjectDetailPage
// reads location.state.tab, so a row can open on the Activities tab instead of
// dropping you on Overview to hunt for the record you just clicked.
const ACTIVITIES_TAB = 2;

// The serializer exposes `date` for point-in-time activities and start/end for
// spans. Sorting needs one comparable value, so fall through in that order and
// use createdAt as the last resort — an activity logged with no date at all
// still belongs somewhere in the log rather than at an arbitrary end.
const sortKey = (a) => String(a.date || a.startDate || a.createdAt || '');

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const whenLabel = (a) => {
  if (a.startDate && a.endDate) return `${fmtDay(a.startDate)} → ${fmtDay(a.endDate)}`;
  return fmtDay(a.date || a.startDate || a.endDate);
};

// Ochre on 'Planned' is the one ink that genuinely applies here: logged but not
// yet done is precisely "waiting on you". 'Completed' takes the neutral chip
// rather than moss, because moss means money and an activity is not money.
function StatusChip({ status }) {
  return (
    <span className={`pill ${status === 'Planned' ? 'wait' : 'closed'}`}>
      {status || 'Unknown'}
    </span>
  );
}

export default function CSRActivitiesPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();

  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // The activity serializer ships projectId, not a project name — the name
      // has to come from the projects list and be joined here.
      const [acts, projs] = await Promise.all([
        csrAPI.activities.getAll(),
        csrAPI.projects.getAll(),
      ]);
      setActivities(asList(acts));
      setProjects(asList(projs));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load activities.');
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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities
      .filter((a) => projectFilter === 'All' || String(a.projectId) === String(projectFilter))
      .filter((a) => {
        if (!q) return true;
        return [a.title, a.location, projectName(a.projectId)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }, [activities, projectFilter, search, projectName]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Activities</h2>
          <p>
            Everything logged across every grant, newest first. Activities are
            recorded as they happen — this is a record, not a schedule.
          </p>
        </div>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <div className="toolbar">
        <label className="sb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            placeholder="Search title, location or grant"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="sel"
          aria-label="Grant"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="All">All grants</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          <div className="lgrid lgrid-head">
            {['Date', 'Activity', 'Location', 'Grant', 'Status'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              <h3>{activities.length === 0 ? 'Nothing logged yet' : 'No activities match'}</h3>
              {activities.length === 0
                ? 'An activity is a thing that happened against a grant — a trial, a workshop, a camp.'
                : 'Clear the search or change the filter.'}
            </div>
          ) : rows.map((a) => (
            <button
              key={a.id}
              type="button"
              className="lgrid lrow"
              aria-label={`Open ${a.title}, logged under ${projectName(a.projectId)}`}
              onClick={() => navigate(`/csr/${a.projectId}`, { state: { tab: ACTIVITIES_TAB } })}
            >
              <span className="fig nowrap">{whenLabel(a)}</span>
              <span className="t1">{a.title}</span>
              <span className="t2">{a.location || '—'}</span>
              <span className="t2">{projectName(a.projectId)}</span>
              <span><StatusChip status={a.status} /></span>
            </button>
          ))}

          {rows.length > 0 && (
            <div className="tfoot">
              Showing {rows.length} of {activities.length}
              {' '}{activities.length === 1 ? 'activity' : 'activities'} logged in total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
