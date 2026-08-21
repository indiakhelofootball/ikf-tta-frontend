// src/components/rep/REPModal.jsx — Restructured for REP (org) + CityAssignment split
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  IconButton,
  MenuItem,
  Box,
  CircularProgress,
  Autocomplete,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';
import { trialsAPI, repAPI } from '../../services/api';
import { buildAddModePayload } from './repMergePayload';
import { getStateFromPinCode } from '../../utils/pinCodeToState';

// Set of "state|city" keys for cities already assigned to a REP
let _repAssignedCities = new Set();

// ── Autocomplete helpers ──
function smartFilterOptions(options, state, getLabelFn = (o) => (typeof o === 'string' ? o : o?.name || '')) {
  const input = state.inputValue.toLowerCase();
  if (!input) return options;
  const filtered = options.filter(o => getLabelFn(o).toLowerCase().includes(input));
  filtered.sort((a, b) => {
    const aName = getLabelFn(a).toLowerCase();
    const bName = getLabelFn(b).toLowerCase();
    const aStarts = aName.startsWith(input) ? 0 : 1;
    const bStarts = bName.startsWith(input) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aName.localeCompare(bName);
  });
  return filtered;
}

function HighlightMatch({ text, query }) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.substring(0, idx)}
      <span style={{ backgroundColor: '#FDE68A', borderRadius: 2, padding: '0 1px' }}>
        {text.substring(idx, idx + query.length)}
      </span>
      {text.substring(idx + query.length)}
    </>
  );
}

