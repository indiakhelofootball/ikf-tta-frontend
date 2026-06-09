import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemText, Chip, Avatar,
  Button, TextField, InputAdornment, Divider, Stack, CircularProgress,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAddAlt1 as PersonAddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { permissionsAPI } from '../../services/api';

const INDIGO = '#4F46E5';
const SLATE = '#1e293b';
const MUTED = '#64748b';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

const emptyForm = { firstName: '', lastName: '', email: '', password: '', confirm: '' };

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const loadUsers = useCallback(async () => {
    try {
      const res = await permissionsAPI.listUsers();
      setUsers(res.users || []);
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, search]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openModal = () => {
    setForm(emptyForm);
    setErrors({});
    setShowPwd(false);
    setOpen(true);
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await permissionsAPI.createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setToast({ severity: 'success', msg: `User created — grant their access on Access Control` });
      setOpen(false);
      await loadUsers();
    } catch (err) {
      // Surface backend field errors (e.g. duplicate email, weak password)
      const fieldErrors = err?.response?.data?.errors;
      const msg = fieldErrors
        ? Object.values(fieldErrors).flat().join(' ')
        : (err.message || 'Failed to create user');
      setToast({ severity: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress sx={{ color: INDIGO }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PersonAddIcon sx={{ color: INDIGO, fontSize: 30 }} />
          <Typography sx={{ fontWeight: 800, color: SLATE, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
            User Management
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openModal}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
          Create User
        </Button>
      </Stack>
      <Typography sx={{ color: MUTED, fontSize: '0.95rem', mb: 3 }}>
        Create logins for new users. A new user has no access until you grant modules on the Access Control page.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5 }}>
          <TextField fullWidth size="small" placeholder="Search users"
            value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} />
        </Box>
        <Divider />
        <List dense sx={{ py: 0 }}>
          {filtered.map((u) => (
            <ListItem key={u.id} sx={{ gap: 1.25, py: 1.25 }} divider>
              <Avatar sx={{ width: 36, height: 36, fontSize: '0.82rem', bgcolor: u.isSuperAdmin ? INDIGO : '#cbd5e1', color: u.isSuperAdmin ? '#fff' : SLATE }}>
                {initials(u.name)}
              </Avatar>
              <ListItemText primary={u.name} secondary={u.email}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.92rem', color: SLATE }}
                secondaryTypographyProps={{ fontSize: '0.78rem' }} />
              {u.isSuperAdmin
                ? <Chip size="small" label="SUPER" sx={{ height: 22, fontSize: '0.64rem', bgcolor: INDIGO, color: '#fff' }} />
                : <Chip size="small" label={u.role} variant="outlined" sx={{ height: 22, fontSize: '0.64rem' }} />}
            </ListItem>
          ))}
          {filtered.length === 0 && (
            <Box sx={{ p: 3, color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>No users match.</Box>
          )}
        </List>
      </Paper>

      {/* Create user dialog */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: SLATE, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon sx={{ color: INDIGO }} /> Create User
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="First name" fullWidth size="small" value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                error={!!errors.firstName} helperText={errors.firstName} />
              <TextField label="Last name" fullWidth size="small" value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)} />
            </Stack>
            <TextField label="Email (login id)" type="email" fullWidth size="small" value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              error={!!errors.email} helperText={errors.email} />
            <TextField label="Password" type={showPwd ? 'text' : 'password'} fullWidth size="small" value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              error={!!errors.password} helperText={errors.password}
              slotProps={{ input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd((s) => !s)} edge="end">
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) } }} />
            <TextField label="Confirm password" type={showPwd ? 'text' : 'password'} fullWidth size="small" value={form.confirm}
              onChange={(e) => setField('confirm', e.target.value)}
              error={!!errors.confirm} helperText={errors.confirm} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={submit} disabled={saving} variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
