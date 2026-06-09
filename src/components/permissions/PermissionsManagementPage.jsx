import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, List, ListItemButton, ListItemText, Chip, Avatar,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Button,
  Snackbar, Alert, CircularProgress, Divider, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Tabs, Tab, Badge, Stack,
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
} from '@mui/icons-material';
import { permissionsAPI } from '../../services/api';

const INDIGO = '#4F46E5';
const SLATE = '#1e293b';
const MUTED = '#64748b';
const emptyCell = { can_view: false, can_edit: false };

const labelSx = { fontWeight: 700, color: SLATE, fontSize: '0.82rem' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function PermissionsManagementPage() {
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
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <AdminIcon sx={{ color: INDIGO, fontSize: 30 }} />
        <Typography sx={{ fontWeight: 800, color: SLATE, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
          Access Control
        </Typography>
      </Stack>
      <Typography sx={{ color: MUTED, fontSize: '0.95rem', mb: 3 }}>
        Grant module access per person, or review access requests. SUPER_ADMIN always has full access.
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
      </Tabs>

      {tab === 0 ? (
        <UsersTab
          {...{ filteredUsers, search, setSearch, selectedUser, selectUser, modules,
            grants, setCell, loadingGrants, saving, violatesSoD, sodLabel, warnOpen, setWarnOpen, doSave }}
        />
      ) : (
        <RequestsTab requests={requests} moduleLabel={moduleLabel} onReview={openReview} />
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
    grants, setCell, loadingGrants, saving, violatesSoD, sodLabel, setWarnOpen, doSave } = props;

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
                : <Chip size="small" label={u.role} variant="outlined" sx={{ height: 20, fontSize: '0.62rem' }} />}
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
