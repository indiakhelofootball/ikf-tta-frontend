// CSR Projects — MASTER-DETAIL, as the approved reference draws it: the grant
// list on the left, the whole record on the right. You never leave this screen
// to read a grant; clicking a row fills the pane beside it.
//
// This replaced a full-width flat table. The table was not a smaller version of
// the reference, it was a different screen: it showed four columns and then had
// to navigate away for everything else — funder, dates, work order, certificate
// state, description. The reference puts all of that one click from the list,
// which is the whole point of the layout.
//
// Data/state logic is unchanged. The render is pure markup styled entirely by
// src/styles/csrDesign.css (scope: .csrx). No MUI sx, no inline styles.
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
  latest: { label: 'Latest', compare: (a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) },
  name: { label: 'Name', compare: (a, b) => String(a.name || '').localeCompare(String(b.name || '')) },
  amount: { label: 'Amount', compare: (a, b) => (Number(b.sanctionedAmount) || 0) - (Number(a.sanctionedAmount) || 0) },
};
const SORT_KEYS = Object.keys(SORTS);

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

const fmtDay = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusPill = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'closed') return { cls: 'closed', label: 'Closed' };
  if (s.includes('await') || s.includes('pending')) return { cls: 'wait', label: status };
  if (s.includes('over')) return { cls: 'over', label: status };
  return { cls: 'act', label: status || 'Active' };
};

// One cell of the fact strip. An absent value is shown as absent rather than
// omitted — a missing work order is information, and a strip that reflows when
// a field is empty stops being scannable down the column.
function Fact({ label, value, empty = '—' }) {
  const has = value !== null && value !== undefined && value !== '';
  return (
    <div className="fc">
      <div className="fl">{label}</div>
      <div className={`fv${has ? '' : ' em'}`}>{has ? value : empty}</div>
    </div>
  );
}

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
  const openEdit = (p) => { setEditing(p); setModalOpen(true); };
  const cycleSort = () =>
    setSortKey((k) => SORT_KEYS[(SORT_KEYS.indexOf(k) + 1) % SORT_KEYS.length]);

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

  // The detail pane must never sit empty while there is a row to show, and the
  // selection has to survive a filter change that drops the selected grant.
  const selected = useMemo(
    () => paged.find((p) => p.id === selectedId) || paged[0] || null,
    [paged, selectedId],
  );

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
              role="tab"
              aria-selected={statusFilter === s}
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
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h3>{projects.length === 0 ? 'No grants yet' : 'No projects match'}</h3>
            {projects.length === 0
              ? 'A CSR project records what a funder sanctioned and what IKF promised in return.'
              : 'Clear the search or change the filter.'}
          </div>
        </div>
      ) : (
        <div className="md">
          {/* ---- the list ---- */}
          <div className="panel">
            <div className="lh">
              <span>All projects ({filtered.length})</span>
              <button type="button" className="sort" onClick={cycleSort}>
                Sort by: {SORTS[sortKey].label} <span className="cv">▾</span>
              </button>
            </div>

            {paged.map((p) => {
              const st = statusPill(p.status);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`lr${p.id === selected?.id ? ' on' : ''}`}
                  aria-current={p.id === selected?.id ? 'true' : undefined}
                  aria-label={`Show ${p.clientName || 'no funder'}, ${p.name}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  {/* 26 Aug review, 04:35: "उल्टा" — the funder was showing small
                      and the project name large, and it should be reversed: the
                      funder is prime. .nm carries the bold/ink treatment, .fn
                      the small/muted one — the classes stay put, the strings
                      that fill them swap. The avatar still hashes off p.name,
                      untouched (constraint: palette index is keyed off it). */}
                  <span className={`av a${paletteIdx(p.id)}`}>{initials(p.name)}</span>
                  <span className="lc">
                    <span className="nm">{p.clientName || '—'}</span>
                    <span className="fn">{p.name}</span>
                  </span>
                  <span className="rt">
                    <span className="am fig">{fmtMoney(p.sanctionedAmount)}</span>
                    <span className={`stt${st.cls === 'act' ? '' : ' off'}`}>{st.label}</span>
                  </span>
                  <span className="cv">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                </button>
              );
            })}

            {pageCount > 1 && (
              <div className="pager">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pg${n === safePage ? ' on' : ''}`}
                    aria-label={`Page ${n}`}
                    aria-current={n === safePage ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---- the record ---- */}
          <div className="panel">
            {!selected ? (
              <div className="dempty">Select a grant to see its record.</div>
            ) : (
              <div className="dtl">
                <div className="dh">
                  <div>
                    {/* 26 Aug review, 04:35: "BDSA तुम्हारा prime रहेगा" — the
                        funder is the prime line (serif h3), the project name
                        drops to .sub beside the sanctioned amount. */}
                    <h3>{selected.clientName || '—'}</h3>
                    <div className="sub">
                      {selected.name} · <b className="fig">{fmtMoney(selected.sanctionedAmount)}</b>
                    </div>
                  </div>
                  <div className="acts">
                    <span className={`pill ${statusPill(selected.status).cls}`}>
                      {statusPill(selected.status).label}
                    </span>
                    {editable && (
                      <button type="button" className="ico g" aria-label={`Edit ${selected.name}`} onClick={() => openEdit(selected)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                    )}
                    <button type="button" className="ico" aria-label={`Open the full page for ${selected.name}`} onClick={() => navigate(`/csr/${selected.id}`)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                </div>

                <div className="facts">
                  <Fact label="TTA Project" value={selected.ttaProjectName} empty="Not linked yet" />
                  <Fact label="Client / Funder" value={selected.clientName} />
                  <Fact label="Sanctioned" value={fmtMoney(selected.sanctionedAmount)} />
                  <Fact label="Season" value={selected.season} empty="Not set" />
                </div>
                <div className="facts nb">
                  <Fact label="Start Date" value={fmtDay(selected.startDate)} />
                  <Fact label="End Date" value={fmtDay(selected.endDate)} />
                  <Fact label="Work Order" value={selected.workOrderNumber} />
                  <Fact label="Certificate" value={selected.certificateFrozenAt ? 'Frozen' : 'Live'} />
                </div>

                <div className="blocks">
                  <div className="blk">
                    <h4>About the project</h4>
                    <p>{selected.description || 'No description recorded yet.'}</p>
                  </div>
                  <div className="blk">
                    <div className="sr">
                      <div>
                        <div className="sl">Funder</div>
                        <div className="sv">{selected.clientName || '—'}</div>
                      </div>
                    </div>
                    <div className="sr">
                      <div>
                        <div className="sl">Contract</div>
                        <div className="sv">
                          {selected.workOrderContractLink ? (
                            <a href={selected.workOrderContractLink} target="_blank" rel="noopener noreferrer">
                              Open contract
                            </a>
                          ) : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="sr">
                      <div>
                        <div className="sl">Status</div>
                        <div className="sv">{selected.status || 'Active'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stamp">
                  {fmtDay(selected.createdAt) ? `Created on ${fmtDay(selected.createdAt)}` : ''}
                  {fmtDay(selected.updatedAt) ? ` · Updated on ${fmtDay(selected.updatedAt)}` : ''}
                </div>
              </div>
            )}
          </div>
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
