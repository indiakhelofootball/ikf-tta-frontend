// CSR contact form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded), CSRActivityFormPage and CSRReportFormPage.
//
// D-037: the person is picked from the Admin contacts list and sent as
// personId; name, designation, email and phone are the person's, shown
// read-only, so one edit in Admin reaches every grant.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import CSRCombobox from './CSRCombobox';
import { GRANT_TABS, grantTabState } from './grantTabs';
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

// Only a partner representative names a partner organisation. The field is
// not merely hidden for the other two — it is cleared when the type moves away
// from partner.
const PARTNER_TYPE = 'Vendor';

const EMPTY = { personId: '', contactType: '', partnerId: '' };

const rowsOf = (data) => (Array.isArray(data) ? data : data?.results || []);

const fieldError = (data, key) => {
  const v = data?.[key];
  if (!v) return '';
  return Array.isArray(v) ? v[0] : String(v);
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
  // D-037: the person is picked from the Admin contacts list, stored once, so
  // an edit there reaches every grant. null until the list has loaded.
  const [people, setPeople] = useState(null);
  // The same list the activity form's partner picker reads: TTA Admin vendor
  // names whose service type is Partner.
  const [partners, setPartners] = useState([]);
  const [partnerError, setPartnerError] = useState('');
  // vendorNameId -> the partner's own type, from the CSR Partners page (D-022).
  // null until loaded, and stays null if the read fails: the line is then
  // simply not shown, and saving is unaffected.
  const [partnerTypes, setPartnerTypes] = useState(null);
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
          personId: data.personId ?? '',
          contactType: data.contactType || '',
          partnerId: data.partnerId ?? '',
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

  useEffect(() => {
    let cancelled = false;
    csrAPI.people.getAll({ limit: 1000 })
      .then((data) => { if (!cancelled) setPeople(rowsOf(data)); })
      .catch(() => { if (!cancelled) setPeople([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let active = true;
    csrAPI.partners.getAll()
      .then((data) => { if (active) setPartners(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setPartners([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    csrAPI.partnerRecords.getAll({ limit: 1000 })
      .then((data) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.results || [];
        setPartnerTypes(new Map(rows.map((r) => [String(r.vendorNameId), r.partnerCategoryName || ''])));
      })
      .catch(() => { if (active) setPartnerTypes(null); });
    return () => { active = false; };
  }, []);

  // A contact can hold a partner whose Admin entry has since stopped being a
  // Partner. It stays selectable for that contact, so an edit does not
  // silently clear it.
  const partnerOptions = contact?.partnerId
    && !partners.some((p) => p.id === contact.partnerId)
    ? [...partners, { id: contact.partnerId, name: contact.partnerName || `#${contact.partnerId}` }]
    : partners;

  // Active people are offered. A person retired in Admin stays shown for the
  // contact that already names them, so an edit does not silently drop them.
  const personRows = (people || []).filter(
    (p) => p.isActive !== false || String(p.id) === String(contact?.personId),
  );
  if (contact?.personId && !personRows.some((p) => String(p.id) === String(contact.personId))) {
    personRows.push({
      id: contact.personId,
      name: contact.name || `#${contact.personId}`,
      designation: contact.designation,
      email: contact.email,
      phone: contact.phone,
      isActive: contact.personActive,
    });
  }
  const personChoices = personRows.map((p) => ({
    id: p.id,
    label: p.isActive === false ? `${p.name} (inactive)` : p.name,
    hint: [p.designation, p.email].filter(Boolean).join(' · ') || undefined,
  }));
  const pickedPerson = form.personId === ''
    ? null
    : personRows.find((p) => String(p.id) === String(form.personId)) || null;
  const noPeople = people !== null && personChoices.length === 0;

  const pickedPartnerType = partnerTypes && form.partnerId !== ''
    ? partnerTypes.get(String(form.partnerId)) || ''
    : null;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Moving off the partner type drops the partner organisation with it, so
  // the operator is never looking at an error about a field the form is no
  // longer showing them.
  const handleTypeChange = (e) => {
    const contactType = e.target.value;
    setForm((f) => ({
      ...f,
      contactType,
      partnerId: contactType === PARTNER_TYPE ? f.partnerId : '',
    }));
    if (contactType !== PARTNER_TYPE) setPartnerError('');
  };

  const handlePersonChange = (personId) => {
    setError('');
    setForm((f) => ({ ...f, personId }));
  };

  const leave = useCallback(
    (saved) => {
      if (!projectId) { navigate('/csr/projects'); return; }
      navigate(`/csr/${projectId}`, grantTabState(GRANT_TABS.contacts, saved));
    },
    [navigate, projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.personId === '') { setError('Pick a person'); return; }
    const payload = {
      personId: Number(form.personId),
      contactType: form.contactType,
      // partnerCategoryId is deliberately absent (D-022): a partner's type is
      // the partner's own, and leaving the key out keeps a contact's legacy
      // value rather than clearing it. partnerId is null, not '', because it is
      // an FK.
      partnerId: form.contactType === PARTNER_TYPE && form.partnerId !== ''
        ? Number(form.partnerId)
        : null,
    };
    // Sent on edits too: the update is a PUT, and the server requires the grant
    // on every full write, so leaving it out made every edit fail with a 400.
    payload.projectId = projectId;
    setSaving(true);
    setSaveError('');
    setPartnerError('');
    try {
      if (isEdit) await csrAPI.contacts.update(id, payload);
      else await csrAPI.contacts.create(payload);
      leave(isEdit ? 'Contact updated.' : 'Contact added.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the contact is gone and the person has nothing to
      // retry.
      const partnerMsg = fieldError(err?.response?.data, 'partnerId');
      const personMsg = fieldError(err?.response?.data, 'personId');
      setPartnerError(partnerMsg);
      setError(personMsg);
      if (!partnerMsg && !personMsg) {
        setSaveError(err?.message || 'Could not save this contact. Please try again.');
      }
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

          <div className="pform-field">
            <label htmlFor="c-person">Person <span className="pform-req" aria-hidden="true">*</span></label>
            <CSRCombobox
              id="c-person"
              value={form.personId}
              options={personChoices}
              onChange={handlePersonChange}
              placeholder="Search people by name, designation or email"
              emptyText="No person matches."
              disabled={noPeople}
              aria-invalid={Boolean(error)}
              aria-describedby="c-person-help"
            />
            <p id="c-person-help" className={`pform-help${error ? ' bad' : ''}`}>
              {error || (noPeople
                ? 'No people yet. People are added in Admin > CSR > Contacts, by an admin.'
                : 'People are added in Admin > CSR > Contacts, by an admin.')}
            </p>
          </div>

          {/* WHICH partner, asked only once the answer can mean something.
              The partner's type is not asked here: it is the partner's own,
              set once on the CSR Partners page (D-022), and shown read-only. */}
          {form.contactType === PARTNER_TYPE && (
            <div className="pform-field">
              <label htmlFor="c-partner">Partner organisation</label>
              <select
                id="c-partner" className="sel" value={form.partnerId}
                onChange={(e) => { setPartnerError(''); setField('partnerId')(e); }}
                disabled={partnerOptions.length === 0}
                aria-invalid={Boolean(partnerError)}
                aria-describedby="c-partner-help"
              >
                <option value="">— none —</option>
                {partnerOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || `#${p.id}`}</option>
                ))}
              </select>
              <p id="c-partner-help" className={`pform-help${partnerError ? ' bad' : ''}`}>
                {partnerError || (partnerOptions.length === 0
                  ? 'No partners yet. Add one on the CSR Partners page.'
                  : 'Which partner this person represents.')}
              </p>
              {pickedPartnerType !== null && (
                <p className="pform-help">
                  {pickedPartnerType
                    ? `Partner type: ${pickedPartnerType} (set on the partner)`
                    : 'Partner type: not set on the partner yet'}
                </p>
              )}
            </div>
          )}
        </section>

        {pickedPerson ? (
          <section className="pform-sec pform-sec--detail">
            <h2 className="pform-legend">Contact details</h2>
            <p className="pform-sub">
              From the Admin contacts list. Changing them there updates every grant.
            </p>

            <div className="pform-field">
              <label htmlFor="c-designation">Designation</label>
              <input id="c-designation" type="text" value={pickedPerson.designation || ''} readOnly />
            </div>

            <div className="pform-row">
              <div className="pform-field">
                <label htmlFor="c-email">Email</label>
                <input id="c-email" type="text" value={pickedPerson.email || ''} readOnly />
              </div>
              <div className="pform-field">
                <label htmlFor="c-phone">Phone</label>
                <input id="c-phone" type="text" value={pickedPerson.phone || ''} readOnly />
              </div>
            </div>
          </section>
        ) : null}

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
