import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';

import { csrAPI } from '../../services/api';
import ConfirmDialog from '../common/ConfirmDialog';
import '../../styles/csrDesign.css';

export default function CSRActivityTypesPage() {
  const navigate = useNavigate();
  // Admin-only route (D1): the catalog is managed in TTA Admin, so anyone who
  // reaches this page may edit it.
  const editable = true;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [isMaster, setIsMaster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });
  const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(asList(await csrAPI.activityTypes.getAll()));
    } catch (e) {
      notify(e.message || 'Failed to load activity types.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await csrAPI.activityTypes.create({ name: name.trim(), isMaster });
      setName('');
      setIsMaster(false);
      notify('Activity type added.');
      load();
    } catch (e) {
      notify(e.message || 'Add failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = (t) => setConfirmState({
    title: 'Delete activity type',
    message: `Delete activity type "${t.name}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      setSaving(true);
      try {
        await csrAPI.activityTypes.delete(t.id);
        notify('Activity type deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      } finally {
        setSaving(false);
        setConfirmState(null);
      }
    },
  });

  return (
    <div className="csrx csrx-page csrx-narrow">
      <div className="ph">
        <div>
          <h2>CSR Activity Types</h2>
          <p>
            The admin-managed catalog of activity types — trials, workshops,
            trainings — that CSR staff pick from when adding an activity. Mark a
            type as a master template if it applies across grants.
          </p>
        </div>
        <button type="button" className="ghostbtn" onClick={() => navigate('/admin')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Admin Settings
        </button>
      </div>

      {editable && (
        <div className="panel addrow">
          <label className="sb">
            <input
              placeholder="New activity type"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            />
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={isMaster}
              onChange={(e) => setIsMaster(e.target.checked)}
            />
            Master
          </label>
          <button type="button" className="newbtn" onClick={add} disabled={saving || !name.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Add
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          {/* Three columns is everything the catalog holds — the serializer
              ships id, name and isMaster and nothing else. Inventing a date or
              a usage count here would be fiction. */}
          <div className="lgrid lgrid--3 lgrid-head">
            {['Activity type', 'Scope', 'Manage'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {types.length === 0 ? (
            <div className="empty">
              <h3>No activity types yet</h3>
              An activity type is what a CSR activity IS — a trial, a workshop, a
              training. Add the first one above.
            </div>
          ) : types.map((t) => (
            <div className="lwrap" key={t.id}>
              <div className="lgrid lgrid--3 lrow">
                <span className="t1">{t.name}</span>
                <span className="t2">
                  {t.isMaster
                    ? <span className="pill plain">Master</span>
                    : 'Grant-specific'}
                </span>
                <span className="lend">
                  {editable && (
                    <button type="button" className="ico r" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                    </button>
                  )}
                </span>
              </div>
            </div>
          ))}

          {types.length > 0 && (
            <div className="tfoot">
              <span className="cnt">
                Showing {types.length} of {types.length}
                {' '}{types.length === 1 ? 'activity type' : 'activity types'} in the catalog
              </span>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
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
        onClose={() => setToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((s) => ({ ...s, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
