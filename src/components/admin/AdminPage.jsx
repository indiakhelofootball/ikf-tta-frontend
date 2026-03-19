// src/components/admin/AdminPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Stack, TextField,
  Button, IconButton, Divider, Tooltip, Alert,
  FormControl, Select, MenuItem, Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
  Folder as ProjectIcon,
  Store as VendorIcon,
} from '@mui/icons-material';
import {
  getProjectNames, saveProjectNames,
  getSeasons, saveSeasons,
  getVendorTypes, saveVendorTypes,
  getEntityTypes, saveEntityTypes,
  getVendorNames, saveVendorNames,
} from '../../utils/adminStorage';

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '0.95rem' },
};

function OptionPanel({ title, subtitle, items, onSave }) {
  const [list, setList] = useState(items);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [dupeError, setDupeError] = useState('');

  useEffect(() => { setList(items); }, [items]);

  const persist = (updated) => {
    setList(updated);
    onSave(updated);
  };

  const isDuplicate = (name, excludeId = null) => {
    const lower = name.toLowerCase().trim();
    return list.some(item => item.name.toLowerCase().trim() === lower && item.id !== excludeId);
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (isDuplicate(name)) {
      setDupeError(`"${name}" already exists.`);
      return;
    }
    setDupeError('');
    const updated = [...list, { id: Date.now(), name }];
    persist(updated);
    setNewName('');
  };

  const handleDelete = (id) => {
    persist(list.filter(item => item.id !== id));
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setDupeError('');
  };

  const handleSaveEdit = () => {
    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, editingId)) {
      setDupeError(`"${name}" already exists.`);
      return;
    }
    setDupeError('');
    persist(list.map(item =>
      item.id === editingId ? { ...item, name } : item
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => { setEditingId(null); setDupeError(''); };

  return (
    <Paper elevation={0} sx={{ border: '1.5px solid #e8e8e8', borderRadius: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3.5, py: 2.5, bgcolor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f' }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.82rem', color: '#6e6e73', mt: 0.25 }}>{subtitle}</Typography>
      </Box>

      {/* Current items */}
      <Box sx={{ px: 3.5, pt: 2.5, pb: 1 }}>
        {list.length === 0 ? (
          <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', py: 1.5 }}>
            No options added yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {list.map((item) => (
              <Box key={item.id}>
                {editingId === item.id ? (
                  /* Edit mode */
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'flex-start' }}>
                    <TextField
                      size="small" fullWidth
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setDupeError(''); }}
                      placeholder="Option name"
                      sx={fieldSx}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                    />
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Save">
                        <IconButton size="small" onClick={handleSaveEdit}
                          sx={{ color: '#22c55e', '&:hover': { bgcolor: '#f0fdf4' } }}>
                          <CheckIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton size="small" onClick={handleCancelEdit}
                          sx={{ color: '#94a3b8', '&:hover': { bgcolor: '#f5f5f7' } }}>
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ) : (
                  /* Display mode */
                  <Stack direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #f0f0f0', bgcolor: '#fff',
                      '&:hover': { borderColor: '#e0e0e0', bgcolor: '#fafafa' }, transition: 'all 0.15s' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
                        {item.name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 1.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => startEdit(item)}
                          sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#4f46e5' } }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(item.id)}
                          sx={{ color: '#94a3b8', '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' } }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ mx: 3.5, my: 2, borderColor: '#f0f0f0' }} />

      {/* Add new */}
      <Box sx={{ px: 3.5, pb: 3 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
          Add New
        </Typography>
        {dupeError && (
          <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '12px', py: 0 }}>
            {dupeError}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'flex-start' }}>
          <TextField
            size="small" fullWidth
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setDupeError(''); }}
            placeholder="Option name"
            sx={fieldSx}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!newName.trim()}
            startIcon={<AddIcon sx={{ fontSize: '0.95rem' }} />}
            sx={{
              bgcolor: '#6366f1', color: '#fff', borderRadius: '12px',
              textTransform: 'none', fontWeight: 700, boxShadow: 'none', whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#4f46e5', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
            }}
          >
            Add
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

/* ── Vendor Name Panel (with Service Type + Entity Type tags) ── */
function VendorNamePanel({ items, onSave, serviceTypes, entityTypes }) {
  const [list, setList] = useState(items);
  const [newName, setNewName] = useState('');
  const [newServiceType, setNewServiceType] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editEntityType, setEditEntityType] = useState('');
  const [dupeError, setDupeError] = useState('');

  useEffect(() => { setList(items); }, [items]);

  const persist = (updated) => { setList(updated); onSave(updated); };

  const isDuplicate = (name, serviceType, entityType, excludeId = null) => {
    const lower = name.toLowerCase().trim();
    return list.some(item =>
      item.name.toLowerCase().trim() === lower &&
      (item.serviceType || '') === serviceType &&
      (item.entityType || '') === entityType &&
      item.id !== excludeId
    );
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (isDuplicate(name, newServiceType, newEntityType)) {
      setDupeError(`"${name}" already exists for this service type / entity type.`);
      return;
    }
    setDupeError('');
    persist([...list, { id: Date.now(), name, serviceType: newServiceType, entityType: newEntityType }]);
    setNewName(''); setNewServiceType(''); setNewEntityType('');
  };

  const handleDelete = (id) => persist(list.filter(item => item.id !== id));

  const startEdit = (item) => {
    setEditingId(item.id); setEditName(item.name);
    setEditServiceType(item.serviceType || ''); setEditEntityType(item.entityType || '');
    setDupeError('');
  };

  const handleSaveEdit = () => {
    const name = editName.trim();
    if (!name) return;
    if (isDuplicate(name, editServiceType, editEntityType, editingId)) {
      setDupeError(`"${name}" already exists for this service type / entity type.`);
      return;
    }
    setDupeError('');
    persist(list.map(item =>
      item.id === editingId ? { ...item, name, serviceType: editServiceType, entityType: editEntityType } : item
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => { setEditingId(null); setDupeError(''); };

  const selectSx = { borderRadius: '12px', fontSize: '0.85rem' };
  const menuMaxH = { PaperProps: { sx: { maxHeight: 300 } } };

  return (
    <Paper elevation={0} sx={{ border: '1.5px solid #e8e8e8', borderRadius: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3.5, py: 2.5, bgcolor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f' }}>Vendor Names</Typography>
        <Typography sx={{ fontSize: '0.82rem', color: '#6e6e73', mt: 0.25 }}>
          Pre-approved vendor names, tagged with their service type and entity type.
        </Typography>
      </Box>

      {/* Current items */}
      <Box sx={{ px: 3.5, pt: 2.5, pb: 1 }}>
        {list.length === 0 ? (
          <Typography sx={{ fontSize: '0.85rem', color: '#94a3b8', py: 1.5 }}>No vendor names added yet.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {list.map((item) => (
              <Box key={item.id}>
                {editingId === item.id ? (
                  /* Edit mode */
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, border: '1px solid #e0e0e0', borderRadius: '12px', bgcolor: '#fafafa' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <FormControl fullWidth size="small">
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.72rem', mb: 0.5 }}>Service Type</Typography>
                        <Select value={editServiceType} onChange={(e) => { setEditServiceType(e.target.value); setDupeError(''); }}
                          displayEmpty renderValue={(v) => v || <em style={{ color: '#94a3b8' }}>Any</em>}
                          sx={selectSx} MenuProps={menuMaxH}>
                          <MenuItem value=""><em>Any</em></MenuItem>
                          {serviceTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.72rem', mb: 0.5 }}>Entity Type</Typography>
                        <Select value={editEntityType} onChange={(e) => { setEditEntityType(e.target.value); setDupeError(''); }}
                          displayEmpty renderValue={(v) => v || <em style={{ color: '#94a3b8' }}>Any</em>}
                          sx={selectSx} MenuProps={menuMaxH}>
                          <MenuItem value=""><em>Any</em></MenuItem>
                          {entityTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'flex-start' }}>
                      <TextField size="small" fullWidth value={editName}
                        onChange={(e) => { setEditName(e.target.value); setDupeError(''); }}
                        placeholder="Vendor name" sx={fieldSx} autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Save">
                          <IconButton size="small" onClick={handleSaveEdit}
                            sx={{ color: '#22c55e', '&:hover': { bgcolor: '#f0fdf4' } }}>
                            <CheckIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={handleCancelEdit}
                            sx={{ color: '#94a3b8', '&:hover': { bgcolor: '#f5f5f7' } }}>
                            <CloseIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Box>
                ) : (
                  /* Display mode */
                  <Stack direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #f0f0f0', bgcolor: '#fff',
                      '&:hover': { borderColor: '#e0e0e0', bgcolor: '#fafafa' }, transition: 'all 0.15s' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
                        {item.name}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        {item.serviceType && (
                          <Chip label={item.serviceType} size="small"
                            sx={{ fontSize: '0.68rem', fontWeight: 600, height: 22, bgcolor: '#ede9fe', color: '#7c3aed' }} />
                        )}
                        {item.entityType && (
                          <Chip label={item.entityType} size="small"
                            sx={{ fontSize: '0.68rem', fontWeight: 600, height: 22, bgcolor: '#fef3c7', color: '#b45309' }} />
                        )}
                        {!item.serviceType && !item.entityType && (
                          <Chip label="Any type" size="small"
                            sx={{ fontSize: '0.68rem', height: 22, bgcolor: '#f1f5f9', color: '#94a3b8' }} />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 1.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => startEdit(item)}
                          sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#4f46e5' } }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(item.id)}
                          sx={{ color: '#94a3b8', '&:hover': { bgcolor: '#fef2f2', color: '#ef4444' } }}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ mx: 3.5, my: 2, borderColor: '#f0f0f0' }} />

      {/* Add new */}
      <Box sx={{ px: 3.5, pb: 3 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
          Add New Vendor Name
        </Typography>
        {dupeError && (
          <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '12px', py: 0 }}>{dupeError}</Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
          <FormControl fullWidth size="small">
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.72rem', mb: 0.5 }}>Service Type</Typography>
            <Select value={newServiceType} onChange={(e) => setNewServiceType(e.target.value)}
              displayEmpty renderValue={(v) => v || <em style={{ color: '#94a3b8' }}>Any (all service types)</em>}
              sx={{ borderRadius: '12px', fontSize: '0.85rem' }} MenuProps={menuMaxH}>
              <MenuItem value=""><em>Any (all service types)</em></MenuItem>
              {serviceTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.72rem', mb: 0.5 }}>Entity Type</Typography>
            <Select value={newEntityType} onChange={(e) => setNewEntityType(e.target.value)}
              displayEmpty renderValue={(v) => v || <em style={{ color: '#94a3b8' }}>Any (all entity types)</em>}
              sx={{ borderRadius: '12px', fontSize: '0.85rem' }} MenuProps={menuMaxH}>
              <MenuItem value=""><em>Any (all entity types)</em></MenuItem>
              {entityTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'flex-start' }}>
          <TextField size="small" fullWidth value={newName}
            onChange={(e) => { setNewName(e.target.value); setDupeError(''); }}
            placeholder="Vendor name" sx={fieldSx}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          <Button variant="contained" onClick={handleAdd} disabled={!newName.trim()}
            startIcon={<AddIcon sx={{ fontSize: '0.95rem' }} />}
            sx={{
              bgcolor: '#6366f1', color: '#fff', borderRadius: '12px',
              textTransform: 'none', fontWeight: 700, boxShadow: 'none', whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#4f46e5', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
            }}>
            Add
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

/* ── Collapsible section group ── */
function SectionGroup({ icon, label, color, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <Box>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          cursor: 'pointer', userSelect: 'none',
          px: 2, py: 1.5, mb: open ? 2 : 0,
          borderRadius: '14px',
          bgcolor: open ? `${color}08` : 'transparent',
          border: open ? `1.5px solid ${color}30` : '1.5px solid transparent',
          '&:hover': { bgcolor: `${color}10` },
          transition: 'all 0.2s',
        }}
      >
        {open
          ? <ExpandIcon sx={{ fontSize: 22, color }} />
          : <CollapseIcon sx={{ fontSize: 22, color }} />
        }
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f' }}>
            {label}
          </Typography>
        </Box>
      </Box>
      {open && (
        <Stack spacing={2.5} sx={{ pl: { xs: 0, sm: 2 }, mb: 3 }}>
          {children}
        </Stack>
      )}
    </Box>
  );
}

export default function AdminPage() {
  const [projectNames, setProjectNames] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [vendorTypes, setVendorTypes] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [vendorNames, setVendorNames] = useState([]);

  useEffect(() => {
    setProjectNames(getProjectNames());
    setSeasons(getSeasons());
    setVendorTypes(getVendorTypes());
    setEntityTypes(getEntityTypes());
    setVendorNames(getVendorNames());
  }, []);

  return (
    <Box sx={{ py: 4, minHeight: '100vh', bgcolor: '#f5f5f7' }}>
      <Container maxWidth="lg">

        {/* Page header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', mb: 0.5 }}>
            Admin Settings
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', color: '#6e6e73' }}>
            Manage the dropdown options available across the application.
          </Typography>
        </Box>

        <Stack spacing={1}>
          {/* ── PROJECT section ── */}
          <SectionGroup
            icon={<ProjectIcon sx={{ fontSize: 20, color: '#6366f1' }} />}
            label="Project"
            color="#6366f1"
            defaultOpen={false}
          >
            <OptionPanel
              title="Project Names"
              subtitle="These appear in the Project Name dropdown when creating a new project."
              items={projectNames}
              onSave={(updated) => { setProjectNames(updated); saveProjectNames(updated); }}
            />
            <OptionPanel
              title="Seasons"
              subtitle="These appear in the Season dropdown when creating a new project."
              items={seasons}
              onSave={(updated) => { setSeasons(updated); saveSeasons(updated); }}
            />
          </SectionGroup>

          {/* ── VENDORS section ── */}
          <SectionGroup
            icon={<VendorIcon sx={{ fontSize: 20, color: '#f59e0b' }} />}
            label="Vendors"
            color="#f59e0b"
            defaultOpen={true}
          >
            <OptionPanel
              title="Service Types"
              subtitle="Service types available when adding a vendor (e.g. Photography, Videography, Printing)."
              items={vendorTypes}
              onSave={(updated) => { setVendorTypes(updated); saveVendorTypes(updated); }}
            />
            <OptionPanel
              title="Entity Types"
              subtitle="Company/entity types available when adding a vendor (e.g. Individual, Private Limited, LLP)."
              items={entityTypes}
              onSave={(updated) => { setEntityTypes(updated); saveEntityTypes(updated); }}
            />
            <VendorNamePanel
              items={vendorNames}
              onSave={(updated) => { setVendorNames(updated); saveVendorNames(updated); }}
              serviceTypes={vendorTypes.map(v => v.name)}
              entityTypes={entityTypes.map(v => v.name)}
            />
          </SectionGroup>
        </Stack>

      </Container>
    </Box>
  );
}
