import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Checkbox, Button, TextField, Chip, Stack,
  Snackbar, Alert, CircularProgress, Divider, FormControlLabel,
} from '@mui/material';
import { Send as SendIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { permissionsAPI } from '../../services/api';

const INDIGO = '#4F46E5';
const SLATE = '#1e293b';
const MUTED = '#64748b';

const STATUS_STYLE = {
  PENDING: { bg: '#fef9c3', fg: '#854d0e', label: 'Pending' },
  APPROVED: { bg: '#dcfce7', fg: '#166534', label: 'Approved' },
  REJECTED: { bg: '#fee2e2', fg: '#991b1b', label: 'Rejected' },
};

export default function RequestAccessPage() {
  const [modules, setModules] = useState([]);
  const [mine, setMine] = useState({ grants: {}, isSuperAdmin: false });
  const [myRequests, setMyRequests] = useState([]);
  const [picked, setPicked] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const [mods, me, reqs] = await Promise.all([
      permissionsAPI.getModules(),
      permissionsAPI.getMine(),
      permissionsAPI.myRequests(),
    ]);
    setModules(mods.modules || []);
    setMine(me);
    setMyRequests(reqs.requests || []);
  }, []);

  useEffect(() => {
    (async () => {
      try { await load(); }
      catch (e) { setToast({ severity: 'error', msg: e.message || 'Failed to load' }); }
      finally { setLoading(false); }
    })();
  }, [load]);

  const toggle = (key) => setPicked((p) => ({ ...p, [key]: !p[key] }));
  const pickedKeys = Object.keys(picked).filter((k) => picked[k]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await permissionsAPI.createRequest(pickedKeys, note);
      setToast({ severity: 'success', msg: 'Request sent to the administrator' });
      setPicked({}); setNote('');
      const reqs = await permissionsAPI.myRequests();
      setMyRequests(reqs.requests || []);
    } catch (e) {
      setToast({ severity: 'error', msg: e.message || 'Failed to send' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress sx={{ color: INDIGO }} /></Box>;
  }

  if (mine.isSuperAdmin) {
    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: 'auto' }}>
        <Alert severity="info">You are a SUPER_ADMIN — you already have full access and don't need to request anything.</Alert>
      </Box>
    );
  }

  const hasAccess = (key) => {
    const g = mine.grants[key];
    return g ? (g.can_edit ? 'View + Edit' : 'View') : null;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 820, mx: 'auto' }}>
      <Typography sx={{ fontWeight: 800, color: SLATE, fontSize: '1.6rem', letterSpacing: '-0.02em', mb: 0.5 }}>
        Request Access
      </Typography>
      <Typography sx={{ color: MUTED, fontSize: '0.95rem', mb: 3 }}>
        Pick the modules you need. The administrator reviews your request and decides View / Edit.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, color: SLATE, mb: 1.5 }}>Modules</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
          {modules.map((m) => {
            const access = hasAccess(m.key);
            return (
              <FormControlLabel
                key={m.key}
                control={<Checkbox size="small" checked={!!picked[m.key]} disabled={!!access}
                  onChange={() => toggle(m.key)} />}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 600, color: access ? '#94a3b8' : SLATE }}>{m.label}</Typography>
                    {access && <Chip size="small" label={`You have: ${access}`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#dcfce7', color: '#166534' }} />}
                  </Stack>
                }
              />
            );
          })}
        </Box>
        <Divider sx={{ my: 2 }} />
        <TextField fullWidth multiline minRows={2} placeholder="Why do you need this access? (optional)"
          value={note} onChange={(e) => setNote(e.target.value)} sx={{ mb: 2 }} />
        <Button variant="contained" startIcon={<SendIcon />} disabled={submitting || pickedKeys.length === 0}
          onClick={submit} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: INDIGO, '&:hover': { bgcolor: '#4338ca' } }}>
          {submitting ? 'Sending…' : `Send request${pickedKeys.length ? ` (${pickedKeys.length})` : ''}`}
        </Button>
      </Paper>

      <Typography sx={{ fontWeight: 700, color: SLATE, mb: 1.5 }}>Your requests</Typography>
      {myRequests.length === 0 ? (
        <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>No requests yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {myRequests.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
            return (
              <Paper key={r.id} variant="outlined" sx={{ borderRadius: 2.5, p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Stack direction="row" spacing={0.5} sx={{ flex: 1, minWidth: 160, flexWrap: 'wrap', gap: 0.5 }}>
                  {r.modules.map((m) => {
                    const mod = modules.find((mm) => mm.key === m);
                    return <Chip key={m} size="small" label={mod?.label || m} sx={{ bgcolor: '#eef2ff', color: INDIGO, fontWeight: 600 }} />;
                  })}
                </Stack>
                {r.note && <Typography sx={{ flexBasis: '100%', fontSize: '0.82rem', color: MUTED }}>{r.note}</Typography>}
                <Chip size="small" icon={r.status === 'APPROVED' ? <CheckIcon sx={{ fontSize: 14 }} /> : undefined}
                  label={st.label} sx={{ bgcolor: st.bg, color: st.fg, fontWeight: 700 }} />
              </Paper>
            );
          })}
        </Stack>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
