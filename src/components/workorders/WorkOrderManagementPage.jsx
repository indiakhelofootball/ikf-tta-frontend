// src/components/workorders/WorkOrderManagementPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert, Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as WOIcon,
} from '@mui/icons-material';

import WorkOrderCard from './WorkOrderCard';
import WorkOrderModal from './WorkOrderModal';
import WorkOrderDetailView from './WorkOrderDetailView';
import { loadWorkOrders, saveWorkOrders } from './workOrderData';
import { vendorsAPI } from '../../services/api';

// Fallback vendors for local testing when backend is not running
const FALLBACK_VENDORS = [
  {
    id: 'local-1', vendorName: 'insaan', vendorType: 'Photography', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: 'N/A', panNumber: 'CVKPA1025N', contactPerson: 'Abhishek Anshuman',
    phone: '9097880029', email: 'abhi.ansh.one21@gmail.com', bankName: 'Punjab National Bank',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
  {
    id: 'local-2', vendorName: 'rda', vendorType: 'photographer', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: 'N/A', panNumber: 'CVKPA1025N', contactPerson: 'Abhishek Anshuman',
    phone: '9611601858', email: 'abhiansh2194@gmail.com', bankName: 'Punjab National Bank',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
  {
    id: 'local-3', vendorName: 'ClickMaster Studios Pvt Ltd', vendorType: 'Photography', companyType: 'DOCUMENT VERIFICATION',
    gstNumber: '27XYZCS5678T1ZM', panNumber: 'XYZCS5678T', contactPerson: 'Priya Mehta',
    phone: '9845612300', email: 'priya@clickmaster.in', bankName: '',
    tdsType: 'None', status: 'Pending', accountNumber: '', ifscCode: '', accountType: '',
  },
];

function WorkOrderManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState(() => loadWorkOrders());
  const [vendors, setVendors] = useState([]);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWO, setEditingWO] = useState(null);
  const [detailWO, setDetailWO] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preSelectedVendor, setPreSelectedVendor] = useState(null);

  const fetchVendors = () => {
    vendorsAPI.getAll({ limit: 1000 })
      .then((res) => {
        const list = res.vendors || [];
        setVendors(list.length ? list : FALLBACK_VENDORS);
      })
      .catch(() => setVendors(FALLBACK_VENDORS));
  };

  useEffect(() => { fetchVendors(); }, []);

  // Auto-open modal when navigated from Vendor page with a vendor
  useEffect(() => {
    if (location.state?.vendor) {
      setPreSelectedVendor(location.state.vendor);
      setEditingWO(null);
      setModalOpen(true);
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const handleSave = (data) => {
    setSaving(true);
    setTimeout(() => {
      let updated;
      if (editingWO) {
        updated = workOrders.map((w) => (w.id === editingWO.id ? { ...w, ...data } : w));
        showToast('Work order updated');
      } else {
        const newWO = {
          ...data,
          id: `wo${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        updated = [newWO, ...workOrders];
        showToast('Work order created');
      }
      setWorkOrders(updated);
      saveWorkOrders(updated);
      setSaving(false);
      setModalOpen(false);
      setEditingWO(null);
    }, 600);
  };

  const handleEdit = (wo) => {
    setEditingWO(wo);
    setModalOpen(true);
    fetchVendors();
  };

  const handleDelete = (wo) => {
    if (!window.confirm(`Delete work order ${wo.workOrderNumber}?`)) return;
    const updated = workOrders.filter((w) => w.id !== wo.id);
    setWorkOrders(updated);
    saveWorkOrders(updated);
    showToast('Work order deleted');
  };


  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
              Work Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage work orders for vendors.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingWO(null); setModalOpen(true); fetchVendors(); }}
            sx={{
              mt: { xs: 2, sm: 0 },
              bgcolor: '#FDE68A',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 1.5,
              px: 3,
              color: '#1e293b',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            }}
          >
            New Work Order
          </Button>
        </Stack>

        {/* Content */}
        {workOrders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <WOIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              No work orders yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a work order to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setModalOpen(true)}
              sx={{
                bgcolor: '#FDE68A', textTransform: 'none', fontWeight: 600,
                borderRadius: 1.5, color: '#1e293b', boxShadow: 'none',
                '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
              }}
            >
              New Work Order
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {workOrders.map((wo) => (
              <Grid item xs={12} sm={6} md={4} key={wo.id}>
                <WorkOrderCard
                  workOrder={wo}
                  onView={(w) => setDetailWO(w)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Modals */}
      <WorkOrderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingWO(null); setPreSelectedVendor(null); }}
        onSave={handleSave}
        workOrder={editingWO}
        saving={saving}
        allVendors={vendors}
        allWorkOrders={workOrders}
        preSelectedVendor={preSelectedVendor}
      />

      <WorkOrderDetailView
        open={!!detailWO}
        onClose={() => setDetailWO(null)}
        workOrder={detailWO}
        onEdit={handleEdit}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default WorkOrderManagementPage;
