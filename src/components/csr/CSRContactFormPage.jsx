// CSR contact form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded), CSRActivityFormPage and CSRReportFormPage.
//
// Fields, validation and payload shape are carried over unchanged from
// CSRContactModal; the comments explaining WHY a field behaves as it does
// come with them.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import { getPartnerCategories } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import '../../styles/csrDesign.css';

// The three sides the 26 Aug review named: IKF representative, client
// representative, vendor representative. Blank stays selectable because
// contacts recorded before the field existed carry no type, and picking one
// for them would be inventing a fact about a real person.
// The stored values are the API's, and they do not change. The LABELS are what
// the client reads, and on 26 Aug (08:18) he named them himself: «vendor भी होगा
// ना partner, partner representative। vendor is the partner» — in his language a
// vendor IS the partner, so the form says partner and the database keeps Vendor.
const CONTACT_TYPES = [
  { value: 'Client', label: 'Client representative' },
  { value: 'IKF', label: 'IKF representative' },
  { value: 'Vendor', label: 'Partner representative' },
];

// Only a partner representative has a partner category. The API refuses the
// combination outright, so the field is not merely hidden for the other two —
// it is cleared when the type moves away from partner.
const PARTNER_TYPE = 'Vendor';

const EMPTY = {
  name: '', designation: '', contactType: '', partnerCategoryId: '', email: '', phone: '',
};

