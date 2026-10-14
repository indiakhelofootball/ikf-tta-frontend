import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Snackbar } from '@mui/material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import ConfirmDialog from '../common/ConfirmDialog';
import { activityStatusPillClass } from './activityVisibility';
import '../../styles/csrDesign.css';

// CSRProjectDetailPage reads location.state.tab; 2 is its Activities tab, the
// same value CSRActivitiesPage sends.
const ACTIVITIES_TAB = 2;

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CSRPartnerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canView, canEdit } = useGrants();

  const [partner, setPartner] = useState(null);
  const [delivered, setDelivered] = useState({ activities: [], contacts: [] });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deliveredError, setDeliveredError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [toast, setToast] = useState(location.state?.saved || '');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setPartner(await csrAPI.partnerRecords.getById(id));
    } catch {
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    try {
      const data = await csrAPI.partnerRecords.delivered(id);
      setDelivered({ activities: data?.activities || [], contacts: data?.contacts || [] });
      setDeliveredError('');
    } catch (e) {
      setDeliveredError(e.message || 'Could not load what this partner delivered.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    setRemoving(true);
    try {
      await csrAPI.partnerRecords.delete(id);
      navigate('/csr/partners');
    } catch (e) {
      setRemoveError(e?.response?.data?.detail || e.message || 'Could not remove this partner.');
      setConfirmOpen(false);
      setRemoving(false);
    }
  };

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">Loading partner…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>Partner not found</h2>
          <p>
            No partner could be loaded for reference {id}. It may have been
            removed, or you may not have access to it.
          </p>
          <button type="button" className="ghostbtn" onClick={() => navigate('/csr/partners')}>
            Back to partners
          </button>
        </div>
      </div>
    );
  }

  const { activities, contacts } = delivered;
  const openGrant = (projectId) => navigate(`/csr/${projectId}`, { state: { tab: ACTIVITIES_TAB } });

  return (
    <div className="csrx csrx-page">
      <nav className="pform-crumb" aria-label="Breadcrumb">
        <button type="button" className="pform-back" onClick={() => navigate('/csr/partners')}>
          Partners
        </button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{partner.name}</span>
      </nav>

      <div className="ph">
        <div>
          <h2>{partner.name}</h2>
          <p>TTA service type: {partner.serviceType || 'Not set'}</p>
        </div>
        {canEdit('csr') && (
          <div className="pt-acts">
            <button type="button" className="ghostbtn" onClick={() => navigate(`/csr/partners/${id}/edit`)}>
              Edit
            </button>
            <button type="button" className="newbtn danger" onClick={() => { setRemoveError(''); setConfirmOpen(true); }}>
              Remove
            </button>
          </div>
        )}
      </div>

      {removeError && <Alert severity="error" className="pt-alert">{removeError}</Alert>}

      <div className="panel pt-facts">
        <div className="dtl">
        <div className="facts nb">
          <div className="fc">
            <div className="fl">Partner type</div>
            <div className={`fv${partner.partnerCategoryName ? '' : ' em'}`}>{partner.partnerCategoryName || 'Not set'}</div>
          </div>
          <div className="fc">
            <div className="fl">Address</div>
            <div className={`fv pt-addr${partner.address ? '' : ' em'}`}>{partner.address || 'Not recorded'}</div>
          </div>
          <div className="fc">
            <div className="fl">Status</div>
            <div className="fv">
              <span className={`pill ${partner.isActive ? 'act' : 'closed'}`}>
                {partner.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {deliveredError && <Alert severity="error" className="pt-alert">{deliveredError}</Alert>}

      <section className="pt-sec" aria-labelledby="pt-acts-h">
        <h3 id="pt-acts-h" className="pt-h">Activities delivered</h3>
        <div className="twrap">
          <div className="lgrid lgrid--pacts lgrid-head">
            {['Date', 'Activity', 'Type', 'Grant', 'City', 'Status'].map((h) => <span key={h}>{h}</span>)}
          </div>
          {activities.length === 0 ? (
            <div className="empty">No activities name this partner yet.</div>
          ) : activities.map((a) => (
            <div className="lwrap" key={a.id}>
              <div className="lgrid lgrid--pacts lrow">
                <span className="fig nowrap">{fmtDay(a.startDate)}</span>
                <span className="t1">
                  <button type="button" className="pt-link" onClick={() => openGrant(a.projectId)}>
                    {a.title}
                  </button>
                </span>
                <span className="t2">{a.activityType || '—'}</span>
                <span className="t2">{a.projectName || '—'}</span>
                <span className="t2">{a.city || '—'}</span>
                <span className="lend">
                  <span className={`pill ${activityStatusPillClass(a.status)}`}>{a.status || 'Unknown'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-sec" aria-labelledby="pt-contacts-h">
        <h3 id="pt-contacts-h" className="pt-h">Contacts</h3>
        <div className="twrap">
          <div className="lgrid lgrid--pcontacts lgrid-head">
            {['Name', 'Designation', 'Email', 'Grant', 'Phone'].map((h) => <span key={h}>{h}</span>)}
          </div>
          {contacts.length === 0 ? (
            <div className="empty">No contacts represent this partner yet.</div>
          ) : contacts.map((c) => (
            <div className="lwrap" key={c.id}>
              <div className="lgrid lgrid--pcontacts lrow">
                <span className="t1">{c.name}</span>
                <span className="t2">{c.designation || '—'}</span>
                <span className="t2">{c.email || '—'}</span>
                <span className="t2">{c.projectName || '—'}</span>
                <span className="fig nowrap">{c.phone || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove partner"
        message={`Remove ${partner.name} as a CSR partner? The vendor stays in the TTA vendor list.`}
        confirmLabel="Remove"
        busy={removing}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </div>
  );
}
