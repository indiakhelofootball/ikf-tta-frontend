// D-021: a CSR partner is a vendor picked from the TTA Admin vendor-name list,
// never typed, plus a partner type. The vendor is fixed once the partner
// exists; only the type and active state change. Address, PAN and bank stay
// on the TTA vendor record.
// D-022: a partner may also point at the TTA vendor record it is paid through.
// That link is optional and read-only towards TTA; payments stay in TTA.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import { getPartnerCategories } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import '../../styles/csrDesign.css';

const VENDOR_HELP = 'Picked from the TTA vendor list. To add a new vendor name, ask an admin to add it in TTA Admin.';

const fieldError = (data, key) => {
  const v = data?.[key];
  if (!v) return '';
  return Array.isArray(v) ? v[0] : String(v);
};

const RECORD_HELP = 'Optional. The vendor record in TTA this partner is paid through. Payments stay in TTA.';

const vendorLabel = (v) => (v.serviceType ? `${v.name} · ${v.serviceType}` : v.name);

const vendorRecordLabel = (r) => [
  r.name || `#${r.id}`,
  r.vendorType,
  [r.city, r.state].filter(Boolean).join(', '),
].filter(Boolean).join(' · ');

export default function CSRPartnerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [partner, setPartner] = useState(null);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [vendorQuery, setVendorQuery] = useState('');
  const [form, setForm] = useState({ vendorNameId: '', vendorId: '', partnerCategoryId: '', isActive: true });
  const [vendorRecords, setVendorRecords] = useState([]);
  const [recordsState, setRecordsState] = useState('idle');
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfgVersion = useConfigVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const partnerCategories = useMemo(() => getPartnerCategories(), [cfgVersion]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    const request = isEdit ? csrAPI.partnerRecords.getById(id) : csrAPI.partnerRecords.vendorOptions();
    request
      .then((data) => {
        if (cancelled) return;
        if (isEdit) {
          setPartner(data);
          setForm({
            vendorNameId: data.vendorNameId ?? '',
            vendorId: data.vendorId ?? '',
            partnerCategoryId: data.partnerCategoryId ?? '',
            isActive: data.isActive !== false,
          });
        } else {
          setVendorOptions(Array.isArray(data) ? data : data?.results || []);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  useEffect(() => {
    const vendorNameId = form.vendorNameId;
    if (vendorNameId === '') {
      setVendorRecords([]);
      setRecordsState('idle');
      return undefined;
    }
    let cancelled = false;
    setRecordsState('loading');
    csrAPI.partnerRecords.vendorRecords(vendorNameId)
      .then((data) => {
        if (cancelled) return;
        setVendorRecords(Array.isArray(data) ? data : data?.results || []);
        setRecordsState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setVendorRecords([]);
        setRecordsState('failed');
      });
    return () => { cancelled = true; };
  }, [form.vendorNameId]);

  // A linked record that no longer matches the name list stays visible as
  // itself, so the select does not show "not set up" while the link holds.
  const recordOptions = useMemo(() => {
    const heldId = partner?.vendorId;
    if (heldId == null || vendorRecords.some((r) => String(r.id) === String(heldId))) return vendorRecords;
    return [...vendorRecords, partner.vendorRecord || { id: heldId }];
  }, [vendorRecords, partner]);

  // The picked vendor stays in the list while the filter narrows, so the select
  // never silently drops the current choice.
  const shownVendors = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    const sorted = [...vendorOptions].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (!q) return sorted;
    return sorted.filter((v) => String(v.id) === String(form.vendorNameId)
      || `${v.name} ${v.serviceType || ''}`.toLowerCase().includes(q));
  }, [vendorOptions, vendorQuery, form.vendorNameId]);

  const setField = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((errs) => ({ ...errs, [k]: '' }));
  };

  const pickVendor = (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, vendorNameId: value, vendorId: '' }));
    setErrors((errs) => ({ ...errs, vendorNameId: '', vendorId: '' }));
  };

  const back = () => navigate(isEdit ? `/csr/partners/${id}` : '/csr/partners');

  const noVendors = !isEdit && vendorOptions.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!isEdit && form.vendorNameId === '') next.vendorNameId = 'Pick a vendor.';
    if (form.partnerCategoryId === '') next.partnerCategoryId = 'Pick a partner type.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      partnerCategoryId: Number(form.partnerCategoryId),
      vendorId: form.vendorId === '' ? null : Number(form.vendorId),
    };
    if (isEdit) body.isActive = form.isActive;
    else body.vendorNameId = Number(form.vendorNameId);

    setSaving(true);
    setSaveError('');
    try {
      const saved = isEdit
        ? await csrAPI.partnerRecords.update(id, body)
        : await csrAPI.partnerRecords.create(body);
      navigate(`/csr/partners/${saved?.id ?? id}`, { state: { saved: isEdit ? 'Partner updated.' : 'Partner added.' } });
    } catch (err) {
      const data = err?.response?.data;
      const fields = {
        vendorNameId: fieldError(data, 'vendorNameId'),
        vendorId: fieldError(data, 'vendorId'),
        partnerCategoryId: fieldError(data, 'partnerCategoryId'),
      };
      setErrors(fields);
      if (!Object.values(fields).some(Boolean)) {
        setSaveError(err?.message || 'Could not save this partner. Please try again.');
      }
      setSaving(false);
    }
  };

  let recordHelp = RECORD_HELP;
  if (recordsState === 'loading') recordHelp = 'Loading TTA vendor records…';
  else if (recordsState === 'failed') recordHelp = 'The TTA vendor records could not be loaded. Try again in a moment.';
  else if (recordOptions.length === 0) recordHelp = 'No vendor record with this name in TTA yet.';

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">{isEdit ? 'Loading partner…' : 'Loading vendor list…'}</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>{isEdit ? 'Partner not found' : 'Vendor list unavailable'}</h2>
          <p>
            {isEdit
              ? `No partner could be loaded for reference ${id}. It may have been removed, or you may not have access to it.`
              : 'The TTA vendor list could not be loaded. Try again in a moment.'}
          </p>
          <button type="button" className="ghostbtn" onClick={() => navigate('/csr/partners')}>
            Back to partners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csrx csrx-page">
      <nav className="pform-crumb" aria-label="Breadcrumb">
        <button type="button" className="pform-back" onClick={() => navigate('/csr/partners')}>
          Partners
        </button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{isEdit ? `Edit ${partner?.name || 'Partner'}` : 'New Partner'}</span>
      </nav>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <section className="pform-sec pform-sec--grant">
          <h2 className="pform-legend">Partner</h2>

          <div className="pform-field">
            <label htmlFor="p-vendor">
              Vendor {!isEdit && <span className="pform-req" aria-hidden="true">*</span>}
            </label>
            {isEdit ? (
              <input
                id="p-vendor" type="text" readOnly
                value={partner ? vendorLabel(partner) : ''}
                aria-describedby="p-vendor-help"
              />
            ) : (
              <>
                <input
                  type="search"
                  placeholder="Search vendors"
                  aria-label="Search vendors"
                  value={vendorQuery}
                  onChange={(e) => setVendorQuery(e.target.value)}
                  disabled={noVendors}
                />
                <select
                  id="p-vendor" className="sel" value={form.vendorNameId}
                  onChange={pickVendor}
                  disabled={noVendors}
                  aria-invalid={Boolean(errors.vendorNameId)}
                  aria-describedby="p-vendor-help"
                >
                  <option value="">— pick a vendor —</option>
                  {shownVendors.map((v) => (
                    <option key={v.id} value={v.id}>{vendorLabel(v)}</option>
                  ))}
                </select>
              </>
            )}
            <p id="p-vendor-help" className={`pform-help${errors.vendorNameId ? ' bad' : ''}`}>
              {errors.vendorNameId || (noVendors
                ? `No vendors can be added right now. ${VENDOR_HELP}`
                : VENDOR_HELP)}
            </p>
          </div>

          {form.vendorNameId !== '' && (
            <div className="pform-field">
              <label htmlFor="p-vendor-record">TTA vendor record</label>
              <select
                id="p-vendor-record" className="sel" value={form.vendorId}
                onChange={setField('vendorId')}
                disabled={recordsState === 'loading'}
                aria-invalid={Boolean(errors.vendorId)}
                aria-describedby="p-vendor-record-help"
              >
                <option value="">Not set up in TTA yet</option>
                {recordOptions.map((r) => (
                  <option key={r.id} value={r.id}>{vendorRecordLabel(r)}</option>
                ))}
              </select>
              <p id="p-vendor-record-help" className={`pform-help${errors.vendorId ? ' bad' : ''}`}>
                {errors.vendorId || recordHelp}
              </p>
            </div>
          )}

          <div className="pform-field">
            <label htmlFor="p-category">Partner type <span className="pform-req" aria-hidden="true">*</span></label>
            <select
              id="p-category" className="sel" value={form.partnerCategoryId}
              onChange={setField('partnerCategoryId')}
              aria-invalid={Boolean(errors.partnerCategoryId)}
              aria-describedby="p-category-help"
            >
              <option value="">— pick a partner type —</option>
              {partnerCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p id="p-category-help" className={`pform-help${errors.partnerCategoryId ? ' bad' : ''}`}>
              {errors.partnerCategoryId || (partnerCategories.length === 0
                ? 'No partner types in the catalog yet. An admin adds them in TTA Admin.'
                : 'What this partner does, e.g. life skills, player development, education.')}
            </p>
          </div>

          {isEdit && (
            <div className="pform-field">
              <label className="chk" htmlFor="p-active">
                <input id="p-active" type="checkbox" checked={form.isActive} onChange={setField('isActive')} />
                Active
              </label>
              <p className="pform-help">An inactive partner stays on past activities but cannot be picked for new ones.</p>
            </div>
          )}
        </section>

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={back} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving || noVendors}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