export default function CSRContactFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const projectIdFromQuery = searchParams.get('project');

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [contact, setContact] = useState(null);
  const [knownContacts, setKnownContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const projectId = contact?.projectId ?? (projectIdFromQuery ? Number(projectIdFromQuery) : null);

  useEffect(() => {
    if (!isEdit) {
      setContact(null);
      setForm(EMPTY);
      setError('');
      setLoading(false);
      setLoadFailed(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    csrAPI.contacts.getById(id)
      .then((data) => {
        if (cancelled) return;
        setContact(data);
        setForm({
          name: data.name || '',
          designation: data.designation || '',
          contactType: data.contactType || '',
          partnerCategoryId: data.partnerCategoryId ?? '',
          email: data.email || '',
          phone: data.phone || '',
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // The same IKF/client people are re-typed on every grant (client review,
  // 26 Aug — "IKF has 5-6 contacts"). Dedupe by email so one person picked
  // across many grants shows once; contacts with no email fall back to a
  // lowercased name so they still collapse.
  useEffect(() => {
    let cancelled = false;
    csrAPI.contacts.getAll().then((data) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? data : data?.results || [];
      const byKey = new Map();
      list.forEach((c) => {
        const key = (c.email || '').trim().toLowerCase() || (c.name || '').trim().toLowerCase();
        if (key && !byKey.has(key)) byKey.set(key, c);
      });
      setKnownContacts(
        Array.from(byKey.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      );
    }).catch(() => {
      if (!cancelled) setKnownContacts([]);
    });
    return () => { cancelled = true; };
  }, []);

  // The SAME catalog that classifies a partner vendor, read the same way the
  // activity form reads its workshop list. A second list for one question is
  // how two screens start disagreeing about what a partner does.
  const cfgVersion = useConfigVersion();
  const partnerCategories = useMemo(() => getPartnerCategories(), [cfgVersion]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Moving off the partner type drops the category with it. Leaving it set
  // would send a combination the API refuses, and the operator would be looking
  // at an error about a field the form is no longer showing them.
  const handleTypeChange = (e) => {
    const contactType = e.target.value;
    setForm((f) => ({
      ...f,
      contactType,
      partnerCategoryId: contactType === PARTNER_TYPE ? f.partnerCategoryId : '',
    }));
  };

  // Picking a suggestion prefills the other fields but never carries the
  // source contact's id — each grant keeps its own contact row, this is just
  // a shortcut for typing the same person in again. A native <input list>
  // sets the text value on pick; matching that text against a known contact's
  // name is how the prefill still fires without the MUI Autocomplete this
  // replaced.
  const handleNameChange = (e) => {
    const value = e.target.value;
    const picked = knownContacts.find((c) => c.name === value);
    if (picked) {
      setForm((f) => ({
        ...f,
        name: picked.name || f.name,
        designation: picked.designation || f.designation,
        email: picked.email || f.email,
        phone: picked.phone || f.phone,
      }));
    } else {
      setForm((f) => ({ ...f, name: value }));
    }
  };

  const leave = useCallback(
    (saved) => {
      if (!projectId) { navigate('/csr/projects'); return; }
      navigate(`/csr/${projectId}`, saved ? { state: { saved } } : undefined);
    },
    [navigate, projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    const payload = {
      name: form.name.trim(),
      designation: form.designation.trim(),
      contactType: form.contactType,
      // null, not '' — this is an FK. Sending an empty string would be a 400
      // on a field the operator deliberately left blank.
      partnerCategoryId: form.contactType === PARTNER_TYPE && form.partnerCategoryId !== ''
        ? Number(form.partnerCategoryId)
        : null,
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    if (!isEdit) payload.projectId = projectId;
    setSaving(true);
    setSaveError('');
    try {
      if (isEdit) await csrAPI.contacts.update(id, payload);
      else await csrAPI.contacts.create(payload);
      leave(isEdit ? 'Contact updated.' : 'Contact added.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the contact is gone and the person has nothing to
      // retry.
      setSaveError(err?.message || 'Could not save this contact. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">Loading contact…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>Contact not found</h2>
          <p>
            No contact could be loaded for reference {id}. It may have been
            deleted, or you may not have access to it.
          </p>
          <button type="button" className="ghostbtn" onClick={() => leave()}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!isEdit && !projectId) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>No grant selected</h2>
          <p>A contact has to belong to a grant. Open it from the grant's Contacts tab.</p>
          <button type="button" className="ghostbtn" onClick={() => navigate('/csr/projects')}>
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csrx csrx-page">
      <nav className="pform-crumb" aria-label="Breadcrumb">
        <button type="button" className="pform-back" onClick={() => leave()}>
          {contact?.projectName || 'Grant'}
        </button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{isEdit ? 'Edit Contact' : 'New Contact'}</span>
      </nav>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <section className="pform-sec pform-sec--grant">
          <h2 className="pform-legend">Who they are</h2>
          {/* Type comes FIRST. 26 Aug, 08:07: «अच्छे last में दोगे ना ये, शुरू
              में ही पहले select drop downs select कराओगे ना» — "you're giving
              this at the end; make them select it at the very start". Whose
              representative this is decides which master you would look the
              person up in, so asking it after the name is asking it too late. */}
          <p className="pform-sub">Whose representative this is.</p>

          <div className="pform-field">
            <label htmlFor="c-type">Contact Type</label>
            <select id="c-type" className="sel" value={form.contactType} onChange={handleTypeChange}>
              <option value="">—</option>
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* WHICH KIND of partner, asked only once the answer can mean
              something. The type above says which side this person sits on;
              for a partner that is not enough, because a grant runs life
              skills, player development and education partners at the same
              time and their representatives are otherwise indistinguishable. */}
          {form.contactType === PARTNER_TYPE && (
            <div className="pform-field">
              <label htmlFor="c-partner-category">Partner Type</label>
              <select
                id="c-partner-category" className="sel" value={form.partnerCategoryId}
                onChange={setField('partnerCategoryId')}
                disabled={partnerCategories.length === 0}
                aria-describedby="c-partner-category-help"
              >
                <option value="">— none —</option>
                {partnerCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p id="c-partner-category-help" className="pform-help">
                {partnerCategories.length === 0
                  ? 'No partner types in the catalog yet — an admin adds them in TTA Admin → Setup.'
                  : 'What this partner does, e.g. life skills, player development, education.'}
              </p>
            </div>
          )}

          <div className="pform-field">
            <label htmlFor="c-name">Name <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${form.name.trim() ? ' ok' : ''}`}>
              <input
                id="c-name" type="text" list="c-known" value={form.name} onChange={handleNameChange}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'c-name-help' : undefined}
              />
            </div>
            {/* A native <input list> only offers what the browser's own picker
                renders, so it cannot show the email under each name the way the
                MUI Autocomplete's option did — the tradeoff for leaving MUI
                behind. The name alone is still enough to recognise "Aditi
                Rane" and pick her up rather than retyping. */}
            <datalist id="c-known">
              {knownContacts.map((c) => (
                <option key={c.id ?? `${c.name}-${c.email}`} value={c.name} />
              ))}
            </datalist>
            {error ? <p id="c-name-help" className="pform-help bad">{error}</p> : null}
          </div>
        </section>

        <section className="pform-sec pform-sec--detail">
          <h2 className="pform-legend">Contact details</h2>

          <div className="pform-field">
            <label htmlFor="c-designation">Designation</label>
            <input id="c-designation" type="text" value={form.designation} onChange={setField('designation')} />
          </div>

          <div className="pform-row">
            <div className="pform-field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" type="text" value={form.email} onChange={setField('email')} />
            </div>
            <div className="pform-field">
              <label htmlFor="c-phone">Phone</label>
              <input id="c-phone" type="text" value={form.phone} onChange={setField('phone')} />
            </div>
          </div>
        </section>

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
