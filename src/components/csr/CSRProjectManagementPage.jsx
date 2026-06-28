import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert,
  CircularProgress, TextField, InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  VolunteerActivism as CSRIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import CSRProjectCard from './CSRProjectCard';
import CSRProjectModal from './CSRProjectModal';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';

export default function CSRProjectManagementPage() {
  const { canEdit } = useGrants();
  const editable = canEdit('csr');

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await csrAPI.projects.getAll();
      setProjects(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      notify(e.message || 'Failed to load projects.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefetchOnFocus(() => load(true));

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (project) => { setEditing(project); setModalOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await csrAPI.projects.update(editing.id, payload);
        notify('Project updated.');
      } else {
        await csrAPI.projects.create(payload);
        notify('Project created.');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete CSR project "${project.name}"? This cannot be undone.`)) return;
    try {
      await csrAPI.projects.delete(project.id);
      notify('Project deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q)
    );
  });

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CSRIcon color="primary" />
          <Typography variant="h5">CSR Projects</Typography>
        </Stack>
        {editable && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Project
          </Button>
        )}
      </Stack>

      <TextField
        placeholder="Search by project or client…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          },
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No CSR projects yet.
        </Typography>
      ) : (
        filtered.map((p) => (
          <CSRProjectCard
            key={p.id}
            project={p}
            canEdit={editable}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))
      )}

      <CSRProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        saving={saving}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
