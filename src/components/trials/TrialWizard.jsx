// src/components/trials/TrialWizard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Snackbar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

import { getProjectNames, getSeasons } from '../../utils/adminStorage';
import { generateProjectCode } from '../../utils/trialCodeGenerator';
import { trialsAPI } from '../../services/api';

// ── MD3-aligned shared styles ──────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '1rem' },
  '& .MuiInputLabel-root': { fontSize: '1rem' },
};

const selectInputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '1rem', height: '44px' },
};

const filledBtnSx = {
  borderRadius: '20px', textTransform: 'none',
  fontWeight: 700, fontSize: '0.95rem',
  py: 1.25, px: 3.5, boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
  '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
};

const outlinedBtnSx = {
  borderRadius: '20px', textTransform: 'none',
  fontWeight: 600, fontSize: '0.95rem',
  py: 1.25, px: 3.5,
  border: '1.5px solid #c7c7cc', color: '#1d1d1f',
  '&:hover': { bgcolor: '#f5f5f7', border: '1.5px solid #888', boxShadow: 'none' },
};

const sectionTitleSx = {
  fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', mb: 0.5,
};

const fieldLabelSx = {
  fontSize: '0.9rem', fontWeight: 600, color: '#3c3c43', mb: 0.75, display: 'block',
};

