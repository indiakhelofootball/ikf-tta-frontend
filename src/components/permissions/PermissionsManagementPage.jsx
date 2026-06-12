import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, List, ListItemButton, ListItemText, Chip, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Button,
  Snackbar, Alert, CircularProgress, Divider, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Tabs, Tab, Badge, Stack, IconButton, FormControlLabel, Switch,
} from '@mui/material';
import {
  Search as SearchIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  WarningAmber as WarningIcon,
  Inbox as InboxIcon,
  PeopleAlt as PeopleIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  PersonAddAlt1 as PersonAddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { permissionsAPI } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';

const INDIGO = '#4F46E5';
const SLATE = '#1e293b';
const MUTED = '#64748b';
const emptyCell = { can_view: false, can_edit: false };
const emptyUserForm = { firstName: '', lastName: '', email: '', password: '', confirm: '', role: 'REP' };

const labelSx = { fontWeight: 700, color: SLATE, fontSize: '0.82rem' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function PermissionsManagementPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [modules, setModules] = useState([]);
  const [sodPairs, setSodPairs] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ---- Users tab state ----
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [grants, setGrants] = useState({});
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  // ---- Requests tab state ----
  const [review, setReview] = useState(null); // { request, grid: {mod:{view,edit}} }
  const [deciding, setDeciding] = useState(false);

  // ---- Audit tab state ----
  const [auditLogs, setAuditLogs] = useState(null); // null = not loaded yet
  const [auditTotal, setAuditTotal] = useState(0);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // ---- Create-user dialog state ----
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyUserForm);
  const [createErrors, setCreateErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);

  // ---- Delete-user dialog state ----
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const r = await permissionsAPI.listRequests();
      setRequests(r.requests || []);
    } catch { /* non-super or empty */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [mods, usr] = await Promise.all([
          permissionsAPI.getModules(),
          permissionsAPI.listUsers(),
        ]);
        setModules(mods.modules || []);
        setSodPairs(mods.separationOfDutiesPairs || []);
        setUsers(usr.users || []);
        await loadRequests();
      } catch (e) {
        setToast({ severity: 'error', msg: e.message || 'Failed to load' });
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRequests]);

  const moduleLabel = useCallback(
    (key) => modules.find((m) => m.key === key)?.label || key, [modules]);

  const loadAudit = useCallback(async (page = 1) => {
    setLoadingAudit(true);
    try {
      const r = await permissionsAPI.getAuditLog({ page });
      setAuditLogs((prev) => (page === 1 ? r.logs : [...(prev || []), ...r.logs]));
      setAuditTotal(r.total || 0);
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed to load audit log' });
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 2 && auditLogs === null) loadAudit(1);
  }, [tab, auditLogs, loadAudit]);

  // ---------- Users tab ----------
  const selectUser = useCallback(async (u) => {
    setSelectedUser(u);
    setGrants({});
    if (u.isSuperAdmin) return;
    setLoadingGrants(true);
    try {
      const res = await permissionsAPI.getUserPermissions(u.id);
      setGrants(res.grants || {});
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed to load grants' });
    } finally {
      setLoadingGrants(false);
    }
  }, []);

  // ---------- Create user ----------
  const setCreateField = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    setCreateErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateCreate = () => {
    const e = {};
    if (!createForm.firstName.trim()) e.firstName = 'Required';
    if (!createForm.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) e.email = 'Enter a valid email';
    if (!createForm.password) e.password = 'Required';
    else if (createForm.password.length < 8) e.password = 'At least 8 characters';
    if (createForm.confirm !== createForm.password) e.confirm = 'Passwords do not match';
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setCreateForm(emptyUserForm);
    setCreateErrors({});
    setShowPwd(false);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!validateCreate()) return;
    setCreating(true);
    try {
      const res = await permissionsAPI.createUser({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      setCreateOpen(false);
      const refreshed = await permissionsAPI.listUsers();
      const list = refreshed.users || [];
      setUsers(list);
      setTab(0);
      if (createForm.role === 'SUPER_ADMIN') {
        // Super admins bypass grants — nothing to tick.
        setToast({ severity: 'success', msg: 'Super Admin created — full access, ready to log in' });
      } else {
        // Land the admin straight in the grant grid for the new user —
        // creating a login is only half the job until access is granted.
        const created = list.find((u) =>
          u.id === res.user?.id || u.email === createForm.email.trim());
        if (created) selectUser(created);
        setToast({ severity: 'success', msg: 'User created — now grant their access' });
      }
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors;
      const msg = fieldErrors
        ? Object.values(fieldErrors).flat().join(' ')
        : (err.message || 'Failed to create user');
      setToast({ severity: 'error', msg });
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await permissionsAPI.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
      setToast({ severity: 'success', msg: `${deleteTarget.name} deleted` });
      setDeleteTarget(null);
      setAuditLogs(null);
    } catch (err) {
      setToast({ severity: 'error', msg: err.message || 'Failed to delete user' });
    } finally {
      setDeleting(false);
    }
  };

  const setCell = (moduleKey, field, value) => {
    setGrants((prev) => {
      const cur = prev[moduleKey] || emptyCell;
      const next = { ...cur, [field]: value };
      if (field === 'can_edit' && value) next.can_view = true;
      if (field === 'can_view' && !value) next.can_edit = false;
      return { ...prev, [moduleKey]: next };
    });
  };

  const violatesSoD = useMemo(
    () => sodPairs.some(([a, b]) => grants[a]?.can_edit && grants[b]?.can_edit),
    [grants, sodPairs]);

  const sodLabel = useMemo(() => {
    const pair = sodPairs.find(([a, b]) => grants[a]?.can_edit && grants[b]?.can_edit);
    return pair ? `${moduleLabel(pair[0])} + ${moduleLabel(pair[1])}` : '';
  }, [sodPairs, grants, moduleLabel]);

  const doSave = async () => {
    setWarnOpen(false);
    setSaving(true);
    try {
      await permissionsAPI.setUserPermissions(selectedUser.id, grants);
      setToast({ severity: 'success', msg: `Saved for ${selectedUser.name}` });
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id
        ? { ...u, grantedModules: Object.keys(grants).filter((k) => grants[k].can_view || grants[k].can_edit).sort() }
        : u));
      setAuditLogs(null);
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [users, search]);

  // ---------- Requests tab ----------
  const openReview = (req) => {
    const grid = {};
    req.modules.forEach((key) => {
      const m = modules.find((mm) => mm.key === key);
      grid[key] = { can_view: true, can_edit: false, viewOnly: !!m?.viewOnly };
    });
    setReview({ request: req, grid });
  };

  const setReviewCell = (key, field, value) => {
    setReview((prev) => {
      const cur = prev.grid[key];
      const next = { ...cur, [field]: value };
      if (field === 'can_edit' && value) next.can_view = true;
      if (field === 'can_view' && !value) next.can_edit = false;
      return { ...prev, grid: { ...prev.grid, [key]: next } };
    });
  };

  const decide = async (decision) => {
    setDeciding(true);
    try {
      const grantsPayload = {};
      if (decision === 'approve') {
        Object.entries(review.grid).forEach(([k, v]) => {
          grantsPayload[k] = { can_view: v.can_view, can_edit: v.can_edit };
        });
      }
      await permissionsAPI.decideRequest(review.request.id, decision, grantsPayload);
      setToast({ severity: 'success', msg: `Request ${decision === 'approve' ? 'approved' : 'rejected'}` });
      setReview(null);
      setAuditLogs(null);
      await loadRequests();
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed' });
    } finally {
      setDeciding(false);
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
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AdminIcon sx={{ color: INDIGO, fontSize: 30 }} />
          <Typography sx={{ fontWeight: 800, color: SLATE, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
            User Management
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openCreate}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
          Create User
        </Button>
      </Stack>
      <Typography sx={{ color: MUTED, fontSize: '0.95rem', mb: 3 }}>
        Create logins and grant module access per person. Review access requests and audit every change. SUPER_ADMIN always has full access.
      </Typography>

      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid #e2e8f0',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', color: MUTED },
          '& .Mui-selected': { color: `${INDIGO} !important` },
          '& .MuiTabs-indicator': { bgcolor: INDIGO, height: 3, borderRadius: 3 } }}
      >
        <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="Users" />
        <Tab
          iconPosition="start"
          icon={
            <Badge badgeContent={requests.length} color="error" sx={{ '& .MuiBadge-badge': { right: -3, top: 2 } }}>
              <InboxIcon fontSize="small" />
            </Badge>
          }
          label="Requests"
          sx={{ pr: requests.length ? 3 : 2 }}
        />
        <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Audit" />
      </Tabs>

      {tab === 0 ? (
        <UsersTab
          {...{ filteredUsers, search, setSearch, selectedUser, selectUser, modules,
            grants, setCell, loadingGrants, saving, violatesSoD, sodLabel, warnOpen, setWarnOpen, doSave }}
          currentEmail={currentUser?.email}
          onDelete={setDeleteTarget}
        />
      ) : tab === 1 ? (
        <RequestsTab requests={requests} moduleLabel={moduleLabel} onReview={openReview} />
      ) : (
        <AuditTab logs={auditLogs || []} total={auditTotal} loading={loadingAudit}
          moduleLabel={moduleLabel} onLoadMore={loadAudit} />
      )}

      {/* SoD soft-warning before save */}
      <Dialog open={warnOpen} onClose={() => setWarnOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: '#d97706' }} /> Separation of duties
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are granting Edit on <strong>{sodLabel}</strong> to {selectedUser?.name}. This lets one
            person both raise and approve payments. Save anyway?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWarnOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={doSave} variant="contained" color="warning" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Save anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request review dialog */}
      <Dialog open={!!review} onClose={() => setReview(null)} maxWidth="sm" fullWidth>
        {review && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: SLATE }}>
              Review request — {review.request.requesterName}
            </DialogTitle>
            <DialogContent dividers>
              {review.request.note && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: MUTED, fontWeight: 600, mb: 0.5 }}>Note</Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: SLATE }}>{review.request.note}</Typography>
                </Box>
              )}
              <Typography sx={{ fontSize: '0.85rem', color: MUTED, mb: 1 }}>
                They requested these modules. Tick what you grant, then approve.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={labelSx}>Module</TableCell>
                    <TableCell align="center" sx={{ ...labelSx, width: 80 }}>View</TableCell>
                    <TableCell align="center" sx={{ ...labelSx, width: 80 }}>Edit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {review.request.modules.map((key) => (
                    <TableRow key={key}>
                      <TableCell sx={{ fontWeight: 600 }}>{moduleLabel(key)}</TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" checked={!!review.grid[key]?.can_view}
                          onChange={(e) => setReviewCell(key, 'can_view', e.target.checked)} />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" checked={!!review.grid[key]?.can_edit}
                          disabled={review.grid[key]?.viewOnly}
                          onChange={(e) => setReviewCell(key, 'can_edit', e.target.checked)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => decide('reject')} disabled={deciding}
                startIcon={<CloseIcon />} color="inherit" sx={{ textTransform: 'none', color: '#b91c1c' }}>
                Reject
              </Button>
              <Button onClick={() => decide('approve')} disabled={deciding}
                variant="contained" startIcon={<CheckIcon />}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
                Approve
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete user confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        {deleteTarget && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: SLATE, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeleteIcon sx={{ color: '#b91c1c' }} /> Delete user
            </DialogTitle>
            <DialogContent dividers>
              <DialogContentText sx={{ color: SLATE }}>
                Permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
                Their login and module grants are removed. This cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button onClick={confirmDelete} disabled={deleting} variant="contained" color="error"
                sx={{ textTransform: 'none', fontWeight: 700 }}>
                {deleting ? 'Deleting…' : 'Delete user'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: SLATE, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon sx={{ color: INDIGO }} /> Create User
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="First name" fullWidth size="small" value={createForm.firstName}
                onChange={(e) => setCreateField('firstName', e.target.value)}
                error={!!createErrors.firstName} helperText={createErrors.firstName} />
              <TextField label="Last name" fullWidth size="small" value={createForm.lastName}
                onChange={(e) => setCreateField('lastName', e.target.value)} />
            </Stack>
            <TextField label="Email (login id)" type="email" fullWidth size="small" value={createForm.email}
              onChange={(e) => setCreateField('email', e.target.value)}
              error={!!createErrors.email} helperText={createErrors.email} />
            <TextField label="Password" type={showPwd ? 'text' : 'password'} fullWidth size="small" value={createForm.password}
              onChange={(e) => setCreateField('password', e.target.value)}
              error={!!createErrors.password} helperText={createErrors.password}
              slotProps={{ input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd((s) => !s)} edge="end">
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) } }} />
            <TextField label="Confirm password" type={showPwd ? 'text' : 'password'} fullWidth size="small" value={createForm.confirm}
              onChange={(e) => setCreateField('confirm', e.target.value)}
              error={!!createErrors.confirm} helperText={createErrors.confirm} />
            <FormControlLabel
              control={
                <Switch checked={createForm.role === 'SUPER_ADMIN'} color="warning"
                  onChange={(e) => setCreateField('role', e.target.checked ? 'SUPER_ADMIN' : 'REP')} />
              }
              label={
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: SLATE }}>
                  Super Admin
                </Typography>
              }
            />
            {createForm.role === 'SUPER_ADMIN' ? (
              <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                Unrestricted access to every module, including this page. Grant it sparingly.
              </Alert>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                A new user has no access. After creating, you land on their grant grid — tick modules and save.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={submitCreate} disabled={creating} variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
            {creating ? 'Creating…' : 'Create user'}
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

// ---------------- Users tab ----------------
function UsersTab(props) {
  const { filteredUsers, search, setSearch, selectedUser, selectUser, modules,
    grants, setCell, loadingGrants, saving, violatesSoD, sodLabel, setWarnOpen, doSave,
    currentEmail, onDelete } = props;

  const onSaveClick = () => (violatesSoD ? setWarnOpen(true) : doSave());

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start' }}>
      <Paper variant="outlined" sx={{ width: { xs: '100%', md: 320 }, borderRadius: 3, flexShrink: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5 }}>
          <TextField fullWidth size="small" placeholder="Search users"
            value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) } }} />
        </Box>
        <Divider />
        <List dense sx={{ maxHeight: 560, overflow: 'auto', py: 0 }}>
          {filteredUsers.map((u) => (
            <ListItemButton key={u.id} selected={selectedUser?.id === u.id} onClick={() => selectUser(u)}
              sx={{ gap: 1.25, py: 1, '&.Mui-selected': { bgcolor: '#eef2ff' }, '&.Mui-selected:hover': { bgcolor: '#e0e7ff' } }}>
              <Avatar sx={{ width: 34, height: 34, fontSize: '0.8rem', bgcolor: u.isSuperAdmin ? INDIGO : '#cbd5e1', color: u.isSuperAdmin ? '#fff' : SLATE }}>
                {initials(u.name)}
              </Avatar>
              <ListItemText primary={u.name} secondary={u.email}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.76rem' }} />
              {u.isSuperAdmin
                ? <Chip size="small" label="SUPER" sx={{ height: 20, fontSize: '0.62rem', bgcolor: INDIGO, color: '#fff' }} />
                : (u.grantedModules || []).length === 0
                  ? <Chip size="small" label="No access" sx={{ height: 20, fontSize: '0.62rem', bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 600 }} />
                  : <Chip size="small" label={`${u.grantedModules.length} module${u.grantedModules.length > 1 ? 's' : ''}`} variant="outlined" sx={{ height: 20, fontSize: '0.62rem', color: MUTED }} />}
              {u.email !== currentEmail && (
                <IconButton size="small" aria-label={`Delete ${u.name}`}
                  onClick={(e) => { e.stopPropagation(); onDelete(u); }}
                  sx={{ color: '#cbd5e1', '&:hover': { color: '#b91c1c', bgcolor: '#fef2f2' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </ListItemButton>
          ))}
          {filteredUsers.length === 0 && <Box sx={{ p: 2, color: '#94a3b8', fontSize: '0.85rem' }}>No users match.</Box>}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, borderRadius: 3, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        {!selectedUser ? (
          <Box sx={{ p: 6, textAlign: 'center', color: '#94a3b8' }}>
            <PeopleIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography>Select a user to manage their access.</Typography>
          </Box>
        ) : selectedUser.isSuperAdmin ? (
          <Box sx={{ p: 5, textAlign: 'center', color: '#475569' }}>
            <AdminIcon sx={{ fontSize: 44, color: INDIGO, mb: 1 }} />
            <Typography sx={{ fontWeight: 700 }}>{selectedUser.name} is a SUPER_ADMIN</Typography>
            <Typography variant="body2" sx={{ color: MUTED }}>Full access to every module — cannot be restricted.</Typography>
          </Box>
        ) : loadingGrants ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress size={28} sx={{ color: INDIGO }} /></Box>
        ) : (
          <>
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: SLATE, fontSize: '1.05rem' }}>{selectedUser.name}</Typography>
                <Typography variant="body2" sx={{ color: MUTED }}>{selectedUser.email}</Typography>
              </Box>
              <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={onSaveClick}
                sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </Box>
            {violatesSoD && (
              <Alert severity="warning" icon={<WarningIcon />} sx={{ mx: 2.5, mb: 1.5 }}>
                Edit on <strong>{sodLabel}</strong> lets one person raise and approve payments. You can still save.
              </Alert>
            )}
            <Divider />
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={labelSx}>Module</TableCell>
                  <TableCell align="center" sx={{ ...labelSx, width: 90 }}>View</TableCell>
                  <TableCell align="center" sx={{ ...labelSx, width: 90 }}>Edit</TableCell>
                  <TableCell sx={{ ...labelSx, color: '#94a3b8' }}>Edit includes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map((m) => {
                  const cell = grants[m.key] || emptyCell;
                  const includes = m.viewOnly ? '—'
                    : ['edit', m.canCreate && 'create', m.canDelete && 'delete'].filter(Boolean).join(', ');
                  return (
                    <TableRow key={m.key} hover>
                      <TableCell sx={{ fontWeight: 600, color: SLATE }}>{m.label}</TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" checked={!!cell.can_view}
                          onChange={(e) => setCell(m.key, 'can_view', e.target.checked)} />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox size="small" checked={!!cell.can_edit} disabled={m.viewOnly}
                          onChange={(e) => setCell(m.key, 'can_edit', e.target.checked)} />
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{includes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Box>
  );
}

// ---------------- Requests tab ----------------
function RequestsTab({ requests, moduleLabel, onReview }) {
  if (requests.length === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 6, textAlign: 'center', color: '#94a3b8' }}>
        <InboxIcon sx={{ fontSize: 44, mb: 1, opacity: 0.5 }} />
        <Typography sx={{ fontWeight: 600 }}>No pending requests</Typography>
        <Typography variant="body2">When a user requests access, it shows up here.</Typography>
      </Paper>
    );
  }
  return (
    <Stack spacing={1.5}>
      {requests.map((r) => (
        <Paper key={r.id} variant="outlined" sx={{ borderRadius: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar sx={{ bgcolor: '#cbd5e1', color: SLATE, fontWeight: 700 }}>{initials(r.requesterName)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography sx={{ fontWeight: 700, color: SLATE }}>{r.requesterName}</Typography>
            <Typography variant="body2" sx={{ color: MUTED }}>{r.requesterEmail}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
              {r.modules.map((m) => (
                <Chip key={m} size="small" label={moduleLabel(m)} sx={{ bgcolor: '#eef2ff', color: INDIGO, fontWeight: 600 }} />
              ))}
            </Stack>
          </Box>
          <Button variant="contained" onClick={() => onReview(r)}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
            Review
          </Button>
        </Paper>
      ))}
    </Stack>
  );
}

// ---------------- Audit tab ----------------
function cellLabel(cell) {
  if (!cell) return 'no access';
  return cell.can_edit ? 'View + Edit' : 'View';
}

function AuditTab({ logs, total, loading, moduleLabel, onLoadMore }) {
  if (loading && logs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress size={28} sx={{ color: INDIGO }} />
      </Box>
    );
  }
  if (logs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 6, textAlign: 'center', color: '#94a3b8' }}>
        <HistoryIcon sx={{ fontSize: 44, mb: 1, opacity: 0.5 }} />
        <Typography sx={{ fontWeight: 600 }}>No grant changes yet</Typography>
        <Typography variant="body2">Every permission change lands here — who, whom, and what changed.</Typography>
      </Paper>
    );
  }
  const nextPage = Math.floor(logs.length / 50) + 1;
  return (
    <Stack spacing={1.5}>
      {logs.map((log) => (
        <Paper key={log.id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Avatar sx={{ width: 34, height: 34, fontSize: '0.8rem', bgcolor: '#cbd5e1', color: SLATE }}>
              {initials(log.actorName)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontWeight: 700, color: SLATE, fontSize: '0.92rem' }}>
                {log.actorName} <Box component="span" sx={{ color: MUTED, fontWeight: 400 }}>changed access for</Box> {log.targetName}
              </Typography>
              <Typography variant="body2" sx={{ color: MUTED, fontSize: '0.78rem' }}>
                {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
            </Box>
            <Chip size="small"
              label={log.source === 'REQUEST' ? 'Request approval' : 'Direct'}
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600,
                bgcolor: log.source === 'REQUEST' ? '#fef3c7' : '#eef2ff',
                color: log.source === 'REQUEST' ? '#92400e' : INDIGO }} />
          </Stack>
          <Stack spacing={0.5} sx={{ mt: 1.25, pl: { sm: 6 } }}>
            {Object.entries(log.changes).map(([mod, diff]) => (
              <Typography key={mod} sx={{ fontSize: '0.84rem', color: SLATE }}>
                <Box component="span" sx={{ fontWeight: 600 }}>{moduleLabel(mod)}:</Box>{' '}
                <Box component="span" sx={{ color: diff.before ? MUTED : '#94a3b8' }}>{cellLabel(diff.before)}</Box>
                {' → '}
                <Box component="span" sx={{ color: diff.after ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                  {cellLabel(diff.after)}
                </Box>
              </Typography>
            ))}
          </Stack>
        </Paper>
      ))}
      {logs.length < total && (
        <Button onClick={() => onLoadMore(nextPage)} disabled={loading}
          sx={{ textTransform: 'none', fontWeight: 600, color: INDIGO, alignSelf: 'center' }}>
          {loading ? 'Loading…' : `Load more (${total - logs.length} older)`}
        </Button>
      )}
    </Stack>
  );
}
