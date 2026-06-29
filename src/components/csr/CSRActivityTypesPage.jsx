import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert, CircularProgress,
  TextField, FormControlLabel, Checkbox, List, ListItem, ListItemText, IconButton, Chip,
} from '@mui/material';
import {
  Add as AddIcon, ArrowBack as BackIcon, Delete as DeleteIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';

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

  const remove = async (t) => {
    if (!window.confirm(`Delete activity type "${t.name}"?`)) return;
    try {
      await csrAPI.activityTypes.delete(t.id);
      notify('Activity type deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/admin')} sx={{ mb: 2 }}>
        Admin Settings
      </Button>
      <Typography variant="h5" sx={{ mb: 0.5 }}>CSR Activity Types</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The admin-managed catalog of activity types (trials, workshops, trainings) that CSR staff
        pick from when adding a project activity. Mark a type as a reusable master template if it
        applies across projects.
      </Typography>

      {editable && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3, alignItems: { sm: 'center' } }}
        >
          <TextField
            label="New activity type" value={name}
            onChange={(e) => setName(e.target.value)} size="small" fullWidth
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          />
          <FormControlLabel
            control={<Checkbox checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} />}
            label="Master"
          />
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={add} disabled={saving || !name.trim()}
          >
            Add
          </Button>
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : types.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No activity types yet. Add the first one above.
        </Typography>
      ) : (
        <List>
          {types.map((t) => (
            <ListItem
              key={t.id}
              divider
              secondaryAction={editable && (
                <IconButton size="small" onClick={() => remove(t)} aria-label="Delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            >
              <ListItemText primary={t.name} />
              {t.isMaster && <Chip size="small" label="Master" sx={{ mr: 1 }} />}
            </ListItem>
          ))}
        </List>
      )}

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
    </Container>
  );
}
