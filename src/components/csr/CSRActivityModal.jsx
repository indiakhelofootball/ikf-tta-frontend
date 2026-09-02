import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Autocomplete,
} from '@mui/material';

import { trialsAPI, csrAPI } from '../../services/api';
import { getWorkshopNames, getTrainingProgrammes } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';

// 'Cancelled' is a real outcome, not the absence of one — an activity that was
// called off is not 'Planned' forever and is not 'Completed'. Added with the
// backend choice in migration 0011 (26 Aug review, 1067s: "if it is cancelled,
// then it will be an error").
const STATUS_OPTIONS = ['Planned', 'Completed', 'Cancelled'];

// Who delivered it. Asked for four times on the 26 Aug review -- "either a self
// or a partner, there will be no option". Blank remains selectable because
// activities recorded before this field existed have no answer.
const DELIVERY_MODES = [
  { value: 'Self', label: 'Self — delivered by TTA' },
  { value: 'Partner', label: 'Partner — delivered by a partner' },
];

// The activity type's own name says what kind of activity this is (26 Aug
// review, item N1: every field showed regardless of type, which read as a
// pile of unrelated dropdowns). Keying off the name rather than adding a
// separate "kind" column means no catalog migration is needed.
function kindOfTypeName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('trial')) return 'trial';
  if (n.includes('workshop')) return 'workshop';
  if (n.includes('training')) return 'training';
  return 'generic';
}

// Which of the five category fields apply to each kind. Delivered By and
// Partner stay on both 'workshop' and 'generic' -- a partner can run either,
// and an activity whose type doesn't match a known keyword shouldn't lose
// the field outright.
const KIND_FIELDS = {
  trial: ['linkedTrialId'],
  workshop: ['workshopId', 'deliveryMode', 'linkedVendorId'],
  training: ['trainingProgrammeId'],
  generic: ['deliveryMode', 'linkedVendorId'],
};
const ALL_KIND_FIELDS = [
  'linkedTrialId', 'workshopId', 'trainingProgrammeId', 'deliveryMode', 'linkedVendorId',
];

const EMPTY = {
  title: '', activityTypeId: '', startDate: '', endDate: '',
  location: '', status: 'Planned', linkedTrialId: '',
  workshopId: '', trainingProgrammeId: '', linkedVendorId: '',
  deliveryMode: '',
};

