// src/components/rep/REPModal.jsx - WITH IMPROVED ERROR HANDLING
import React, { useState, useEffect, useMemo } from 'react';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';
import { trialsAPI, repAPI } from '../../services/api';
import Divider from '@mui/material/Divider';

function REPModal({ open, onClose, onSave, editingREP }) {
  const isEditMode = !!editingREP;

  const indianStates = useMemo(() => {
    return State.getStatesOfCountry('IN').map(state => ({
      name: state.name,
      isoCode: state.isoCode,
    }));
  }, []);

  const [trialCitiesByState, setTrialCitiesByState] = useState({});

  const [formData, setFormData] = useState({
    repName: '',
    state: '',
    stateCode: '',
    city: '',
    season: '',
    region: '',
    status: 'Active',
    contactName: '',
    phone: '',
    email: '',
    backupContactName: '',
    backupPhone: '',
    backupEmail: '',
    courierPinCode: '',
    courierDistrict: '',
    courierState: '',
    courierSubArea: '',
    courierAddress: '',
    courierLandmark: '',
    courierAdditionalInfo: '',
    physicalAddress: '',
    googleMapLink: '',
    pinCode: '',
    groundLocation: '',
    groundPinCode: '',
    mouStatus: '',
    website: '',     websiteNA: false,
    facebook: '',    facebookNA: false,
    twitter: '',     twitterNA: false,
    telegram: '',    telegramNA: false,
  });

  const [mouDocument, setMouDocument] = useState(null);
  const [mouDocumentPreview, setMouDocumentPreview] = useState(null);
  const [repLogo, setRepLogo] = useState(null);
  const [repLogoPreview, setRepLogoPreview] = useState(null);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState('');
  const [locationFocused, setLocationFocused] = useState(false);
  const [courierFocused, setCourierFocused] = useState(false);

  // ── Courier PIN lookup ────────────────────────────────────────────
  const [courierAreas, setCourierAreas] = useState([]);
  const [courierPinLoading, setCourierPinLoading] = useState(false);


  // ── Lookup state (Add mode only) ──────────────────────────────────
  const [allTrials, setAllTrials] = useState([]);
  const [allReps, setAllReps] = useState([]);
  const [lookupProject, setLookupProject] = useState('');
  const [lookupStateObj, setLookupStateObj] = useState(null);
  const [lookupCityObj, setLookupCityObj] = useState(null);
  const [lookupAvailCities, setLookupAvailCities] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  // scenario: null | 1 (rep found) | 2 (no rep, city in project) | 3 (city not in project)
  const [scenario, setScenario] = useState(null);
  const [foundRep, setFoundRep] = useState(null);
  // Scenario 3 — add city to project
  const [addCityMonth, setAddCityMonth] = useState('');
  const [addCityDate, setAddCityDate] = useState('');
  const [addCitySaving, setAddCitySaving] = useState(false);
  const [cityJustAdded, setCityJustAdded] = useState(false);
  // Other projects that share the same city (shown as checkboxes in Scenario 2)
  const [otherProjectsForCity, setOtherProjectsForCity] = useState([]);
  const [selectedOtherProjectIds, setSelectedOtherProjectIds] = useState([]);

  // Load trials + reps for lookup when modal opens
  useEffect(() => {
    if (!open) return;
    setLookupProject('');
    setLookupStateObj(null);
    setLookupCityObj(null);
    setLookupAvailCities([]);
    setScenario(null);
    setFoundRep(null);
    setCityJustAdded(false);
    setOtherProjectsForCity([]);
    setSelectedOtherProjectIds([]);
    setAddCityMonth('July');
    setAddCityDate(`${new Date().getFullYear()}-07-10`);
    Promise.all([
      trialsAPI.getAll({ limit: 200 }),
      repAPI.getAll(),
    ]).then(([trialRes, repRes]) => {
      const trials = trialRes.trials || [];
      setAllTrials(trials);
      setAllReps(repRes.reps || []);
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    trialsAPI.getAll({ limit: 200 }).then((res) => {
      const trials = res.trials || [];
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
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editingREP) {
        const stateObj = indianStates.find(s => s.name === editingREP.state);
        setFormData({
          repName: editingREP.repName || '',
          state: editingREP.state || '',
          stateCode: stateObj?.isoCode || '',
          city: editingREP.city || '',
          season: editingREP.season || '',
          region: editingREP.region || '',
          status: editingREP.status || 'Active',
          contactName: editingREP.contactName || '',
          phone: editingREP.phone || '',
          email: editingREP.email || '',
          backupContactName: editingREP.backupContactName || '',
          backupPhone: editingREP.backupPhone || '',
          backupEmail: editingREP.backupEmail || '',
          courierPinCode: editingREP.courierPinCode || '',
          courierDistrict: editingREP.courierDistrict || '',
          courierState: editingREP.courierState || '',
          courierSubArea: editingREP.courierSubArea || '',
          courierAddress: editingREP.courierAddress || '',
          courierLandmark: editingREP.courierLandmark || '',
          courierAdditionalInfo: editingREP.courierAdditionalInfo || '',
          physicalAddress: editingREP.physicalAddress || '',
          googleMapLink: editingREP.googleMapLink || '',
          pinCode: editingREP.pinCode || '',
          groundLocation: editingREP.groundLocation || '',
          groundPinCode: editingREP.groundPinCode || '',
          mouStatus: editingREP.mouStatus || '',
          website: editingREP.website || '',     websiteNA: !!editingREP.websiteNA,
          facebook: editingREP.facebook || '',   facebookNA: !!editingREP.facebookNA,
          twitter: editingREP.twitter || '',     twitterNA: !!editingREP.twitterNA,
          telegram: editingREP.telegram || '',   telegramNA: !!editingREP.telegramNA,
        });
        
        if (editingREP.mouDocumentUrl) {
          setMouDocumentPreview(editingREP.mouDocumentUrl);
        }
        if (editingREP.repLogoUrl) {
          setRepLogoPreview(editingREP.repLogoUrl);
        }
      } else {
        setFormData({
          repName: '',
          state: '',
          stateCode: '',
          city: '',
          season: '',
          region: '',
          status: 'Active',
          contactName: '',
          phone: '',
          email: '',
          backupContactName: '',
          backupPhone: '',
          backupEmail: '',
          courierPinCode: '',
          courierDistrict: '',
          courierState: '',
          courierSubArea: '',
          courierAddress: '',
          courierLandmark: '',
          courierAdditionalInfo: '',
          physicalAddress: '',
          googleMapLink: '',
          pinCode: '',
          groundLocation: '',
          groundPinCode: '',
          mouStatus: '',
          website: '',     websiteNA: false,
          facebook: '',    facebookNA: false,
          twitter: '',     twitterNA: false,
          telegram: '',    telegramNA: false,
        });
        setMouDocument(null);
        setMouDocumentPreview(null);
        setRepLogo(null);
        setRepLogoPreview(null);
      }
      setErrors({});
      setFileError('');
      setCourierAreas([]);
      setCourierPinLoading(false);
    }
  }, [open, editingREP, indianStates]);

  const handleStateChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        state: newValue.name,
        stateCode: newValue.isoCode,
        city: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        state: '',
        stateCode: '',
        city: '',
      }));
    }
    
    if (errors.state) {
      setErrors(prev => ({ ...prev, state: '' }));
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCityChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      city: newValue || '',
    }));
    
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  // ── Lookup logic ─────────────────────────────────────────────────
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const runLookup = (projectVal, stateObj, cityObj) => {
    if (!stateObj || !cityObj) { setScenario(null); return; }
    const cityName = cityObj.name.toLowerCase();
    const stateName = stateObj.name.toLowerCase();

    // Check for existing REP
    const rep = allReps.find(
      r => r.city?.toLowerCase() === cityName && r.state?.toLowerCase() === stateName
    );
    if (rep) {
      setFoundRep(rep);
      setScenario(1);
      setOtherProjectsForCity([]);
      setSelectedOtherProjectIds([]);
      return;
    }

    // Check if city is in the selected project
    const projectsToCheck = projectVal === ''
      ? allTrials
      : allTrials.filter(t => String(t.id) === String(projectVal));

    const cityInProject = projectsToCheck.some(t =>
      (t.assignedCities || []).some(
        c => c.cityName?.toLowerCase() === cityName && c.state?.toLowerCase() === stateName
      )
    );

    setFoundRep(null);
    if (cityInProject) {
      // Find other projects (not the currently selected one) that also have this city
      const others = allTrials.filter(t => {
        if (projectVal !== '' && String(t.id) === String(projectVal)) return false;
        return (t.assignedCities || []).some(
          c => c.cityName?.toLowerCase() === cityName && c.state?.toLowerCase() === stateName
        );
      });
      setOtherProjectsForCity(others);
      setSelectedOtherProjectIds(others.map(t => String(t.id)));
      // Populate formData city/state from lookup so REP saves with correct values
      setFormData(prev => ({
        ...prev,
        state: stateObj.name,
        stateCode: stateObj.isoCode,
        city: cityObj.name,
      }));
      setScenario(2);
    } else {
      setOtherProjectsForCity([]);
      setSelectedOtherProjectIds([]);
      setScenario(3);
    }
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
        tentativeDate: addCityDate || (addCityMonth ? (() => { const idx = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(addCityMonth); return `${new Date().getFullYear()}-${String(idx+1).padStart(2,'0')}-10`; })() : null),
        code: `IKF-${lookupStateObj.isoCode}-${lookupCityObj.name.substring(0,3).toUpperCase()}-${String((project.assignedCities||[]).length+1).padStart(3,'0')}`,
      };
      await trialsAPI.update(project.id, {
        ...project,
        assignedCities: [...(project.assignedCities || []), newCity],
      });
      // Refresh trials list and move to scenario 2
      const res = await trialsAPI.getAll({ limit: 200 });
      const freshTrials = res.trials || [];
      setAllTrials(freshTrials);

      // Check if this city also exists in other projects (using fresh data)
      const cName = lookupCityObj.name.toLowerCase();
      const sName = lookupStateObj.name.toLowerCase();
      const others = freshTrials.filter(t => {
        if (String(t.id) === String(lookupProject)) return false;
        return (t.assignedCities || []).some(
          c => c.cityName?.toLowerCase() === cName && c.state?.toLowerCase() === sName
        );
      });
      setOtherProjectsForCity(others);
      setSelectedOtherProjectIds(others.map(t => String(t.id)));
      // Populate formData city/state from lookup
      setFormData(prev => ({
        ...prev,
        state: lookupStateObj.name,
        stateCode: lookupStateObj.isoCode,
        city: lookupCityObj.name,
      }));
      setScenario(2);
      setCityJustAdded(true);
      setAddCityMonth('July');
      setAddCityDate(`${new Date().getFullYear()}-07-10`);
    } catch {
      setFileError('Failed to add city to project');
    } finally {
      setAddCitySaving(false);
    }
  };

  // IMPROVED: File upload handlers with better error handling
  const handleMouDocumentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(''); // Clear previous errors

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setFileError('MoU document must be PDF or DOC format');
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('MoU document must be less than 5MB');
      event.target.value = '';
      return;
    }

    setMouDocument(file);
    setMouDocumentPreview(file.name);
    event.target.value = '';
  };

  const handleRepLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(''); // Clear previous errors

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFileError('REP logo must be an image file (PNG, JPG, etc.)');
      event.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFileError('REP logo must be less than 2MB');
      event.target.value = '';
      return;
    }

    setRepLogo(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setRepLogoPreview(reader.result);
    };
    reader.onerror = () => {
      setFileError('Failed to read image file');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveMouDocument = () => {
    setMouDocument(null);
    setMouDocumentPreview(null);
    setFileError('');
  };

  const handleRemoveRepLogo = () => {
    setRepLogo(null);
    setRepLogoPreview(null);
    setFileError('');
  };


  const lookupCourierPin = async (pin) => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setCourierAreas([]);
      setFormData(prev => ({ ...prev, courierDistrict: '', courierState: '', courierSubArea: '' }));
      return;
    }
    setCourierPinLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const record = json?.[0];
      if (record?.Status === 'Success' && record.PostOffice?.length > 0) {
        const first = record.PostOffice[0];
        const areas = record.PostOffice.map(po => po.Name);
        setCourierAreas(areas);
        setFormData(prev => ({
          ...prev,
          courierDistrict: first.District || '',
          courierState: first.State || '',
          courierSubArea: areas[0] || '',
        }));
      } else {
        setCourierAreas([]);
        setFormData(prev => ({ ...prev, courierDistrict: '', courierState: '', courierSubArea: '' }));
      }
    } catch {
      setCourierAreas([]);
    } finally {
      setCourierPinLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.repName.trim()) {
      newErrors.repName = 'REP Name is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Phone validation (Indian mobile: starts with 6-9, 10 digits)
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        newErrors.phone = 'Phone must be exactly 10 digits';
      } else if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        newErrors.phone = 'Invalid Indian phone number (must start with 6-9)';
      }
    }

    // Backup phone validation
    if (formData.backupPhone) {
      const bpDigits = formData.backupPhone.replace(/\D/g, '');
      if (bpDigits.length !== 10) {
        newErrors.backupPhone = 'Backup phone must be exactly 10 digits';
      } else if (!/^[6-9]\d{9}$/.test(bpDigits)) {
        newErrors.backupPhone = 'Invalid Indian phone number (must start with 6-9)';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }



    // PIN code validation
    if (formData.pinCode && formData.pinCode.trim()) {
      if (!/^[1-9][0-9]{5}$/.test(formData.pinCode.trim())) {
        newErrors.pinCode = 'Invalid PIN code (must be 6 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Clear previous file errors
    setFileError('');

    // Validate form
    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const repData = { ...formData };
      delete repData.stateCode;

      // Add file data
      if (mouDocument) {
        repData.mouDocumentName = mouDocument.name;
        repData.mouDocumentUrl = mouDocumentPreview;
      }
      if (repLogo) {
        repData.repLogoName = repLogo.name;
        repData.repLogoUrl = repLogoPreview;
      }
      // Build trial IDs to assign: primary lookup project + checked other projects
      const trialIds = [
        ...(lookupProject && lookupProject !== '' ? [Number(lookupProject)] : []),
        ...selectedOtherProjectIds.map(Number),
      ];
      if (trialIds.length > 0) {
        repData.trialIds = [...new Set(trialIds)]; // deduplicate
      }

      // Call parent save function
      await onSave(repData);
      
      // Success! Reset file states
      setMouDocument(null);
      setMouDocumentPreview(null);
      setRepLogo(null);
      setRepLogoPreview(null);
      setSelectedOtherProjectIds([]);
      setFileError('');

      // Note: onClose() is called by parent after success toast
    } catch (error) {
      console.error('Error saving REP:', error);
      
      // Show error in modal
      setFileError(
        error.message || 
        'Failed to save REP. Please try again.'
      );
      
      // Don't close modal - let user retry
      throw error; // Re-throw so parent knows it failed
    } finally {
      setSaving(false);
    }
  };

  const seasons = ['Season 5', 'Season 6'];
  const mouStatuses = ['Signed', 'Pending', 'Not Required'];
  const availableCities = trialCitiesByState[formData.state] || [];
  const selectedState = indianStates.find(s => s.isoCode === formData.stateCode) || null;

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
  const grid2 = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    gap: 2.5,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
          bgcolor: '#f8fafc',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
      }}>
        <Typography variant="h6" fontWeight={600}>
          {isEditMode ? 'Edit REP' : 'Add REP'}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          
          {/* Error Alert - NEW */}
          {fileError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFileError('')}>
              {fileError}
            </Alert>
          )}

          {/* ── Lookup section (Add mode only) ── */}
          {!isEditMode && (
            <Box sx={{ mb: 3 }}>
              {/* Project + City + State row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Project</Typography>
                  <TextField
                    select fullWidth
                    value={lookupProject}
                    onChange={(e) => {
                      setLookupProject(e.target.value);
                      runLookup(e.target.value, lookupStateObj, lookupCityObj);
                    }}
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
                  <Autocomplete
                    size="small"
                    options={indianStates}
                    getOptionLabel={(o) => o.name || ''}
                    value={lookupStateObj}
                    onChange={(_, val) => {
                      setLookupStateObj(val);
                      setLookupCityObj(null);
                      if (val) {
                        const libCities = City.getCitiesOfState('IN', val.isoCode);
                        const libNames = new Set(libCities.map(c => c.name.toLowerCase()));
                        // Add project sub-cities that aren't already in the library list
                        const projectCities = (trialCitiesByState[val.name] || [])
                          .filter(name => !libNames.has(name.toLowerCase()))
                          .map(name => ({ name, isProjectCity: true }));
                        const merged = [...libCities, ...projectCities]
                          .sort((a, b) => a.name.localeCompare(b.name));
                        setLookupAvailCities(merged);
                      } else {
                        setLookupAvailCities([]);
                      }
                      setScenario(null);
                    }}
                    renderInput={(params) => <TextField {...params} placeholder="Select state" />}
                    isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                    ListboxProps={{ style: { maxHeight: 200 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>City</Typography>
                  <Autocomplete
                    size="small"
                    options={lookupAvailCities}
                    getOptionLabel={(o) => o.name || ''}
                    value={lookupCityObj}
                    disabled={!lookupStateObj}
                    onChange={(_, val) => {
                      setLookupCityObj(val);
                      runLookup(lookupProject, lookupStateObj, val);
                    }}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.name} {...otherProps}
                          sx={{ py: 1, px: 2, fontSize: '0.88rem', borderBottom: '1px solid #f3f4f6',
                            '&:hover': { backgroundColor: '#f0f9ff !important' },
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {option.name}
                          {option.isProjectCity && (
                            <Typography sx={{ fontSize: '0.68rem', color: '#3B82F6', fontWeight: 600,
                              bgcolor: '#dbeafe', px: 0.75, py: 0.1, borderRadius: 1, ml: 1 }}>
                              Project
                            </Typography>
                          )}
                        </Box>
                      );
                    }}
                    renderInput={(params) => <TextField {...params} placeholder={lookupStateObj ? 'Select city' : 'Select state first'} />}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                    ListboxProps={{ style: { maxHeight: 220 } }}
                  />
                </Box>
              </Box>

              {/* Scenario results */}
              {scenario === 1 && (
                <Box sx={{ p: 2, borderRadius: '10px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                    REP already assigned
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{foundRep.repName}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.25 }}>
                    {foundRep.city}{foundRep.region && foundRep.region !== foundRep.city ? ` · ${foundRep.region}` : ''} · {foundRep.state}
                  </Typography>
                  {foundRep.contactName && (
                    <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', mt: 0.25 }}>{foundRep.contactName}</Typography>
                  )}
                </Box>
              )}

              {scenario === 2 && !cityJustAdded && (
                <Box sx={{ p: 2, borderRadius: '10px', bgcolor: '#eef2ff', border: '1px solid #c7d2fe', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca', mb: 0.25 }}>
                    No REP found
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#6366f1' }}>
                    Fill the form below to add one.
                  </Typography>
                </Box>
              )}

              {scenario === 2 && cityJustAdded && (
                <Box sx={{ p: 2, borderRadius: '10px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', mb: 0.25 }}>
                    City added successfully
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#16a34a' }}>
                    Now add REP for this location below.
                  </Typography>
                </Box>
              )}


              {scenario === 3 && (
                <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                    City not in project — add it first
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Month</Typography>
                      <TextField
                        select fullWidth
                        value={addCityMonth}
                        onChange={(e) => setAddCityMonth(e.target.value)}
                        SelectProps={{ displayEmpty: true }}
                      >
                        <MenuItem value="">Select month</MenuItem>
                        {months.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>Date</Typography>
                      <TextField
                        fullWidth type="date"
                        value={addCityDate}
                        onChange={(e) => setAddCityDate(e.target.value)}
                      />
                    </Box>
                  </Box>
                  <Button
                    variant="contained" size="small" fullWidth
                    disabled={addCitySaving || lookupProject === ''}
                    onClick={handleAddCityToProject}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                  >
                    {addCitySaving ? 'Adding...' : lookupProject === '' ? 'Select a specific project first' : `Add ${lookupCityObj?.name || 'city'} to project`}
                  </Button>
                </Box>
              )}

              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* ── BASIC INFORMATION ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Basic Information</Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>REP Name <span style={{ color: '#ef4444' }}>*</span></Typography>
                <TextField fullWidth
                  placeholder="e.g., Sports Academy Mumbai"
                  value={formData.repName}
                  onChange={handleChange('repName')}
                  error={!!errors.repName} helperText={errors.repName}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
            </Box>
          </Box>

          {/* ── REGION (Edit mode only — in Add mode state/city come from lookup) ── */}
          {isEditMode && (
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Trial Location</Typography>
              <Box sx={grid2}>
                <Box>
                  <Typography sx={labelSx}>State <span style={{ color: '#ef4444' }}>*</span></Typography>
                  <Autocomplete
                    value={selectedState}
                    onChange={handleStateChange}
                    options={indianStates}
                    getOptionLabel={(option) => option?.name || ''}
                    isOptionEqualToValue={(option, value) => option?.isoCode === value?.isoCode}
                    disabled={saving}
                    openOnFocus
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.isoCode} {...otherProps}
                          sx={{ py: 1.5, px: 2, fontSize: '0.95rem', borderBottom: '1px solid #f3f4f6',
                            '&:hover': { backgroundColor: '#f0f9ff !important' } }}>
                          {option.name}
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Search state..."
                        error={!!errors.state} helperText={errors.state} />
                    )}
                    slotProps={{
                      popper: { sx: { zIndex: 1500 }, placement: 'bottom-start',
                        modifiers: [{ name: 'flip', enabled: false }] },
                      paper: { sx: { mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: 2, minWidth: 300,
                        '& .MuiAutocomplete-listbox': { padding: 0, maxHeight: 260 } } },
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={labelSx}>Assign Trial City <span style={{ color: '#ef4444' }}>*</span></Typography>
                  <Autocomplete
                    value={formData.city || null}
                    onChange={handleCityChange}
                    options={availableCities}
                    disabled={!formData.state || saving}
                    openOnFocus
                    noOptionsText={formData.state ? 'No trial cities for this state' : 'Select state first'}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option} {...otherProps}
                          sx={{ py: 1.5, px: 2, fontSize: '0.95rem', borderBottom: '1px solid #f3f4f6',
                            '&:hover': { backgroundColor: '#f0f9ff !important' } }}>
                          {option}
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField {...params}
                        placeholder={formData.state ? 'Select city...' : 'Select state first'}
                        error={!!errors.city} helperText={errors.city}
                      />
                    )}
                    slotProps={{
                      popper: { sx: { zIndex: 1500 }, placement: 'bottom-start' },
                      paper: { sx: { mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        borderRadius: 2, '& .MuiAutocomplete-listbox': { padding: 0, maxHeight: 260 } } },
                    }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── COURIER ADDRESS ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Courier Address</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr 1fr' }, gap: 2.5 }}>
              {/* Row 1 — PIN | District | State */}
              <Box>
                <Typography sx={labelSx}>PIN Code</Typography>
                <TextField fullWidth
                  placeholder="400001"
                  value={formData.courierPinCode}
                  inputProps={{ maxLength: 6 }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    handleChange('courierPinCode')({ target: { value: val } });
                    lookupCourierPin(val);
                  }}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  InputProps={{
                    endAdornment: courierPinLoading
                      ? <CircularProgress size={16} sx={{ mr: 1 }} />
                      : null,
                  }}
                  helperText="Auto-fills district & state"
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>District</Typography>
                <TextField fullWidth
                  placeholder="Auto-filled"
                  value={formData.courierDistrict}
                  onChange={handleChange('courierDistrict')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  InputProps={{
                    readOnly: !!formData.courierDistrict && courierAreas.length > 0,
                    sx: formData.courierDistrict
                      ? { bgcolor: '#f0fdf4', borderRadius: 1.5, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#86efac' } }
                      : { borderRadius: 1.5 },
                  }}
                  helperText={formData.courierDistrict ? '✓ Auto-filled' : ' '}
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>State</Typography>
                <TextField fullWidth
                  placeholder="Auto-filled"
                  value={formData.courierState}
                  onChange={handleChange('courierState')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  InputProps={{
                    readOnly: !!formData.courierState && courierAreas.length > 0,
                    sx: formData.courierState
                      ? { bgcolor: '#f0fdf4', borderRadius: 1.5, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#86efac' } }
                      : { borderRadius: 1.5 },
                  }}
                  helperText={formData.courierState ? '✓ Auto-filled' : ' '}
                />
              </Box>
              {/* Row 2 — Sub Area */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={labelSx}>
                  Sub Area / Locality
                  {courierAreas.length > 0 && (
                    <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: '#16a34a', ml: 1 }}>
                      {courierAreas.length} areas found — pick yours
                    </Typography>
                  )}
                </Typography>
                {courierAreas.length > 0 ? (
                  <TextField select fullWidth
                    value={formData.courierSubArea}
                    onChange={handleChange('courierSubArea')}
                    disabled={saving || (!isEditMode && scenario !== 2)}
                    helperText="Post office areas for this PIN"
                  >
                    {courierAreas.map(area => (
                      <MenuItem key={area} value={area}>{area}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField fullWidth
                    placeholder="e.g., Andheri West, Koramangala, Sector 18"
                    value={formData.courierSubArea}
                    onChange={handleChange('courierSubArea')}
                    disabled={saving || (!isEditMode && scenario !== 2)}
                    helperText="Neighbourhood / locality within the city"
                  />
                )}
              </Box>
              {/* Row 3 — Flat / Building */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={labelSx}>Flat / Door No. & Building</Typography>
                <TextField fullWidth
                  placeholder="e.g., Flat 4B, Sunrise Apartments, MG Road"
                  value={formData.courierAddress}
                  onChange={handleChange('courierAddress')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  helperText="House / flat number, building name, street"
                />
              </Box>
              {/* Row 4 — Landmark */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={labelSx}>Landmark</Typography>
                <TextField fullWidth
                  placeholder="e.g., Near City Mall, Opposite HDFC Bank, Behind Bus Stand"
                  value={formData.courierLandmark}
                  onChange={handleChange('courierLandmark')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  helperText="A well-known nearby reference point for delivery"
                />
              </Box>
              {/* Row 5 — Additional Info */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={labelSx}>Additional Info</Typography>
                <TextField fullWidth multiline minRows={3}
                  placeholder="Any extra delivery instructions, access details, alternate contact, etc."
                  value={formData.courierAdditionalInfo}
                  onChange={handleChange('courierAdditionalInfo')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
            </Box>
          </Box>

          {/* ── TRIAL GROUND LOCATION ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Trial Ground Location</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Typography sx={labelSx}>Google Maps Link</Typography>
                <TextField fullWidth
                  placeholder="https://maps.google.com/..."
                  value={formData.googleMapLink}
                  onChange={handleChange('googleMapLink')}
                  error={!!errors.googleMapLink} helperText={errors.googleMapLink}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>Pin Code</Typography>
                <TextField fullWidth placeholder="e.g., 400001"
                  value={formData.pinCode}
                  inputProps={{ maxLength: 6 }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    handleChange('pinCode')({ target: { value: val } });
                  }}
                  error={!!errors.pinCode}
                  helperText={errors.pinCode}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={labelSx}>Ground Address</Typography>
                <TextField fullWidth multiline
                  minRows={locationFocused ? 4 : 2}
                  placeholder="Complete ground / stadium address"
                  value={formData.physicalAddress}
                  onChange={handleChange('physicalAddress')}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => setLocationFocused(false)}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                  sx={{ transition: 'all 0.2s ease' }}
                />
              </Box>
            </Box>
          </Box>

          {/* ── CONTACTS ── */}
          <Box sx={cardSx}>
            <Typography sx={secHeaderSx}>Contacts</Typography>
            <Typography sx={subLabelSx}>Primary</Typography>
            <Box sx={{ ...grid2, mb: 2.5 }}>
              <Box>
                <Typography sx={labelSx}>Contact Name</Typography>
                <TextField fullWidth placeholder="e.g., Rajesh Sharma"
                  value={formData.contactName}
                  onChange={handleChange('contactName')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>Phone</Typography>
                <TextField fullWidth placeholder="9876543210"
                  value={formData.phone} onChange={handleChange('phone')}
                  error={!!errors.phone} helperText={errors.phone}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: '1 / 2' } }}>
                <Typography sx={labelSx}>Email</Typography>
                <TextField fullWidth type="email" placeholder="contact@example.com"
                  value={formData.email} onChange={handleChange('email')}
                  error={!!errors.email} helperText={errors.email}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 2.5 }} />
            <Typography sx={subLabelSx}>
              Backup{' '}
              <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 400, color: '#9e9e9e', textTransform: 'none', letterSpacing: 0 }}>
                (Optional)
              </Typography>
            </Typography>
            <Box sx={grid2}>
              <Box>
                <Typography sx={labelSx}>Backup Contact Name</Typography>
                <TextField fullWidth placeholder="Optional"
                  value={formData.backupContactName}
                  onChange={handleChange('backupContactName')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box>
                <Typography sx={labelSx}>Backup Phone</Typography>
                <TextField fullWidth placeholder="Optional"
                  value={formData.backupPhone} onChange={handleChange('backupPhone')}
                  error={!!errors.backupPhone} helperText={errors.backupPhone}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
              </Box>
              <Box sx={{ gridColumn: { sm: '1 / 2' } }}>
                <Typography sx={labelSx}>Backup Email</Typography>
                <TextField fullWidth type="email" placeholder="backup@example.com"
                  value={formData.backupEmail} onChange={handleChange('backupEmail')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                />
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
                    sx={{ justifyContent: 'flex-start' }}
                    disabled={saving || (!isEditMode && scenario !== 2)}>
                    Choose File
                    <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleMouDocumentUpload} />
                  </Button>
                  {mouDocumentPreview && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                      <FileIcon fontSize="small" color="primary" />
                      <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
                        {typeof mouDocumentPreview === 'string' && mouDocumentPreview.length > 30
                          ? mouDocumentPreview.substring(0, 30) + '...'
                          : mouDocumentPreview}
                      </Typography>
                      <IconButton size="small" onClick={handleRemoveMouDocument}
                        disabled={saving || (!isEditMode && scenario !== 2)} aria-label="Remove MOU document">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    PDF/DOC, max 5MB
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={labelSx}>REP Logo</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button component="label" variant="outlined" startIcon={<UploadIcon />}
                    sx={{ justifyContent: 'flex-start' }}
                    disabled={saving || (!isEditMode && scenario !== 2)}>
                    Choose File
                    <input type="file" hidden accept="image/*" onChange={handleRepLogoUpload} />
                  </Button>
                  {repLogoPreview && (
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <Box component="img" src={repLogoPreview} alt="REP Logo Preview"
                        sx={{ width: '100%', height: 80, objectFit: 'contain',
                          border: '1px solid #e5e7eb', borderRadius: 1, p: 1, bgcolor: '#f9fafb' }}
                      />
                      <IconButton size="small" onClick={handleRemoveRepLogo}
                        disabled={saving || (!isEditMode && scenario !== 2)}
                        aria-label="Remove REP logo"
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' } }}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    PNG/JPG, max 2MB
                  </Typography>
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
                <TextField select fullWidth
                  value={formData.mouStatus} onChange={handleChange('mouStatus')}
                  disabled={saving || (!isEditMode && scenario !== 2)}
                >
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {mouStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Box>
            </Box>
          </Box>

          {/* ── ONLINE PRESENCE ── */}
          <Box sx={{ ...cardSx, mb: 0 }}>
            <Typography sx={secHeaderSx}>Online Presence</Typography>
            <Box sx={grid2}>
              {[
                { field: 'website',  naField: 'websiteNA',  label: 'Website',  placeholder: 'https://www.example.com' },
                { field: 'facebook', naField: 'facebookNA', label: 'Facebook', placeholder: 'https://facebook.com/page' },
                { field: 'twitter',  naField: 'twitterNA',  label: 'Twitter',  placeholder: 'https://twitter.com/handle' },
                { field: 'telegram', naField: 'telegramNA', label: 'Telegram', placeholder: 'https://t.me/channel or @handle' },
              ].map(({ field, naField, label, placeholder }) => (
                <Box key={field}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ ...labelSx, mb: 0 }}>{label}</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox size="small" checked={formData[naField]} onChange={handleChange(naField)}
                          disabled={saving || (!isEditMode && scenario !== 2)} sx={{ p: 0.5 }} />
                      }
                      label={<Typography sx={{ fontSize: '0.78rem', color: '#9e9e9e' }}>N/A</Typography>}
                      sx={{ m: 0, gap: 0.5 }}
                    />
                  </Stack>
                  <TextField fullWidth
                    placeholder={formData[naField] ? 'Not Available' : placeholder}
                    value={formData[naField] ? '' : formData[field]}
                    onChange={handleChange(field)}
                    disabled={saving || formData[naField]}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: formData[naField] ? '#f5f5f5' : 'white' } }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

        </Box>

        {/* ── ALSO ASSIGN TO OTHER PROJECTS ── */}
        {!isEditMode && scenario === 2 && otherProjectsForCity.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', px: 1 }}>
                Also Save For
              </Typography>
            </Divider>
            <Box sx={{ p: 3, borderRadius: '14px', bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '1.1rem' }}>📋</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#4c1d95', mb: 0.25 }}>
                    This city exists in other projects too
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#7c3aed', lineHeight: 1.5 }}>
                    The REP you filled above will also be saved for the projects below. Uncheck any you want to skip.
                  </Typography>
                </Box>
              </Stack>

              <Stack spacing={0.5}>
                {otherProjectsForCity.map(t => (
                  <Box
                    key={t.id}
                    onClick={() => {
                      setSelectedOtherProjectIds(prev =>
                        prev.includes(String(t.id))
                          ? prev.filter(id => id !== String(t.id))
                          : [...prev, String(t.id)]
                      );
                    }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1.5, borderRadius: '10px', cursor: 'pointer',
                      bgcolor: selectedOtherProjectIds.includes(String(t.id)) ? '#ede9fe' : 'white',
                      border: '1px solid',
                      borderColor: selectedOtherProjectIds.includes(String(t.id)) ? '#a78bfa' : '#e5e7eb',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#a78bfa', bgcolor: '#f5f3ff' },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={selectedOtherProjectIds.includes(String(t.id))}
                      onChange={() => {}}
                      sx={{ p: 0, '&.Mui-checked': { color: '#7c3aed' } }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                        {t.trialType || t.trialName}
                      </Typography>
                      {t.season && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {t.season}
                        </Typography>
                      )}
                    </Box>
                    {selectedOtherProjectIds.includes(String(t.id)) && (
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', bgcolor: '#ede9fe', px: 1, py: 0.25, borderRadius: 5 }}>
                        Will be saved
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.82rem', color: '#6d28d9', fontWeight: 500 }}>
                  {selectedOtherProjectIds.length > 0
                    ? `This REP will be saved for ${selectedOtherProjectIds.length + 1} projects in total`
                    : 'No additional projects selected'}
                </Typography>
                {selectedOtherProjectIds.length < otherProjectsForCity.length && (
                  <Typography
                    onClick={() => setSelectedOtherProjectIds(otherProjectsForCity.map(t => String(t.id)))}
                    sx={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Select all
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || (!isEditMode && scenario !== 2)}
          sx={{
            minWidth: 100,
            bgcolor: '#FBB040',
            color: '#1e293b',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#FBB040',
              boxShadow: 'none',
            }
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default REPModal;