function REPModal({ open, onClose, onSave, editingREP }) {
  const isEditMode = !!editingREP;

  const indianStates = useMemo(() => {
    return State.getStatesOfCountry('IN').map(s => ({ name: s.name, isoCode: s.isoCode }));
  }, []);

  // ── Org-level form state ──
  const [orgData, setOrgData] = useState({
    repName: '', season: '',
    contactName: '', phone: '', email: '',
    backupContactName: '', backupPhone: '', backupEmail: '',
    website: '', websiteNA: false,
    facebook: '', facebookNA: false,
    instagram: '', instagramNA: false,
    telegram: '', telegramNA: false,
    mouStatus: '',
    repLogoLink: '',
  });

  // ── City-specific assignment state (Add mode) ──
  const [assignmentData, setAssignmentData] = useState({
    state: '', city: '', region: '',
    courierAcceptingName: '', courierAcceptingPhone: '',
    courierPinCode: '', courierAddress: '', courierAdditionalInfo: '',
    physicalAddress: '', groundLocation: '', googleMapLink: '',
    pinCode: '', groundPinCode: '', reportingTime: '',
    groundContactName: '', groundContactPhone: '',
  });

  // File state
  const [mouDocument, setMouDocument] = useState(null);
  const [mouDocumentPreview, setMouDocumentPreview] = useState(null);
  const [repLogo, setRepLogo] = useState(null);
  const [repLogoPreview, setRepLogoPreview] = useState(null);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState('');

  // Autocomplete input tracking
  const [stateInputValue, setStateInputValue] = useState('');
  const [cityInputValue, setCityInputValue] = useState('');

  // Courier PIN lookup
  const [courierAreas, setCourierAreas] = useState([]);
  const [courierPinLoading, setCourierPinLoading] = useState(false);
  const [courierPinError, setCourierPinError] = useState('');
  const courierPinAbortRef = useRef(null);
  const [courierDistrict, setCourierDistrict] = useState('');
  const [courierState, setCourierState] = useState('');
  const [courierSubArea, setCourierSubArea] = useState('');

  // ── Lookup state (Add mode) ──
  const [allTrials, setAllTrials] = useState([]);
  const [lookupProject, setLookupProject] = useState('');
  const [lookupStateObj, setLookupStateObj] = useState(null);
  const [lookupCityObj, setLookupCityObj] = useState(null);
  const [lookupAvailCities, setLookupAvailCities] = useState([]);
  const [lookupStateInput, setLookupStateInput] = useState('');
  const [lookupCityInput, setLookupCityInput] = useState('');
  const [trialCitiesByState, setTrialCitiesByState] = useState({});

  // REP name search (Add mode)
  const [existingRep, setExistingRep] = useState(null); // found existing org
  const [repNameSearchDone, setRepNameSearchDone] = useState(false);
  const repNameTimerRef = useRef(null);

  // Scenario 3 — add city to project
  const [addCityMonth, setAddCityMonth] = useState('');
  const [addCityDate, setAddCityDate] = useState('');
  const [addCitySaving, setAddCitySaving] = useState(false);

  // Check if selected city is in the project
  const [cityInProject, setCityInProject] = useState(false);

  // Edit mode — assignment editing
  const [editAssignmentId, setEditAssignmentId] = useState(null);
  const [editAssignmentData, setEditAssignmentData] = useState({});
  const [editCourierAreas, setEditCourierAreas] = useState([]);
  const [editCourierPinLoading, setEditCourierPinLoading] = useState(false);
  const [editCourierPinError, setEditCourierPinError] = useState('');
  const [editCourierDistrict, setEditCourierDistrict] = useState('');
  const [editCourierState, setEditCourierState] = useState('');
  const [editCourierSubArea, setEditCourierSubArea] = useState('');
  const editCourierPinAbortRef = useRef(null);
  const [addingNewAssignment, setAddingNewAssignment] = useState(false);

  // Load trials + existing REP assigned cities when modal opens
  useEffect(() => {
    if (!open) return;
    trialsAPI.getAll({ limit: 200 }).then((res) => {
      const trials = res.trials || [];
      setAllTrials(trials);
      const byState = {};
      for (const trial of trials) {
        for (const city of trial.assignedCities || []) {
          if (city.state && city.cityName) {
            if (!byState[city.state]) byState[city.state] = new Set();
            byState[city.state].add(city.cityName);
          }
        }
      }
      const result = {};
      for (const [state, set] of Object.entries(byState)) {
        result[state] = [...set].sort();
      }
      setTrialCitiesByState(result);
    }).catch(() => {});

    // Fetch all REPs to know which cities are already assigned
    repAPI.getAll({ limit: 1000 }).then((res) => {
      const assigned = new Set();
      for (const rep of res.reps || []) {
        for (const a of rep.cityAssignments || []) {
          if (a.state && a.city) assigned.add(`${a.state.toLowerCase()}|${a.city.toLowerCase()}`);
        }
      }
      _repAssignedCities = assigned;
    }).catch(() => {});
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (!open) return;

    if (editingREP) {
      setOrgData({
        repName: editingREP.repName || '',
        season: editingREP.season || '',
        contactName: editingREP.contactName || '',
        phone: editingREP.phone || '',
        email: editingREP.email || '',
        backupContactName: editingREP.backupContactName || '',
        backupPhone: editingREP.backupPhone || '',
        backupEmail: editingREP.backupEmail || '',
        website: editingREP.website || '', websiteNA: !!editingREP.websiteNA,
        facebook: editingREP.facebook || '', facebookNA: !!editingREP.facebookNA,
        instagram: editingREP.instagram || '', instagramNA: !!editingREP.instagramNA,
        telegram: editingREP.telegram || '', telegramNA: !!editingREP.telegramNA,
        mouStatus: editingREP.mouStatus || '',
        repLogoLink: editingREP.repLogoLink || '',
      });
      if (editingREP.mouDocumentUrl) setMouDocumentPreview(editingREP.mouDocumentUrl);
      if (editingREP.repLogoUrl) setRepLogoPreview(editingREP.repLogoUrl);
    } else {
      setOrgData({
        repName: '', season: '',
        contactName: '', phone: '', email: '',
        backupContactName: '', backupPhone: '', backupEmail: '',
        website: '', websiteNA: false, facebook: '', facebookNA: false,
        instagram: '', instagramNA: false, telegram: '', telegramNA: false,
        mouStatus: '',
        repLogoLink: '',
      });
      setMouDocument(null); setMouDocumentPreview(null);
      setRepLogo(null); setRepLogoPreview(null);
    }

    setAssignmentData({
      state: '', city: '', region: '',
      courierAcceptingName: '', courierAcceptingPhone: '',
      courierPinCode: '', courierAddress: '', courierAdditionalInfo: '',
      physicalAddress: '', groundLocation: '', googleMapLink: '',
      pinCode: '', groundPinCode: '', reportingTime: '',
      groundContactName: '', groundContactPhone: '',
    });
    setErrors({});
    setFileError('');
    setCourierAreas([]);
    setCourierPinLoading(false);
    setCourierPinError('');
    setCourierDistrict(''); setCourierState(''); setCourierSubArea('');
    setLookupProject('');
    setLookupStateObj(null);
    setLookupCityObj(null);
    setLookupAvailCities([]);
    setExistingRep(null);
    setRepNameSearchDone(false);
    setCityInProject(false);
    setAddCityMonth('July');
    setAddCityDate(`${new Date().getFullYear()}-07-10`);
    setEditAssignmentId(null);
    setAddingNewAssignment(false);
  }, [open, editingREP]);

  // ── Handlers ──
  const handleOrgChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setOrgData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAssignmentChange = (field) => (event) => {
    const value = event.target.value;
    setAssignmentData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── REP name debounced search (Add mode) ──
  const searchRepByName = (name) => {
    if (repNameTimerRef.current) clearTimeout(repNameTimerRef.current);
    if (!name || name.trim().length < 2) {
      setExistingRep(null);
      setRepNameSearchDone(false);
      return;
    }
    repNameTimerRef.current = setTimeout(async () => {
      try {
        const res = await repAPI.getAll({ search: name.trim(), limit: 10 });
        const match = (res.reps || []).find(
          r => r.repName.toLowerCase() === name.trim().toLowerCase()
        );
        if (match) {
          setExistingRep(match);
          // Pre-fill org fields from existing REP (read-only)
          setOrgData(prev => ({
            ...prev,
            contactName: match.contactName || prev.contactName,
            phone: match.phone || prev.phone,
            email: match.email || prev.email,
            backupContactName: match.backupContactName || prev.backupContactName,
            backupPhone: match.backupPhone || prev.backupPhone,
            backupEmail: match.backupEmail || prev.backupEmail,
            season: match.season || prev.season,
            mouStatus: match.mouStatus || prev.mouStatus,
            website: match.website || prev.website, websiteNA: match.websiteNA ?? prev.websiteNA,
            facebook: match.facebook || prev.facebook, facebookNA: match.facebookNA ?? prev.facebookNA,
            instagram: match.instagram || prev.instagram, instagramNA: match.instagramNA ?? prev.instagramNA,
            telegram: match.telegram || prev.telegram, telegramNA: match.telegramNA ?? prev.telegramNA,
          }));
        } else {
          setExistingRep(null);
        }
        setRepNameSearchDone(true);
      } catch {
        setRepNameSearchDone(true);
      }
    }, 500);
  };

  // ── Lookup: check if city is in selected project ──
  const checkCityInProject = (projectVal, stateObj, cityObj) => {
    if (!stateObj || !cityObj) { setCityInProject(false); return false; }
    const cityName = cityObj.name.toLowerCase();
    const stateName = stateObj.name.toLowerCase();
    const projectsToCheck = projectVal
      ? allTrials.filter(t => String(t.id) === String(projectVal))
      : allTrials;
    const found = projectsToCheck.some(t =>
      (t.assignedCities || []).some(
        c => c.cityName?.toLowerCase() === cityName && c.state?.toLowerCase() === stateName
      )
    );
    setCityInProject(found);
    if (found) {
      setAssignmentData(prev => ({
        ...prev,
        state: stateObj.name,
        city: cityObj.name,
      }));
    }
    return found;
  };

  const handleAddCityToProject = async () => {
    const project = allTrials.find(t => String(t.id) === String(lookupProject));
    if (!project || !lookupCityObj || !lookupStateObj) return;
    setAddCitySaving(true);
    try {
      const newCity = {
        state: lookupStateObj.name,
        cityName: lookupCityObj.name,
        region: lookupCityObj.name,
        trialRegion: lookupCityObj.name,
        confirmed: false,
        tentativeMonth: addCityMonth || null,
        tentativeDate: addCityDate || null,
        code: `IKF-${lookupStateObj.isoCode}-${lookupCityObj.name.substring(0,3).toUpperCase()}-${String((project.assignedCities||[]).length+1).padStart(3,'0')}`,
      };
      // Add the one city through its own endpoint. Sending the whole trial
      // back with an appended list meant PUTting a copy loaded when the modal
      // opened: any city added to that project since — by anyone — was absent
      // from the payload, and the server deletes what the payload omits. The
      // REP assignments for those cities survived, stranded, with their ground
      // addresses no longer reachable from the trial.
      await trialsAPI.addCity(project.id, newCity);
      const res = await trialsAPI.getAll({ limit: 200 });
      setAllTrials(res.trials || []);
      setCityInProject(true);
      setAssignmentData(prev => ({
        ...prev,
        state: lookupStateObj.name,
        city: lookupCityObj.name,
      }));
    } catch (err) {
      setFileError(err.message || 'Failed to add city to project');
    } finally {
      setAddCitySaving(false);
    }
  };

  // ── Courier PIN lookup ──
  const lookupCourierPin = async (pin) => {
    if (courierPinAbortRef.current) courierPinAbortRef.current.abort();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setCourierAreas([]); setCourierPinError('');
      setCourierDistrict(''); setCourierState(''); setCourierSubArea('');
      return;
    }
    const controller = new AbortController();
    courierPinAbortRef.current = controller;
    setCourierPinLoading(true); setCourierPinError('');
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
      const json = await res.json();
      const record = json?.[0];
      if (record?.Status === 'Success' && record.PostOffice?.length > 0) {
        const first = record.PostOffice[0];
        const areas = record.PostOffice.map(po => po.Name);
        setCourierAreas(areas); setCourierPinError('');
        setCourierDistrict(first.District || '');
        setCourierState(first.State || '');
        setCourierSubArea(areas[0] || '');
      } else {
        setCourierAreas([]); setCourierPinError('Invalid PIN code — no location found');
        setCourierDistrict(''); setCourierState(''); setCourierSubArea('');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const fallbackState = getStateFromPinCode(pin);
        setCourierAreas([]); setCourierSubArea('');
        setCourierDistrict(''); setCourierState(fallbackState);
        setCourierPinError(fallbackState
          ? 'PIN lookup offline — state filled, enter district manually'
          : 'PIN lookup offline — enter district & state manually');
      }
    } finally {
      setCourierPinLoading(false);
    }
  };

  // ── File handlers ──
  const handleMouDocumentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError('');
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) { setFileError('MoU document must be PDF or DOC format'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { setFileError('MoU document must be less than 5MB'); event.target.value = ''; return; }
    setMouDocument(file);
    const reader = new FileReader();
    reader.onloadend = () => setMouDocumentPreview(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRepLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError('');
    if (!file.type.startsWith('image/')) { setFileError('REP logo must be an image file'); event.target.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { setFileError('REP logo must be less than 2MB'); event.target.value = ''; return; }
    setRepLogo(file);
    const reader = new FileReader();
    reader.onloadend = () => setRepLogoPreview(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // ── Validation ──
  const validate = () => {
    const newErrors = {};
    if (!orgData.repName.trim()) newErrors.repName = 'REP Name is required';
    if (orgData.phone) {
      const d = orgData.phone.replace(/\D/g, '');
      if (d.length !== 10) newErrors.phone = 'Must be exactly 10 digits (e.g. 9876543210)';
      else if (!/^[6-9]\d{9}$/.test(d)) newErrors.phone = 'Must start with 6-9 (e.g. 9876543210)';
    }
    if (orgData.backupPhone) {
      const d = orgData.backupPhone.replace(/\D/g, '');
      if (d.length !== 10) newErrors.backupPhone = 'Must be exactly 10 digits (e.g. 9876543210)';
      else if (!/^[6-9]\d{9}$/.test(d)) newErrors.backupPhone = 'Must start with 6-9 (e.g. 9876543210)';
    }
    if (orgData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.email)) newErrors.email = 'Invalid email format (e.g. name@example.com)';
    if (orgData.backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgData.backupEmail)) newErrors.backupEmail = 'Invalid email format (e.g. name@example.com)';

    if (orgData.website && !orgData.websiteNA && !/^https?:\/\/.+/.test(orgData.website.trim())) newErrors.website = 'Must start with http:// or https://';
    if (orgData.facebook && !orgData.facebookNA && !/^https?:\/\/.+/.test(orgData.facebook.trim())) newErrors.facebook = 'Must start with http:// or https://';
    if (orgData.instagram && !orgData.instagramNA && !/^https?:\/\/.+/.test(orgData.instagram.trim())) newErrors.instagram = 'Must start with http:// or https://';

    // Assignment validation (Add mode only, if filling assignment)
    if (!isEditMode && cityInProject) {
      if (assignmentData.pinCode && !/^[1-9][0-9]{5}$/.test(assignmentData.pinCode.trim())) {
        newErrors.pinCode = 'Must be 6 digits starting with 1-9 (e.g. 400001)';
      }
      if (assignmentData.courierAcceptingPhone) {
        const d = assignmentData.courierAcceptingPhone.replace(/\D/g, '');
        if (d.length !== 10) newErrors.courierAcceptingPhone = 'Must be exactly 10 digits (e.g. 9876543210)';
        else if (!/^[6-9]\d{9}$/.test(d)) newErrors.courierAcceptingPhone = 'Must start with 6-9 (e.g. 9876543210)';
      }
      if (assignmentData.groundContactPhone) {
        const d = assignmentData.groundContactPhone.replace(/\D/g, '');
        if (d.length > 0 && d.length !== 10) newErrors.groundContactPhone = 'Must be exactly 10 digits (e.g. 9876543210)';
        else if (d.length === 10 && !/^[6-9]\d{9}$/.test(d)) newErrors.groundContactPhone = 'Must start with 6-9 (e.g. 9876543210)';
      }
      if (assignmentData.googleMapLink && !/^https?:\/\/.+/.test(assignmentData.googleMapLink.trim())) {
        newErrors.googleMapLink = 'Must start with http:// or https://';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    setFileError('');
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditMode) {
        // Edit mode: if a city-assignment panel is open, persist its edits too —
        // the footer Save must not silently drop courier/ground changes made there.
        if (editAssignmentId) {
          await repAPI.updateAssignment(editingREP.id, editAssignmentId, {
            ...editAssignmentData,
            courierDistrict: editCourierDistrict,
            courierState: editCourierState,
            courierSubArea: editCourierSubArea,
          });
        }
        // If the "Assign New Trial" panel is open and filled, create that
        // assignment too — the footer Save must not silently drop it.
        if (addingNewAssignment && lookupProject && assignmentData.city && assignmentData.state) {
          await repAPI.addAssignment(editingREP.id, {
            trialId: Number(lookupProject),
            ...assignmentData,
            courierDistrict,
            courierState,
            courierSubArea,
          });
        }
        // Org fields. Only send logo/MOU when a NEW file was actually chosen —
        // otherwise omit them so the backend preserves the stored value. Re-sending
        // the existing base64 on every edit bloated the payload (multi-MB) and, if
        // the edit object ever lacked it, persisted a blank and wiped the logo.
        const repData = { ...orgData };
        if (mouDocument) { repData.mouDocumentName = mouDocument.name; repData.mouDocumentUrl = mouDocumentPreview; }
        if (repLogo)     { repData.repLogoName = repLogo.name; repData.repLogoUrl = repLogoPreview; }
        await onSave(repData);
      } else {
        // Add mode: org + assignment.
        // `orgData` seeds every untouched field to '' (repLogoLink is never
        // prefilled by the name search at all), and when the name matches an
        // existing org the backend merges onto that row — so shipping the whole
        // object wiped the stored logo link and MOU status each time a city was
        // added. Blanks therefore cannot be sent wholesale.
        //
        // But they cannot be dropped wholesale either. Once the name search has
        // prefilled a field from the matched org, emptying that box IS a
        // deliberate clear, and the backend honours a blank the caller actually
        // sent. Dropping every blank would silently discard that edit — trading
        // one bug for another.
        //
        // So: keep a blank only where the matched org holds a value for that
        // field, which is exactly when clearing it means something. With no
        // match, nothing exists to clear and every blank is dropped.
        // Rule and reasoning live in ./repMergePayload so they can be tested.
        const repData = buildAddModePayload(orgData, existingRep);
        if (mouDocument) { repData.mouDocumentName = mouDocument.name; repData.mouDocumentUrl = mouDocumentPreview; }
        if (repLogo) { repData.repLogoName = repLogo.name; repData.repLogoUrl = repLogoPreview; }

        // Build trial IDs
        const trialIds = lookupProject ? [Number(lookupProject)] : [];
        if (trialIds.length > 0) repData.trialIds = trialIds;

        // Include assignment data if city was selected. District/state/sub-area
        // live in separate pin-lookup state, not assignmentData — merge them in
        // or they are silently dropped.
        if (assignmentData.city && assignmentData.state) {
          repData.cityAssignment = {
            ...assignmentData,
            courierDistrict,
            courierState,
            courierSubArea,
          };
        }

        await onSave(repData);
      }
      setMouDocument(null); setMouDocumentPreview(null);
      setRepLogo(null); setRepLogoPreview(null);
      setFileError('');
    } catch (error) {
      setFileError(error.message || 'Failed to save REP. Please try again.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // ── Add assignment to existing REP (Edit mode) ──
  const handleAddAssignment = async () => {
    if (!assignmentData.city || !assignmentData.state || !lookupProject) return;
    setSaving(true);
    try {
      await repAPI.addAssignment(editingREP.id, {
        trialId: Number(lookupProject),
        ...assignmentData,
        courierDistrict,
        courierState,
        courierSubArea,
      });
      setAddingNewAssignment(false);
      setAssignmentData({
        state: '', city: '', region: '',
        courierAcceptingName: '', courierAcceptingPhone: '',
        courierPinCode: '', courierAddress: '', courierAdditionalInfo: '',
        physicalAddress: '', groundLocation: '', googleMapLink: '',
        pinCode: '', groundPinCode: '', reportingTime: '',
        groundContactName: '', groundContactPhone: '',
      });
      setCourierDistrict(''); setCourierState(''); setCourierSubArea('');
      setCourierAreas([]);
      setLookupProject('');
      setLookupStateObj(null);
      setLookupCityObj(null);
      // Refresh parent
      onClose();
      window.location.reload(); // simple refresh to reload data
    } catch (error) {
      setFileError(error.message || 'Failed to add assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!editingREP) return;
    try {
      await repAPI.deleteAssignment(editingREP.id, assignmentId);
      onClose();
      window.location.reload();
    } catch (error) {
      setFileError(error.message || 'Failed to delete assignment');
    }
  };

  const openEditAssignment = (a) => {
    setEditAssignmentId(a.id);
    setEditAssignmentData({
      city: a.city || '',
      state: a.state || '',
      courierAcceptingName: a.courierAcceptingName || '',
      courierAcceptingPhone: a.courierAcceptingPhone || '',
      courierPinCode: a.courierPinCode || '',
      courierAddress: a.courierAddress || '',
      courierAdditionalInfo: a.courierAdditionalInfo || '',
      physicalAddress: a.physicalAddress || '',
      googleMapLink: a.googleMapLink || '',
      pinCode: a.pinCode || '',
      // Without this the edit form opens with a blank Ground Name and saves the
      // blank back over a stored one. Same trap the logo fields fell into.
      groundLocation: a.groundLocation || '',
      groundContactName: a.groundContactName || '',
      groundContactPhone: a.groundContactPhone || '',
    });
    setEditCourierAreas(a.courierSubArea ? [a.courierSubArea] : []);
    setEditCourierDistrict(a.courierDistrict || '');
    setEditCourierState(a.courierState || '');
    setEditCourierSubArea(a.courierSubArea || '');
  };

  const lookupEditCourierPin = async (pin) => {
    if (editCourierPinAbortRef.current) editCourierPinAbortRef.current.abort();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setEditCourierAreas([]); setEditCourierPinError('');
      setEditCourierDistrict(''); setEditCourierState(''); setEditCourierSubArea('');
      return;
    }
    const controller = new AbortController();
    editCourierPinAbortRef.current = controller;
    setEditCourierPinLoading(true); setEditCourierPinError('');
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
      const data = await res.json();
      const record = data[0];
      if (record.Status === 'Success' && record.PostOffice?.length) {
        const first = record.PostOffice[0];
        const areas = record.PostOffice.map(po => po.Name);
        setEditCourierAreas(areas); setEditCourierPinError('');
        setEditCourierDistrict(first.District || '');
        setEditCourierState(first.State || '');
        setEditCourierSubArea(areas[0] || '');
      } else {
        setEditCourierAreas([]); setEditCourierPinError('Invalid PIN code — no location found');
        setEditCourierDistrict(''); setEditCourierState(''); setEditCourierSubArea('');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const fallbackState = getStateFromPinCode(pin);
        setEditCourierAreas([]); setEditCourierSubArea('');
        setEditCourierDistrict(''); setEditCourierState(fallbackState);
        setEditCourierPinError(fallbackState
          ? 'PIN lookup offline — state filled, enter district manually'
          : 'PIN lookup offline — enter district & state manually');
      }
    } finally {
      setEditCourierPinLoading(false);
    }
  };

  const handleEditAssignmentChange = (field) => (e) => {
    setEditAssignmentData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleUpdateAssignment = async () => {
    if (!editingREP || !editAssignmentId) return;
    setSaving(true);
    try {
      await repAPI.updateAssignment(editingREP.id, editAssignmentId, {
        ...editAssignmentData,
        courierDistrict: editCourierDistrict,
        courierState: editCourierState,
        courierSubArea: editCourierSubArea,
      });
      setEditAssignmentId(null);
      onClose();
      window.location.reload();
    } catch (error) {
      setFileError(error.message || 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──
  const mouStatuses = ['Signed', 'Pending', 'Not Required'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const canFillForm = isEditMode || cityInProject;
  const existingAssignments = editingREP?.cityAssignments || [];

  const labelSx = { fontSize: '0.875rem', fontWeight: 600, color: '#374151', mb: 1, display: 'block' };
  const secHeaderSx = {
    color: '#3B82F6', fontWeight: 700, mb: 2.5, mt: 0,
    textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.82rem',
  };
  const subLabelSx = {
    fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 2, display: 'block',
  };
  const cardSx = {
    bgcolor: 'white', border: '1px solid #e5e7eb',
    borderRadius: '14px', p: { xs: 2.5, sm: 3 }, mb: 2.5,
  };
  const grid2 = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh', bgcolor: '#f8fafc' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {isEditMode ? 'Edit REP' : 'Add REP'}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>

          {fileError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFileError('')}>
              {fileError}
            </Alert>
          )}

          {/* ── LOOKUP SECTION (Add mode) ── */}
          {!isEditMode && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Project</Typography>
                  <TextField select fullWidth size="small" value={lookupProject}
                    onChange={(e) => {
                      setLookupProject(e.target.value);
                      checkCityInProject(e.target.value, lookupStateObj, lookupCityObj);
                    }}
                    SelectProps={{ displayEmpty: true }}
                  >
                    <MenuItem value="" disabled sx={{ color: '#aaa' }}>Select a project</MenuItem>
                    {allTrials.map(t => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.trialType || t.trialName}{t.season ? ` — ${t.season}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>State</Typography>
                  <Autocomplete size="small" options={indianStates}
                    getOptionLabel={(o) => o.name || ''} value={lookupStateObj}
                    inputValue={lookupStateInput} onInputChange={(_, v) => setLookupStateInput(v)}
                    filterOptions={(opts, state) => smartFilterOptions(opts, state)}
                    onChange={(_, val) => {
                      setLookupStateObj(val);
                      setLookupCityObj(null);
                      setCityInProject(false);
                      if (val) {
                        const libCities = City.getCitiesOfState('IN', val.isoCode);
                        const libNames = new Set(libCities.map(c => c.name.toLowerCase()));
                        const projectCities = (trialCitiesByState[val.name] || [])
                          .filter(name => !libNames.has(name.toLowerCase()))
                          .map(name => ({ name, isProjectCity: true }));
                        const stateLower = val.name.toLowerCase();
                        const allCities = [...libCities, ...projectCities].map(c => ({
                          ...c,
                          _assigned: _repAssignedCities.has(`${stateLower}|${c.name.toLowerCase()}`),
                        }));
                        // Unassigned cities first, then assigned — alphabetical within each group
                        allCities.sort((a, b) => {
                          if (a._assigned !== b._assigned) return a._assigned ? 1 : -1;
                          return a.name.localeCompare(b.name);
                        });
                        setLookupAvailCities(allCities);
                      } else {
                        setLookupAvailCities([]);
                      }
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.isoCode} {...otherProps}
                          sx={{ py: 1, px: 2, fontSize: '0.88rem', borderBottom: '1px solid #f3f4f6', '&:hover': { backgroundColor: '#f0f9ff !important' } }}>
                          <HighlightMatch text={option.name} query={lookupStateInput} />
                        </Box>
                      );
                    }}
                    renderInput={(params) => <TextField {...params} placeholder="Select state" />}
                    isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                    ListboxProps={{ style: { maxHeight: 200 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>City</Typography>
                  <Autocomplete size="small" options={lookupAvailCities}
                    getOptionLabel={(o) => o.name || ''} value={lookupCityObj}
                    disabled={!lookupStateObj}
                    inputValue={lookupCityInput} onInputChange={(_, v) => setLookupCityInput(v)}
                    filterOptions={(opts, state) => smartFilterOptions(opts, state)}
                    onChange={(_, val) => {
                      setLookupCityObj(val);
                      checkCityInProject(lookupProject, lookupStateObj, val);
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.name} {...otherProps}
                          sx={{ py: 1, px: 2, fontSize: '0.88rem', borderBottom: '1px solid #f3f4f6', '&:hover': { backgroundColor: '#f0f9ff !important' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: option._assigned ? 0.55 : 1 }}>
                          <HighlightMatch text={option.name} query={lookupCityInput} />
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {option._assigned && (
                              <Typography sx={{ fontSize: '0.65rem', color: '#5A6B82', fontWeight: 600, ml: 1 }}>ASSIGNED</Typography>
                            )}
                            {option.isProjectCity && (
                              <Typography sx={{ fontSize: '0.68rem', color: '#3B82F6', fontWeight: 600, bgcolor: '#dbeafe', px: 0.75, py: 0.1, borderRadius: 1, ml: 1 }}>Project</Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => <TextField {...params} placeholder={lookupStateObj ? 'Select city' : 'Select state first'} />}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                    ListboxProps={{ style: { maxHeight: 220 } }}
                  />
                </Box>
              </Box>

              {/* Status messages */}
              <Box sx={{ minHeight: lookupCityObj ? '40px' : 0 }}>
                {lookupCityObj && lookupStateObj && cityInProject && (
                  <Box sx={{ p: 2, borderRadius: '10px', bgcolor: '#eef2ff', border: '1px solid #c7d2fe' }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca', mb: 0.25 }}>
                      Trial city confirmed — {lookupCityObj.name} is part of the project
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#6366f1' }}>
                      Continue to fill REP details below.
                    </Typography>
                  </Box>
                )}

                {lookupCityObj && lookupStateObj && !cityInProject && lookupProject && (
                  <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                      City not in project — add it first
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Month</Typography>
                        <TextField select fullWidth size="small" value={addCityMonth} onChange={(e) => setAddCityMonth(e.target.value)}>
                          <MenuItem value="">Select month</MenuItem>
                          {months.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Date</Typography>
                        <TextField fullWidth type="date" size="small" value={addCityDate} onChange={(e) => setAddCityDate(e.target.value)} />
                      </Box>
                    </Box>
                    <Button variant="contained" size="small" fullWidth
                      disabled={addCitySaving}
                      onClick={handleAddCityToProject}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}>
                      {addCitySaving ? 'Adding...' : `Add ${lookupCityObj?.name || 'city'} to project`}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Existing REP match banner */}
              {existingRep && repNameSearchDone && (
                <Box sx={{ mt: 2, p: 2, borderRadius: '10px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    REP organization already exists
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{existingRep.repName}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.25 }}>
                    Org details will be reused. Fill the city-specific fields below.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* ── BASIC INFORMATION (Org-level) ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Basic Information</Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>REP Name <span style={{ color: '#ef4444' }}>*</span></Typography>
                <TextField fullWidth placeholder="e.g., RUFC"
                  value={orgData.repName}
                  onChange={(e) => {
                    handleOrgChange('repName')(e);
                    if (!isEditMode) searchRepByName(e.target.value);
                  }}
                  error={!!errors.repName} helperText={errors.repName}
                  disabled={saving || (!isEditMode && !cityInProject)}
                  InputProps={{ readOnly: !isEditMode && !!existingRep }}
                />
              </Box>
            </Box>
          </Box>

          {/* ── EXISTING ASSIGNMENTS (Edit mode) ── */}
          {isEditMode && existingAssignments.length > 0 && (
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Assigned Trials ({existingAssignments.length})</Typography>
              <Stack spacing={1.5}>
                {existingAssignments.map(a => (
                  <Box key={a.id} sx={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ p: 2, bgcolor: editAssignmentId === a.id ? '#eff6ff' : '#f8fafc' }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                          {[a.trialSeason, a.trialType, a.city].filter(Boolean).join(' | ')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {a.state}{a.region ? ` · ${a.region}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small"
                          onClick={() => editAssignmentId === a.id ? setEditAssignmentId(null) : openEditAssignment(a)}
                          sx={{ color: '#3B82F6', '&:hover': { bgcolor: '#dbeafe' } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteAssignment(a.id)}
                          sx={{ '&:hover': { bgcolor: '#fee2e2' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {editAssignmentId === a.id && (
                      <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', bgcolor: 'white' }}>
                        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
                          Editing City, State, District or Sub-Area on an existing assignment overrides the
                          original record. Changing the City may cause a collision with another assignment for
                          this REP, and historical data tied to this assignment will follow it. Proceed only
                          if you know what you're doing.
                        </Alert>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                          <Box>
                            <Typography sx={labelSx}>City</Typography>
                            <TextField fullWidth size="small" value={editAssignmentData.city || ''}
                              onChange={handleEditAssignmentChange('city')} disabled={saving} />
                          </Box>
                          <Box>
                            <Typography sx={labelSx}>State</Typography>
                            <TextField fullWidth size="small" value={editAssignmentData.state || ''}
                              onChange={handleEditAssignmentChange('state')} disabled={saving} />
                          </Box>
                        </Box>
                        {renderCourierSection(
                          editAssignmentData,
                          handleEditAssignmentChange,
                          saving,
                          (pin) => {
                            handleEditAssignmentChange('courierPinCode')({ target: { value: pin } });
                            lookupEditCourierPin(pin);
                          },
                          editCourierPinLoading,
                          editCourierPinError,
                          editCourierAreas,
                          editCourierDistrict,
                          editCourierState,
                          editCourierSubArea,
                          setEditCourierSubArea,
                          labelSx,
                          setEditCourierDistrict,
                          setEditCourierState,
                        )}
                        {renderGroundSection(editAssignmentData, handleEditAssignmentChange, saving, labelSx, secHeaderSx, {})}
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                          <Button variant="contained" size="small" onClick={handleUpdateAssignment}
                            disabled={saving}
                            sx={{ bgcolor: '#FBB040', '&:hover': { bgcolor: '#E89F2C' }, fontWeight: 600 }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button size="small" onClick={() => setEditAssignmentId(null)} disabled={saving}>
                            Cancel
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>

              {!addingNewAssignment && (
                <Button startIcon={<AddIcon />} size="small" onClick={() => setAddingNewAssignment(true)}
                  sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}>
                  Assign New Trial
                </Button>
              )}
            </Box>
          )}

          {/* ── NEW ASSIGNMENT FORM (Edit mode — add assignment) ── */}
          {isEditMode && addingNewAssignment && (
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Assign New Trial</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography sx={labelSx}>Project</Typography>
                  <TextField select fullWidth size="small" value={lookupProject}
                    onChange={(e) => setLookupProject(e.target.value)}>
                    <MenuItem value="" disabled>Select project</MenuItem>
                    {allTrials.map(t => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.trialType || t.trialName}{t.season ? ` — ${t.season}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <Typography sx={labelSx}>State</Typography>
                  <Autocomplete size="small" options={indianStates}
                    getOptionLabel={(o) => o.name || ''} value={lookupStateObj}
                    inputValue={stateInputValue} onInputChange={(_, v) => setStateInputValue(v)}
                    filterOptions={(opts, state) => smartFilterOptions(opts, state)}
                    onChange={(_, val) => {
                      setLookupStateObj(val);
                      setLookupCityObj(null);
                      if (val) {
                        const libCities = City.getCitiesOfState('IN', val.isoCode);
                        const libNames = new Set(libCities.map(c => c.name.toLowerCase()));
                        const projectCities = (trialCitiesByState[val.name] || [])
                          .filter(name => !libNames.has(name.toLowerCase()))
                          .map(name => ({ name, isProjectCity: true }));
                        // A city assigned under another project is a fresh start
                        // here, so don't grey it — just list alphabetically.
                        const allCities = [...libCities, ...projectCities]
                          .sort((a, b) => a.name.localeCompare(b.name));
                        setLookupAvailCities(allCities);
                      } else {
                        setLookupAvailCities([]);
                      }
                      setAssignmentData(prev => ({ ...prev, state: val?.name || '', city: '' }));
                    }}
                    renderInput={(params) => <TextField {...params} placeholder="Select state" />}
                    isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                  />
                </Box>
                <Box>
                  <Typography sx={labelSx}>City</Typography>
                  <Autocomplete size="small" options={lookupAvailCities}
                    getOptionLabel={(o) => o.name || ''} value={lookupCityObj}
                    disabled={!lookupStateObj}
                    inputValue={cityInputValue} onInputChange={(_, v) => setCityInputValue(v)}
                    filterOptions={(opts, state) => smartFilterOptions(opts, state)}
                    onChange={(_, val) => {
                      setLookupCityObj(val);
                      setAssignmentData(prev => ({ ...prev, city: val?.name || '' }));
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.name} {...otherProps}
                          sx={{ py: 1, px: 2, fontSize: '0.88rem', borderBottom: '1px solid #f3f4f6', '&:hover': { backgroundColor: '#f0f9ff !important' } }}>
                          <HighlightMatch text={option.name} query={cityInputValue} />
                        </Box>
                      );
                    }}
                    renderInput={(params) => <TextField {...params} placeholder="Select city" />}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                  />
                </Box>
              </Box>

              {/* City-specific fields for new assignment */}
              {assignmentData.city && assignmentData.state && (
                <>
                  {renderCourierSection(assignmentData, handleAssignmentChange, saving, courierPinCode => {
                    handleAssignmentChange('courierPinCode')({ target: { value: courierPinCode } });
                    lookupCourierPin(courierPinCode);
                  }, courierPinLoading, courierPinError, courierAreas, courierDistrict, courierState, courierSubArea, setCourierSubArea, labelSx, setCourierDistrict, setCourierState)}
                  {renderGroundSection(assignmentData, handleAssignmentChange, saving, labelSx, secHeaderSx, errors)}
                </>
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" size="small" onClick={handleAddAssignment}
                  disabled={saving || !assignmentData.city || !lookupProject}
                  sx={{ bgcolor: '#FBB040', '&:hover': { bgcolor: '#E89F2C' }, fontWeight: 600 }}>
                  {saving ? 'Saving...' : 'Save Assignment'}
                </Button>
                <Button size="small" onClick={() => setAddingNewAssignment(false)} disabled={saving}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}

          {/* ── COURIER ADDRESS (Add mode only) ── */}
          {!isEditMode && (
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Courier Address</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <Box>
                  <Typography sx={labelSx}>Accepting Person Name</Typography>
                  <TextField fullWidth placeholder="e.g., Ramesh Kumar"
                    value={assignmentData.courierAcceptingName}
                    onChange={handleAssignmentChange('courierAcceptingName')}
                    disabled={saving || !canFillForm} helperText="Person who receives the courier" />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Accepting Person Phone</Typography>
                  <TextField fullWidth placeholder="9876543210"
                    value={assignmentData.courierAcceptingPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      handleAssignmentChange('courierAcceptingPhone')({ target: { value: val } });
                    }}
                    inputProps={{ maxLength: 10 }}
                    error={!!errors.courierAcceptingPhone} helperText={errors.courierAcceptingPhone || '10-digit mobile number'}
                    disabled={saving || !canFillForm} />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr 1fr' }, gap: 2.5 }}>
                <Box>
                  <Typography sx={labelSx}>PIN Code</Typography>
                  <TextField fullWidth placeholder="400001"
                    value={assignmentData.courierPinCode}
                    inputProps={{ maxLength: 6 }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleAssignmentChange('courierPinCode')({ target: { value: val } });
                      lookupCourierPin(val);
                    }}
                    disabled={saving || !canFillForm}
                    error={!!courierPinError}
                    InputProps={{ endAdornment: courierPinLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null }}
                    helperText={courierPinError || 'Auto-fills district & state'} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>District</Typography>
                  <TextField fullWidth placeholder="Auto-filled" value={courierDistrict}
                    onChange={(e) => setCourierDistrict(e.target.value)}
                    InputProps={{ sx: courierDistrict ? { bgcolor: '#f0fdf4', borderRadius: 1.5 } : {} }}
                    disabled={saving || !canFillForm}
                    helperText={courierDistrict ? 'Auto-filled — editable' : 'Enter manually if not auto-filled'} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>State</Typography>
                  <TextField fullWidth placeholder="Auto-filled" value={courierState}
                    onChange={(e) => setCourierState(e.target.value)}
                    InputProps={{ sx: courierState ? { bgcolor: '#f0fdf4', borderRadius: 1.5 } : {} }}
                    disabled={saving || !canFillForm}
                    helperText={courierState ? 'Auto-filled' : 'Enter manually if not auto-filled'} />
                </Box>
                {courierAreas.length > 0 && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography sx={labelSx}>Sub Area / Locality</Typography>
                    <TextField select fullWidth value={courierSubArea}
                      onChange={(e) => setCourierSubArea(e.target.value)}
                      disabled={saving || !canFillForm}>
                      {courierAreas.map(area => <MenuItem key={area} value={area}>{area}</MenuItem>)}
                    </TextField>
                  </Box>
                )}
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={labelSx}>Flat / Door No. & Building</Typography>
                  <TextField fullWidth placeholder="e.g., Flat 4B, Sunrise Apartments, MG Road"
                    value={assignmentData.courierAddress}
                    onChange={handleAssignmentChange('courierAddress')}
                    disabled={saving || !canFillForm} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={labelSx}>Additional Info</Typography>
                  <TextField fullWidth multiline minRows={2}
                    placeholder="Any extra delivery instructions"
                    value={assignmentData.courierAdditionalInfo}
                    onChange={handleAssignmentChange('courierAdditionalInfo')}
                    disabled={saving || !canFillForm} />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── TRIAL GROUND LOCATION (Add mode only) ── */}
          {!isEditMode && (
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Trial Ground Location</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                <Box>
                  <Typography sx={labelSx}>Google Maps Link</Typography>
                  <TextField fullWidth placeholder="https://maps.google.com/..."
                    value={assignmentData.googleMapLink}
                    onChange={handleAssignmentChange('googleMapLink')}
                    error={!!errors.googleMapLink} helperText={errors.googleMapLink || 'Paste full Google Maps URL'}
                    disabled={saving || !canFillForm} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Pin Code</Typography>
                  <TextField fullWidth placeholder="e.g., 400001"
                    value={assignmentData.pinCode} inputProps={{ maxLength: 6 }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleAssignmentChange('pinCode')({ target: { value: val } });
                    }}
                    error={!!errors.pinCode} helperText={errors.pinCode || '6-digit PIN (e.g. 400001)'}
                    disabled={saving || !canFillForm} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Reporting Time</Typography>
                  <TextField fullWidth type="time" value={assignmentData.reportingTime}
                    onChange={handleAssignmentChange('reportingTime')}
                    disabled={saving || !canFillForm} InputLabelProps={{ shrink: true }} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Ground Contact Person</Typography>
                  <TextField fullWidth placeholder="e.g., Ramesh Kumar"
                    value={assignmentData.groundContactName}
                    onChange={handleAssignmentChange('groundContactName')}
                    disabled={saving || !canFillForm} />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Ground Contact Number</Typography>
                  <TextField fullWidth placeholder="9876543210"
                    value={assignmentData.groundContactPhone} inputProps={{ maxLength: 10 }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleAssignmentChange('groundContactPhone')({ target: { value: val } });
                    }}
                    error={!!errors.groundContactPhone} helperText={errors.groundContactPhone || '10-digit mobile (starts with 6-9)'}
                    disabled={saving || !canFillForm} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={labelSx}>Ground Name</Typography>
                  <TextField fullWidth placeholder="e.g., Nehru Stadium"
                    value={assignmentData.groundLocation}
                    onChange={handleAssignmentChange('groundLocation')}
                    helperText="What the venue is called. This is the Venue column on the Trials Report"
                    disabled={saving || !canFillForm} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={labelSx}>Ground Address</Typography>
                  <TextField fullWidth multiline minRows={2}
                    placeholder="Complete ground / stadium address"
                    value={assignmentData.physicalAddress}
                    onChange={handleAssignmentChange('physicalAddress')}
                    disabled={saving || !canFillForm} />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── CONTACTS (Org-level) ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Contacts</Typography>
            <Typography sx={subLabelSx}>Primary</Typography>
            <Box sx={{ ...grid2, mb: 2.5 }}>
              <Box>
                <Typography sx={labelSx}>Contact Name</Typography>
                <TextField fullWidth placeholder="e.g., Rajesh Sharma"
                  value={orgData.contactName} onChange={handleOrgChange('contactName')}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
              <Box>
                <Typography sx={labelSx}>Phone</Typography>
                <TextField fullWidth placeholder="9876543210"
                  value={orgData.phone} onChange={handleOrgChange('phone')}
                  error={!!errors.phone} helperText={errors.phone || '10-digit mobile (starts with 6-9)'}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
              <Box sx={{ gridColumn: { sm: '1 / 2' } }}>
                <Typography sx={labelSx}>Email</Typography>
                <TextField fullWidth type="email" placeholder="contact@example.com"
                  value={orgData.email} onChange={handleOrgChange('email')}
                  error={!!errors.email} helperText={errors.email || 'e.g. contact@organization.com'}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
            </Box>
            <Divider sx={{ mb: 2.5 }} />
            <Typography sx={subLabelSx}>
              Backup <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 400, color: '#9e9e9e', textTransform: 'none', letterSpacing: 0 }}>(Optional)</Typography>
            </Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>Backup Contact Name</Typography>
                <TextField fullWidth placeholder="Optional"
                  value={orgData.backupContactName} onChange={handleOrgChange('backupContactName')}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
              <Box>
                <Typography sx={labelSx}>Backup Phone</Typography>
                <TextField fullWidth placeholder="9876543210"
                  value={orgData.backupPhone} onChange={handleOrgChange('backupPhone')}
                  error={!!errors.backupPhone} helperText={errors.backupPhone || '10-digit mobile (starts with 6-9)'}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
              <Box sx={{ gridColumn: { sm: '1 / 2' } }}>
                <Typography sx={labelSx}>Backup Email</Typography>
                <TextField fullWidth type="email" placeholder="backup@example.com"
                  value={orgData.backupEmail} onChange={handleOrgChange('backupEmail')}
                  error={!!errors.backupEmail} helperText={errors.backupEmail || 'e.g. backup@organization.com'}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
              </Box>
            </Box>
          </Box>

          {/* ── DOCUMENTS & BRANDING ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Documents & Branding</Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>Signed MoU / Agreement</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button component="label" variant="outlined" startIcon={<UploadIcon />}
                    sx={{ justifyContent: 'flex-start' }} disabled={saving || !canFillForm}>
                    Choose File
                    <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleMouDocumentUpload} />
                  </Button>
                  {mouDocumentPreview && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                      <FileIcon fontSize="small" color="primary" />
                      <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }} noWrap>
                        {mouDocument?.name || editingREP?.mouDocumentName || 'MoU document attached'}
                      </Typography>
                      <IconButton size="small" onClick={() => { setMouDocument(null); setMouDocumentPreview(null); }}
                        disabled={saving} aria-label="Remove MOU document">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>PDF/DOC, max 5MB</Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={labelSx}>REP Logo</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button component="label" variant="outlined" startIcon={<UploadIcon />}
                    sx={{ justifyContent: 'flex-start' }} disabled={saving || !canFillForm}>
                    Choose File
                    <input type="file" hidden accept="image/*" onChange={handleRepLogoUpload} />
                  </Button>
                  {repLogoPreview && (
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <Box component="img" src={repLogoPreview} alt="REP Logo Preview"
                        sx={{ width: '100%', height: 80, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 1, p: 1, bgcolor: '#f9fafb' }} />
                      <IconButton size="small" onClick={() => { setRepLogo(null); setRepLogoPreview(null); }}
                        disabled={saving} aria-label="Remove REP logo"
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' } }}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>PNG/JPG, max 2MB</Typography>
                  <TextField
                    fullWidth size="small" placeholder="https://drive.google.com/..."
                    value={orgData.repLogoLink} onChange={handleOrgChange('repLogoLink')}
                    disabled={saving || !canFillForm}
                    label="Original logo link (optional)"
                    helperText="Paste a Drive/URL link to the full-quality original"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ── LEGAL INFORMATION ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Legal Information</Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>MoU Status</Typography>
                <TextField select fullWidth value={orgData.mouStatus} onChange={handleOrgChange('mouStatus')}
                  disabled={saving || !canFillForm || (!isEditMode && !!existingRep)}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {mouStatuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Box>
            </Box>
          </Box>

          {/* ── ONLINE PRESENCE ── */}
          <Box sx={{ ...cardSx, mb: 0 }}>
            <Typography sx={secHeaderSx}>Online Presence</Typography>
            <Box sx={grid2}>
              {[
                { field: 'website',   label: 'Website',   placeholder: 'https://www.example.com',      hint: 'Full URL with https://' },
                { field: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/page',    hint: 'Facebook page URL' },
                { field: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle', hint: 'Instagram profile URL' },
                { field: 'telegram',  label: 'Telegram',  placeholder: 'https://t.me/channel',         hint: 'Telegram channel/group link' },
              ].map(({ field, label, placeholder, hint }) => (
                <Box key={field}>
                  <Typography sx={labelSx}>{label}</Typography>
                  <TextField fullWidth placeholder={placeholder}
                    value={orgData[field]} onChange={handleOrgChange(field)}
                    error={!!errors[field]} helperText={errors[field] || hint}
                    disabled={saving || !canFillForm || (!isEditMode && !!existingRep)} />
                </Box>
              ))}
            </Box>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || (!isEditMode && !cityInProject)}
          sx={{ minWidth: 100, bgcolor: '#FBB040', color: '#1e293b', boxShadow: 'none', '&:hover': { bgcolor: '#FBB040', boxShadow: 'none' } }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper render functions for reuse in Edit mode's "add assignment" form
function renderCourierSection(data, onChange, saving, onPinChange, pinLoading, pinError, areas, district, state, subArea, setSubArea, labelSx, setDistrict, setState) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ color: '#3B82F6', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.82rem' }}>
        Courier Address
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography sx={labelSx}>Accepting Person</Typography>
          <TextField fullWidth size="small" value={data.courierAcceptingName}
            onChange={onChange('courierAcceptingName')} disabled={saving}
            helperText="Person who receives the courier" />
        </Box>
        <Box>
          <Typography sx={labelSx}>Accepting Phone</Typography>
          <TextField fullWidth size="small" value={data.courierAcceptingPhone}
            onChange={(e) => onChange('courierAcceptingPhone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0,10) } })}
            disabled={saving}
            helperText="10-digit mobile (starts with 6-9)" />
        </Box>
        <Box>
          <Typography sx={labelSx}>PIN Code</Typography>
          <TextField fullWidth size="small" value={data.courierPinCode}
            inputProps={{ maxLength: 6 }}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ''))}
            disabled={saving} error={!!pinError}
            InputProps={{ endAdornment: pinLoading ? <CircularProgress size={16} /> : null }}
            helperText={pinError || 'Auto-fills district & state'} />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography sx={labelSx}>Address</Typography>
          <TextField fullWidth size="small" value={data.courierAddress}
            onChange={onChange('courierAddress')} disabled={saving}
            helperText="Flat / Door No., Building, Street" />
        </Box>
        <Box>
          <Typography sx={labelSx}>District</Typography>
          <TextField fullWidth size="small" value={district || ''}
            onChange={(e) => typeof setDistrict === 'function' && setDistrict(e.target.value)}
            disabled={saving} helperText="Auto-filled from PIN — editable" />
        </Box>
        <Box>
          <Typography sx={labelSx}>State (Courier)</Typography>
          <TextField fullWidth size="small" value={state || ''}
            onChange={(e) => typeof setState === 'function' && setState(e.target.value)}
            disabled={saving} helperText="Auto-filled from PIN — editable" />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography sx={labelSx}>Sub-Area</Typography>
          <Autocomplete freeSolo size="small"
            options={areas || []}
            value={subArea || ''}
            onChange={(_, val) => setSubArea(val || '')}
            onInputChange={(_, val) => setSubArea(val || '')}
            disabled={saving}
            renderInput={(params) => <TextField {...params} placeholder="Pick from PIN areas or type your own" />}
          />
        </Box>
      </Box>
    </Box>
  );
}

function renderGroundSection(data, onChange, saving, labelSx, secHeaderSx, errors) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={secHeaderSx}>Trial Ground Location</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography sx={labelSx}>Google Maps Link</Typography>
          <TextField fullWidth size="small" value={data.googleMapLink}
            onChange={onChange('googleMapLink')} disabled={saving}
            error={!!errors?.googleMapLink} helperText={errors?.googleMapLink || 'Paste full Google Maps URL'} />
        </Box>
        <Box>
          <Typography sx={labelSx}>Pin Code</Typography>
          <TextField fullWidth size="small" value={data.pinCode}
            inputProps={{ maxLength: 6 }}
            onChange={(e) => onChange('pinCode')({ target: { value: e.target.value.replace(/\D/g, '') } })}
            disabled={saving} error={!!errors?.pinCode} helperText={errors?.pinCode || '6-digit PIN (e.g. 400001)'} />
        </Box>
        <Box>
          <Typography sx={labelSx}>Ground Contact</Typography>
          <TextField fullWidth size="small" value={data.groundContactName}
            onChange={onChange('groundContactName')} disabled={saving}
            helperText="Person at the ground venue" />
        </Box>
        <Box>
          <Typography sx={labelSx}>Ground Phone</Typography>
          <TextField fullWidth size="small" value={data.groundContactPhone}
            onChange={(e) => onChange('groundContactPhone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0,10) } })}
            disabled={saving} error={!!errors?.groundContactPhone}
            helperText={errors?.groundContactPhone || '10-digit mobile (starts with 6-9)'} />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography sx={labelSx}>Ground Name</Typography>
          <TextField fullWidth size="small" value={data.groundLocation}
            onChange={onChange('groundLocation')} disabled={saving}
            helperText="What the venue is called, e.g. Nehru Stadium. This is the Venue column on the Trials Report" />
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography sx={labelSx}>Ground Address</Typography>
          <TextField fullWidth size="small" multiline minRows={2} value={data.physicalAddress}
            onChange={onChange('physicalAddress')} disabled={saving}
            helperText="Complete ground / stadium address" />
        </Box>
      </Box>
    </Box>
  );
}

export default REPModal;
