// CSR Projects — the DECIDED design (green · glass · Fontshare), rebuilt as a
// full-width colour-coded data table. Data/state logic is unchanged; the render
// is pure markup styled entirely by src/styles/csrDesign.css (scope: .csrx).
// No MUI sx, no coral-era theme tokens, no inline styles beyond page padding.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';

import ConfirmDialog from '../common/ConfirmDialog';
import CSRProjectModal from './CSRProjectModal';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import '../../styles/csrDesign.css';

const PAGE_SIZE = 8;

const SORTS = {
  latest: { compare: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) },
  name: { compare: (a, b) => String(a.name || '').localeCompare(String(b.name || '')) },
  amount: { compare: (a, b) => (Number(b.sanctionedAmount) || 0) - (Number(a.sanctionedAmount) || 0) },
};

// deterministic 1..8 palette index from a string (funder → colour, project → avatar)
const paletteIdx = (str) => {
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 8) + 1;
};
const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
};

const statusPill = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'closed') return { cls: 'closed', label: 'Closed' };
  if (s.includes('await') || s.includes('pending')) return { cls: 'wait', label: status };
  if (s.includes('over')) return { cls: 'over', label: status };
  return { cls: 'act', label: status || 'Active' };
};

export default function CSRProjectManagementPage() {
  const { canEdit } = useGrants();
  const editable = canEdit('csr');
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState('latest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await csrAPI.projects.getAll();
      setProjects(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      notify(e.message || 'Failed to load projects.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(() => load(true));

  const openCreate = () => { setEditing(null); setModalOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await csrAPI.projects.update(editing.id, payload);
        notify('Project updated.');
      } else {
        await csrAPI.projects.create(payload);
        notify('Project created.');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => (statusFilter === 'All' ? true : p.status === statusFilter))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.ttaProjectName?.toLowerCase().includes(q) ||
          p.season?.toLowerCase().includes(q)
        );
      })
      .sort(SORTS[sortKey].compare);
  }, [projects, search, statusFilter, sortKey]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  useEffect(() => { setPage(1); }, [search, statusFilter, sortKey]);

  const openRow = (p) => { setSelectedId(p.id); navigate(`/csr/${p.id}`); };

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>CSR Projects</h2>
          <p>Every grant IKF holds, and what has been promised against it.</p>
        </div>
        {editable && (
          <button type="button" className="newbtn" onClick={openCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            New Project
          </button>
        )}
      </div>

      <div className="toolbar">
        <label className="sb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            placeholder="Search by project, funder or TTA project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="segbar" role="tablist" aria-label="Status filter">
          {['All', 'Active', 'Closed'].map((s) => (
            <button
              key={s}
              type="button"
              className={`s${statusFilter === s ? ' on' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          <table className="dt">
            <thead>
              <tr>
                <th className={sortKey === 'name' ? 'on' : ''} onClick={() => setSortKey('name')}>
                  Project <span className="car">▾</span>
                </th>
                <th>Funder</th>
                <th className={`r${sortKey === 'amount' ? ' on' : ''}`} onClick={() => setSortKey('amount')}>
                  Sanctioned <span className="car">⇅</span>
                </th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <h3>{projects.length === 0 ? 'No grants yet' : 'No projects match'}</h3>
                      {projects.length === 0
                        ? 'A CSR project records what a funder sanctioned and what IKF promised in return.'
                        : 'Clear the search or change the filter.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((p) => {
                  const st = statusPill(p.status);
                  return (
                    <tr key={p.id} className={p.id === selectedId ? 'sel' : ''} onClick={() => openRow(p)}>
                      <td>
                        <div className="pcell">
                          <div className={`av a${paletteIdx(p.id)}`}>{initials(p.name)}</div>
                          <div>
                            <div className="nm">{p.name}</div>
                            {p.season && <div className="loc">{p.season}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`chip plain k${paletteIdx(p.clientName)}`}>{p.clientName || '—'}</span></td>
                      <td className="r amt fig">{fmtMoney(p.sanctionedAmount)}</td>
                      <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <span className="rowchev">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="tfoot">
              <span className="cnt">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              {pageCount > 1 && (
                <div className="pgr">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" className={`b${n === safePage ? ' on' : ''}`} onClick={() => setPage(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CSRProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={saving}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
