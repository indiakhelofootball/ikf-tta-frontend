import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import '../../styles/csrDesign.css';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

export default function CSRPartnersPage() {
  const navigate = useNavigate();
  const { canView, canEdit } = useGrants();

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPartners(asList(await csrAPI.partnerRecords.getAll()));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load partners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...partners].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!q) return sorted;
    return sorted.filter((p) => [p.name, p.partnerCategoryName]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [partners, search]);

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  const open = (p) => navigate(`/csr/partners/${p.id}`);

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Partners</h2>
          <p>
            The organisations that deliver CSR work: life skills, player
            development, education. Each one is a vendor from the TTA vendor list.
          </p>
        </div>
        {canEdit('csr') && (
          <button type="button" className="newbtn" onClick={() => navigate('/csr/partners/new')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Add partner
          </button>
        )}
      </div>

      {error && <Alert severity="error" className="pt-alert">{error}</Alert>}

      <div className="toolbar">
        <label className="sb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            placeholder="Search name or partner type"
            aria-label="Search partners"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          <div className="lgrid lgrid--partners lgrid-head">
            {['Partner', 'Partner type', 'Activities', 'Contacts', 'Status'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              {partners.length === 0
                ? 'No partners yet. Add a vendor from the TTA vendor list as a CSR partner.'
                : 'No partners match. Clear the search.'}
            </div>
          ) : rows.map((p) => (
            <div className="lwrap" key={p.id}>
              <div
                role="button"
                tabIndex={0}
                className="lgrid lgrid--partners lrow"
                aria-label={`Open ${p.name}`}
                onClick={() => open(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(p);
                  }
                }}
              >
                <span className="t1">{p.name}</span>
                <span className="t2">{p.partnerCategoryName || '—'}</span>
                <span className="fig nowrap">{p.activityCount ?? 0} {p.activityCount === 1 ? 'activity' : 'activities'}</span>
                <span className="fig nowrap">{p.contactCount ?? 0} {p.contactCount === 1 ? 'contact' : 'contacts'}</span>
                <span className="lend">
                  <span className={`pill ${p.isActive ? 'act' : 'closed'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
            </div>
          ))}

          {partners.length > 0 && (
            <div className="tfoot">
              <span className="cnt">
                Showing {rows.length} of {partners.length}
                {' '}{partners.length === 1 ? 'partner' : 'partners'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
