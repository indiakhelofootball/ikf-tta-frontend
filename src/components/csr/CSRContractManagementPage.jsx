import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Stack, Snackbar, Alert, CircularProgress,
  TextField, InputAdornment, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import ConfirmDialog from '../common/ConfirmDialog';
import CSRContractCard from './CSRContractCard';
import CSRContractModal from './CSRContractModal';
import CSRDeliverableModal from './CSRDeliverableModal';
import {
  CONTRACT_PROGRESS_FILTERS, filterContracts, contractLabel, fieldErrorsFrom,
} from './csrContractRules';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';

const CONTRACT_FIELDS = [
  'reference', 'title', 'amount', 'contractFileName', 'contractDriveLink',
  'startDate', 'endDate', 'notes',
];
const DELIVERABLE_FIELDS = [
  'title', 'description', 'targetCount', 'completedCount', 'dueDate', 'status', 'workOrderId',
];

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

export default function CSRContractManagementPage({ projectId }) {
  const { canEdit } = useGrants();
  const editable = canEdit('csr');

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState('All');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [contractModal, setContractModal] = useState({ open: false, editing: null });
  const [deliverableModal, setDeliverableModal] = useState({
    open: false, editing: null, contract: null,
  });
  const [serverErrors, setServerErrors] = useState({});
  // One shared slot for whichever delete is being confirmed:
  // { title, message, confirmLabel, onConfirm }.
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await csrAPI.workOrders.getAll(projectId ? { project: projectId } : {});
      setContracts(asList(data));
    } catch (e) {
      notify(e.message || 'Failed to load grant contracts.', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openCreateContract = () => {
    setServerErrors({});
    setContractModal({ open: true, editing: null });
  };
  const openEditContract = (contract) => {
    setServerErrors({});
    setContractModal({ open: true, editing: contract });
  };
  const closeContractModal = () => {
    setServerErrors({});
    setContractModal({ open: false, editing: null });
  };

  const saveContract = async (payload) => {
    setSaving(true);
    setServerErrors({});
    try {
      const body = { ...payload, projectId: Number(projectId) };
      if (contractModal.editing) {
        await csrAPI.workOrders.update(contractModal.editing.id, body);
        notify('Grant contract updated.');
      } else {
        await csrAPI.workOrders.create(body);
        notify('Grant contract added.');
      }
      setContractModal({ open: false, editing: null });
      load();
    } catch (e) {
      // The document link is checked against a scheme allowlist server-side. A
      // rejection comes back as a 400 naming the field, so mark the field and
      // leave the form open rather than closing over the operator's typing.
      const fields = fieldErrorsFrom(e, CONTRACT_FIELDS);
      if (Object.keys(fields).length) setServerErrors(fields);
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = (contract) => {
    setConfirmState({
      title: 'Delete grant contract',
      message: `Delete grant contract "${contractLabel(contract)}"? Its deliverables go with it.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setSaving(true);
        try {
          await csrAPI.workOrders.delete(contract.id);
          notify('Grant contract deleted.');
          load();
        } catch (e) {
          notify(e.message || 'Delete failed.', 'error');
        } finally {
          setSaving(false);
          setConfirmState(null);
        }
      },
    });
  };

  const openCreateDeliverable = (contract) => {
    setServerErrors({});
    setDeliverableModal({ open: true, editing: null, contract });
  };
  const openEditDeliverable = (contract, deliverable) => {
    setServerErrors({});
    setDeliverableModal({ open: true, editing: deliverable, contract });
  };
  const closeDeliverableModal = () => {
    setServerErrors({});
    setDeliverableModal({ open: false, editing: null, contract: null });
  };

  // Deliverables are nested read-only on the contract serializer, so a write has
  // to go through the deliverables endpoint and the contract list is refetched
  // afterwards to pick the change up.
  const saveDeliverable = async (payload) => {
    setSaving(true);
    setServerErrors({});
    try {
      const body = { ...payload, workOrderId: deliverableModal.contract.id };
      if (deliverableModal.editing) {
        await csrAPI.deliverables.update(deliverableModal.editing.id, body);
        notify('Deliverable updated.');
      } else {
        await csrAPI.deliverables.create(body);
        notify('Deliverable added.');
      }
      setDeliverableModal({ open: false, editing: null, contract: null });
      load();
    } catch (e) {
      const fields = fieldErrorsFrom(e, DELIVERABLE_FIELDS);
      if (Object.keys(fields).length) setServerErrors(fields);
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteDeliverable = (deliverable) => {
    setConfirmState({
      title: 'Delete deliverable',
      message: `Delete deliverable "${deliverable.title}"?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setSaving(true);
        try {
          await csrAPI.deliverables.delete(deliverable.id);
          notify('Deliverable deleted.');
          load();
        } catch (e) {
          notify(e.message || 'Delete failed.', 'error');
        } finally {
          setSaving(false);
          setConfirmState(null);
        }
      },
    });
  };

  const filtered = filterContracts(contracts, { search, progress });

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1">Grant Contracts</Typography>
        {editable && (
          <Button size="small" startIcon={<AddIcon />} onClick={openCreateContract}>
            Record Contract
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by reference, title or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            },
          }}
        />
        <TextField
          label="Deliverables"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          select
          size="small"
          sx={{ minWidth: { sm: 200 } }}
          fullWidth
        >
          {CONTRACT_PROGRESS_FILTERS.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {contracts.length === 0
            ? 'No grant contracts recorded for this project.'
            : 'No contracts match the current filters.'}
        </Typography>
      ) : (
        filtered.map((c) => (
          <CSRContractCard
            key={c.id}
            contract={c}
            canEdit={editable}
            onEdit={openEditContract}
            onDelete={deleteContract}
            onAddDeliverable={openCreateDeliverable}
            onEditDeliverable={openEditDeliverable}
            onDeleteDeliverable={deleteDeliverable}
          />
        ))
      )}

      <CSRContractModal
        open={contractModal.open}
        contract={contractModal.editing}
        onClose={closeContractModal}
        onSave={saveContract}
        saving={saving}
        serverErrors={serverErrors}
      />
      <CSRDeliverableModal
        open={deliverableModal.open}
        deliverable={deliverableModal.editing}
        contractLabel={deliverableModal.contract ? contractLabel(deliverableModal.contract) : ''}
        onClose={closeDeliverableModal}
        onSave={saveDeliverable}
        saving={saving}
        serverErrors={serverErrors}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={saving}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
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
    </Box>
  );
}