export default function CSRActivityModal({ open, activity, activityTypes, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [trials, setTrials] = useState([]);
  // Partner vendors for a workshop. The spec says a workshop links to a vendor
  // "in the 'partner' category", so an ordinary supplier must not be offered.
  // The narrowing is the endpoint's, not this component's: /csr/partner-vendors/
  // returns partner-flagged vendors only, through the csr grant this operator
  // already holds, so nobody needs the vendors module to fill this picker.
  const [partners, setPartners] = useState([]);
  // Re-read the catalogs when refreshAllFromAPI lands, instead of freezing
  // whatever was cached at mount.
  useConfigVersion();
  const workshops = getWorkshopNames();
  const programmes = getTrainingProgrammes();

  useEffect(() => {
    if (!open) return;
    let active = true;
    trialsAPI.getAll()
      .then((data) => { if (active) setTrials(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setTrials([]); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    csrAPI.partnerVendors.getAll()
      .then((data) => {
        if (!active) return;
        setPartners(Array.isArray(data) ? data : data?.results || []);
      })
      // Still caught: the catalog can be empty, the request can fail, and an
      // empty picker with its own helper text is the honest outcome either way.
      // It must not take the dialog down.
      .catch(() => { if (active) setPartners([]); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title || '',
        activityTypeId: activity.activityTypeId ?? '',
        // A row created before the third field went carries only `date`;
        // it loads into Start so the operator sees what was recorded.
        startDate: activity.startDate || activity.date || '',
        endDate: activity.endDate || '',
        location: activity.location || '',
        status: activity.status || 'Planned',
        linkedTrialId: activity.linkedTrialId ?? '',
        workshopId: activity.workshopId ?? '',
        trainingProgrammeId: activity.trainingProgrammeId ?? '',
        linkedVendorId: activity.linkedVendorId ?? '',
        deliveryMode: activity.deliveryMode || '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [activity, open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Changing the type changes which category fields apply. Clearing the ones
  // that no longer belong (rather than just hiding them) matters because the
  // serializer validates these per-category -- a stale workshop id surviving
  // under a trial would submit clean and come back as a confusing 400.
  const handleTypeChange = (e) => {
    const newId = e.target.value;
    const newType = (activityTypes || []).find((t) => t.id === Number(newId));
    const keep = new Set(KIND_FIELDS[kindOfTypeName(newType?.name)]);
    setForm((f) => {
      const next = { ...f, activityTypeId: newId };
      ALL_KIND_FIELDS.forEach((k) => { if (!keep.has(k)) next[k] = ''; });
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    if (!form.activityTypeId) next.activityTypeId = 'Pick an activity type';
    // Mirrors the serializer's rule. Caught here too so the user is told before
    // the round trip, not after it.
    if (form.deliveryMode === 'Partner' && !form.linkedVendorId) {
      next.linkedVendorId = 'Name the partner, or set delivery to Self.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: form.title.trim(),
      activityTypeId: Number(form.activityTypeId),
      // `date` is deliberately still sent. An activity EDITED after this
      // change would otherwise keep a stale single date the form no longer
      // shows and the user cannot correct — so the start date becomes the
      // authority for both, and the two can never disagree again.
      date: form.startDate || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      location: form.location.trim(),
      status: form.status,
      linkedTrialId: form.linkedTrialId === '' ? null : Number(form.linkedTrialId),
      workshopId: form.workshopId === '' ? null : Number(form.workshopId),
      trainingProgrammeId:
        form.trainingProgrammeId === '' ? null : Number(form.trainingProgrammeId),
      linkedVendorId: form.linkedVendorId === '' ? null : Number(form.linkedVendorId),
      deliveryMode: form.deliveryMode,
    });
  };

  const noTypes = !activityTypes || activityTypes.length === 0;
  const selectedType = (activityTypes || []).find((t) => t.id === Number(form.activityTypeId));
  const kind = kindOfTypeName(selectedType?.name);
  const showField = (name) => KIND_FIELDS[kind].includes(name);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{activity ? 'Edit Activity' : 'New Activity'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title" value={form.title} onChange={setField('title')}
            error={!!errors.title} helperText={errors.title} fullWidth
          />
          <TextField
            label="Activity Type" value={form.activityTypeId} onChange={handleTypeChange}
            select fullWidth error={!!errors.activityTypeId}
            helperText={noTypes ? 'No activity types defined yet — add them in the catalog first.' : errors.activityTypeId}
            disabled={noTypes}
          >
            {(activityTypes || []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}{t.isMaster ? ' · master template' : ''}
              </MenuItem>
            ))}
          </TextField>
          {/* TWO dates, not three. The form used to ask a single "Date" AND a
              start/end pair, and the 26 Aug review caught it: «Activities का एक
              date है। उसके नीचे फिर start date है। दोनों क्या लिख रहे हो?»
              (10:10) — "activity has one date, below it a start date, why are
              you writing both?" — and «I think यहाँ पर कुछ गलती हुआ है» (11:26).
              A single-day activity sets start and leaves end blank; nothing
              needs a third field to say so.

              `date` is no longer collected. It stays on the model for rows that
              already carry one, and every reader already falls through to
              startDate — see sortKey and whenLabel in CSRActivitiesPage. */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date" value={form.startDate} onChange={setField('startDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth
              helperText="Leave End blank for a single-day activity."
            />
            <TextField
              label="End Date" value={form.endDate} onChange={setField('endDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth
            />
          </Stack>
          <TextField label="Location" value={form.location} onChange={setField('location')} fullWidth />
          <TextField label="Status" value={form.status} onChange={setField('status')} select fullWidth>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          {/* What this activity actually was. Which of these show is driven by
              the activity type selected above (26 Aug review, item N1) --
              a trial gets the trial link, a workshop gets the catalog entry
              plus who delivered it, a training gets the programme. Showing
              all four regardless of type was the exact complaint. */}
          {showField('workshopId') && (
            <TextField
              label="Workshop" value={form.workshopId} onChange={setField('workshopId')}
              select fullWidth disabled={workshops.length === 0}
              helperText={workshops.length === 0
                ? 'No workshops in the catalog yet — an admin adds them in TTA Admin → Setup.'
                : 'For a workshop activity. Leave blank otherwise.'}
            >
              <MenuItem value="">— none —</MenuItem>
              {workshops.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>
          )}
          {showField('deliveryMode') && (
            <TextField
              label="Delivered By" value={form.deliveryMode} onChange={setField('deliveryMode')}
              select fullWidth
              helperText="Whether TTA ran this itself or a partner did."
            >
              <MenuItem value="">—</MenuItem>
              {DELIVERY_MODES.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
          )}
          {showField('linkedVendorId') && (
            <Autocomplete
              options={partners}
              disabled={form.deliveryMode === 'Self'}
              value={partners.find((v) => v.id === Number(form.linkedVendorId)) || null}
              getOptionLabel={(v) => `${v.vendorName || `#${v.id}`}${v.partnerCategory ? ` · ${v.partnerCategory}` : ''}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, opt) => setForm((f) => ({ ...f, linkedVendorId: opt ? opt.id : '' }))}
              renderInput={(params) => (
                <TextField
                  {...params} label="Partner"
                  error={!!errors.linkedVendorId}
                  helperText={errors.linkedVendorId
                    || (form.deliveryMode === 'Self'
                      ? 'Not needed — this one was delivered by TTA.'
                      : partners.length === 0
                        ? 'No vendors carry a partner category yet. An admin flags them in TTA Admin, under Vendors.'
                        : 'The partner who delivered this. Only vendors flagged with a partner category appear.')}
                />
              )}
            />
          )}
          {showField('trainingProgrammeId') && (
            <TextField
              label="Training Programme" value={form.trainingProgrammeId}
              onChange={setField('trainingProgrammeId')}
              select fullWidth disabled={programmes.length === 0}
              helperText={programmes.length === 0
                ? 'No training programmes in the catalog yet — an admin adds them in TTA Admin → Setup.'
                : 'For a multi-month training. Pair it with the start and end dates above.'}
            >
              <MenuItem value="">— none —</MenuItem>
              {programmes.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          )}
          {showField('linkedTrialId') && (
            <Autocomplete
              options={trials}
              value={trials.find((t) => t.id === Number(form.linkedTrialId)) || null}
              getOptionLabel={(t) => `${t.trialCode ? `${t.trialCode} — ` : ''}${t.trialName || `#${t.id}`}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, opt) => setForm((f) => ({ ...f, linkedTrialId: opt ? opt.id : '' }))}
              renderInput={(params) => (
                <TextField {...params} label="Linked Trial (optional)" helperText="Link an existing trial, if this activity is one." />
              )}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || noTypes}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