function TrialWizard() {
  const navigate = useNavigate();
  const adminProjects = getProjectNames();
  const adminProjectNames = adminProjects.map(p => p.name);
  const adminSeasons = getSeasons().map(s => s.name);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const [existingTrials, setExistingTrials] = useState([]);

  const [formData, setFormData] = useState({
    projectName: '',
    season: '',
    status: 'Draft',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    trialsAPI.getAll()
      .then(r => setExistingTrials(r.trials || []))
      .catch(() => {});
  }, []);

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const autoProjectCode = (formData.projectName && formData.season)
    ? generateProjectCode(formData.projectName, formData.season, existingTrials)
    : '';

  const handleChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!formData.projectName) errs.projectName = 'Project name is required';
    if (!formData.season) errs.season = 'Season is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isFormFilled = !!(formData.projectName && formData.season);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const code = generateProjectCode(formData.projectName, formData.season, existingTrials);
      const existing = existingTrials.find(
        t => t.trialType === formData.projectName && t.season === formData.season
      );

      if (existing) {
        showToast(`A "${formData.projectName}" project for ${formData.season} already exists`, 'warning');
      } else {
        await trialsAPI.create({
          trialName: code,
          trialCode: code,
          season: formData.season,
          trialType: formData.projectName,
          tierType: 'Not Any',
          tierDetails: null, tierAmount: null, expectedParticipants: null,
          scheduleType: 'Tentative',
          startDate: null, endDate: null,
          tentativeMonth: null,
          tentativeDateRange: null,
          nextTrialDate: null,
          status: formData.status,
          comment: null,
          assignedCities: [],
        });
      }
      setCreatedCode(code);
      setConfirmModalOpen(false);
      setSuccessModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to create project', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 1 — PROJECT SETUP
  // ═══════════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <Box>
      <Typography sx={sectionTitleSx}>Project Setup</Typography>
      <Typography variant="body2" sx={{ mb: 2.5, color: '#6e6e73', fontSize: '0.95rem' }}>
        Select your project and season to get started.
      </Typography>

      {/* ── Admin-only info banner ── */}
      <Box sx={{
        mb: 3.5,
        p: 2,
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #e8eaf6 100%)',
        border: '1px solid #b3d7f7',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>🔐</Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#1e40af', fontWeight: 500, lineHeight: 1.5 }}>
          New <strong>seasons</strong> and <strong>projects</strong> can only be created by admins from the{' '}
          <span style={{ color: '#1d4ed8', fontWeight: 700 }}>Admin Panel</span>.
          Contact your admin to add new options.
        </Typography>
      </Box>

      {/*
        CSS Grid — 3 rows × 2 columns
        row 1 (1/2): labels        — Project Name label  | Season label
        row 2 (2/3): dropdowns     — Project Name select | Season select
        row 3 (3/4): card          — spans col 1/3 (full width), always occupies space
      */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        columnGap: 3,
        rowGap: 0,
      }}>

        {/* ── Row 1: Labels ── */}
        <Typography sx={fieldLabelSx}>
          Project Name <span style={{ color: '#ef4444' }}>*</span>
        </Typography>
        <Typography sx={{ ...fieldLabelSx, mt: { xs: 2, sm: 0 } }}>
          Season <span style={{ color: '#ef4444' }}>*</span>
        </Typography>

        {/* ── Row 2: Dropdowns ── */}
        <Box>
          <TextField
            select fullWidth size="small"
            value={formData.projectName}
            onChange={handleChange('projectName')}
            error={!!errors.projectName}
            sx={selectInputSx}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="" sx={{ color: '#aaa' }}>Select project</MenuItem>
            {adminProjectNames.map(p => (
              <MenuItem key={p} value={p} sx={{ fontSize: '1rem', fontWeight: 500 }}>{p}</MenuItem>
            ))}
          </TextField>
          {errors.projectName && (
            <Typography sx={{ fontSize: '0.75rem', color: '#ef4444', mt: 0.5, ml: 1.75 }}>
              {errors.projectName}
            </Typography>
          )}
        </Box>

        <Box>
          <TextField
            select fullWidth size="small"
            value={formData.season}
            onChange={handleChange('season')}
            error={!!errors.season}
            sx={selectInputSx}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="" sx={{ color: '#aaa' }}>Select season</MenuItem>
            {adminSeasons.map(s => (
              <MenuItem key={s} value={s} sx={{ fontSize: '1rem', fontWeight: 500 }}>{s}</MenuItem>
            ))}
          </TextField>
          {errors.season && (
            <Typography sx={{ fontSize: '0.75rem', color: '#ef4444', mt: 0.5, ml: 1.75 }}>
              {errors.season}
            </Typography>
          )}
        </Box>

        {/* ── Row 2.5: Admin comment card ── */}
        {(() => {
          const proj = adminProjects.find(p => p.name === formData.projectName);
          return proj?.comment ? (
            <Box sx={{
              gridColumn: { xs: '1 / 2', sm: '1 / 3' },
              mt: 2,
              p: 2.5,
              borderRadius: '14px',
              bgcolor: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              gap: 1.5,
              alignItems: 'flex-start',
            }}>
              <Typography sx={{ fontSize: '1.1rem', lineHeight: 1, mt: 0.2 }}>📋</Typography>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                  Note from Admin
                </Typography>
                <Typography sx={{ fontSize: '0.92rem', color: '#78350f', lineHeight: 1.6 }}>
                  {proj.comment}
                </Typography>
              </Box>
            </Box>
          ) : null;
        })()}

        {/* ── Row 3: ID Card — subtle pink-indigo gradient, split left/right ── */}
        <Box
          sx={{
            gridColumn: { xs: '1 / 2', sm: '1 / 3' },
            mt: 2.5,
            height: 88,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(251,207,232,0.18) 0%, rgba(199,210,254,0.14) 60%, rgba(167,139,250,0.12) 100%)',
            border: '1px solid rgba(236,72,153,0.14)',
            boxShadow: '0 2px 12px rgba(236,72,153,0.07)',
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            opacity: (formData.projectName && formData.season) ? 1 : 0,
            transition: 'opacity 0.35s ease',
            pointerEvents: 'none',
          }}
        >
          {/* Left — Display ID: "ProjectName — Season" combined */}
          <Box sx={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            px: 3,
            borderRight: '1px solid rgba(236,72,153,0.12)',
            overflow: 'hidden',
          }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
              Display ID
            </Typography>
            <Typography sx={{
              fontSize: '0.97rem', fontWeight: 600,
              color: '#4c1d95',
              fontFamily: '"Georgia", "Times New Roman", serif',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.3,
              letterSpacing: '0.01em',
            }}>
              {formData.projectName}{formData.season ? ` — ${formData.season}` : ''}
            </Typography>
          </Box>

          {/* Right — Reference Code */}
          <Box sx={{
            width: 210, flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            px: 3,
            background: 'linear-gradient(135deg, rgba(199,210,254,0.2) 0%, rgba(167,139,250,0.15) 100%)',
          }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.4 }}>
              Reference Code
            </Typography>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#4338ca', fontFamily: '"Roboto Mono", "Courier New", monospace', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              {autoProjectCode}
            </Typography>
          </Box>
        </Box>

      </Box>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Box sx={{ py: 4, minHeight: '100vh', bgcolor: '#f5f5f7' }}>
      <Container maxWidth="md">
        <Paper elevation={0} sx={{
          borderRadius: '20px', p: { xs: 3, sm: 4.5 }, mb: 3,
          border: '1.5px solid #e8e8e8', bgcolor: '#fff',
        }}>
          {renderStep1()}
        </Paper>

        {/* Navigation */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/trials')}
            sx={{ ...outlinedBtnSx, px: 3.5 }}
          >
            Back to Projects
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={!isFormFilled}
            onClick={() => { if (validate()) setConfirmModalOpen(true); }}
            sx={{
              ...filledBtnSx,
              px: 4.5,
              transition: 'background-color 0.25s ease, color 0.25s ease',
              bgcolor: isFormFilled ? '#22c55e' : '#d1d5db',
              color: isFormFilled ? '#fff' : '#9ca3af',
              '&:hover': { bgcolor: isFormFilled ? '#16a34a' : '#d1d5db', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#d1d5db', color: '#9ca3af' },
            }}
          >
            Confirm
          </Button>
        </Stack>
      </Container>

      {/* Confirmation modal */}
      <Dialog
        open={confirmModalOpen}
        onClose={() => !saving && setConfirmModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            minWidth: 480,
            overflow: 'hidden',
            backgroundColor: '#fff',
            backgroundImage: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(167,139,250,0.10) 50%, rgba(99,102,241,0.13) 100%)',
            border: '1.5px solid rgba(167,139,250,0.25)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#1e293b', pt: 3.5, px: 4, pb: 1 }}>
          Create Project?
        </DialogTitle>
        <DialogContent sx={{ px: 4, pb: 1 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
              Display ID
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#4c1d95', fontFamily: '"Georgia", "Times New Roman", serif', lineHeight: 1.4 }}>
              {formData.projectName}{formData.season ? ` — ${formData.season}` : ''}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6 }}>
            You can add locations and schedule later from the Projects section.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 3.5, pt: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setConfirmModalOpen(false)}
            disabled={saving}
            sx={{ ...outlinedBtnSx }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            sx={{ ...filledBtnSx, bgcolor: '#22c55e', color: '#fff', '&:hover': { bgcolor: '#16a34a' }, px: 4 }}
          >
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success modal */}
      <Dialog
        open={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          setFormData({ projectName: '', season: '', status: 'Draft' });
          setErrors({});
        }}
        PaperProps={{ sx: { borderRadius: '20px', p: 1, minWidth: 380, textAlign: 'center' } }}
      >
        <DialogContent sx={{ pt: 4, pb: 2 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center',
            justifyContent: 'center', mx: 'auto', mb: 2.5,
            border: '2px solid #bbf7d0',
          }}>
            <CheckIcon sx={{ fontSize: 34, color: '#22c55e' }} />
          </Box>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', mb: 1 }}>
            Project Created!
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#4338ca', fontFamily: '"Roboto Mono", monospace', mb: 1 }}>
            {createdCode}
          </Typography>
          <Typography sx={{ fontSize: '0.88rem', color: '#64748b' }}>
            Your project has been created and is now visible in the Projects section.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setSuccessModalOpen(false);
              setFormData({ projectName: '', season: '', status: 'Draft' });
              setErrors({});
            }}
            sx={{ ...filledBtnSx, borderColor: '#22c55e', color: '#22c55e', '&:hover': { bgcolor: '#f0fdf4' }, px: 3 }}
          >
            Create Another
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/trials')}
            sx={{ ...filledBtnSx, bgcolor: '#22c55e', color: '#fff', '&:hover': { bgcolor: '#16a34a' }, px: 3 }}
          >
            Go to Projects
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: '12px', fontSize: '0.95rem' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TrialWizard;
