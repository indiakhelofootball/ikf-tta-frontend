import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationCity as LocationCityIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

function REPCard({ rep, onEdit, onDelete, onViewDetails }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setConfirmText('');
    setDeleteError('');
  };

  const handleConfirmDelete = () => {
    if (confirmText.trim() !== rep.repName) {
      setDeleteError(`Please type "${rep.repName}" exactly`);
      return;
    }
    setDeleteDialogOpen(false);
    onDelete(rep);
  };

  const totalTrials = rep.assignedTrials?.length || 0;
  const activeTrials = rep.assignedTrials?.filter(t => t.status === 'Active').length || 0;
  const thisWeekTrials = rep.assignedTrials?.filter(t => t.period === 'This Week').length || 0;

  return (
    <>
      <Card
        sx={{
          minHeight: 320,
          maxHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflow: 'hidden',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
          }
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          {/* Header - REP Name & Status */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                {rep.repName}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={rep.status || 'Active'}
                  size="small"
                  color={rep.status === 'Active' ? 'success' : 'default'}
                  sx={{ fontSize: '0.75rem' }}
                />
                {thisWeekTrials > 0 && (
                  <Chip
                    label={`${thisWeekTrials} This Week`}
                    size="small"
                    color="warning"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Location Info */}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LocationCityIcon fontSize="small" sx={{ color: '#6366f1', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                {rep.city}, {rep.state}
              </Typography>
            </Stack>

            {rep.contactName && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <BusinessIcon fontSize="small" sx={{ color: '#10b981', flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  {rep.contactName}
                </Typography>
              </Stack>
            )}

            {rep.phone && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PhoneIcon fontSize="small" sx={{ color: '#f59e0b', flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  {rep.phone}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Trial Stats */}
          <Box 
            sx={{ 
              mt: 'auto',
              p: 2, 
              bgcolor: '#f8fafc', 
              borderRadius: 2,
            }}
          >
            <Stack direction="row" spacing={3} justifyContent="space-between">
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {totalTrials}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Trials
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {activeTrials}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>

        {/* Actions */}
        <Box sx={{ p: 3, pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => onViewDetails(rep)}
              sx={{ flex: 1, fontWeight: 600 }}
            >
              View
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEdit(rep)}
              sx={{ 
                flex: 1,
                bgcolor: '#FBB040',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#E89F2C'
                }
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={handleDeleteClick}
              sx={{
                minWidth: 'auto',
                px: 2,
                fontWeight: 600,
              }}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Delete REP?</Typography>
          <IconButton onClick={() => setDeleteDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action cannot be undone. All trial assignments will be removed.
          </Alert>

          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>REP Name:</strong> {rep.repName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>City:</strong> {rep.city}, {rep.state}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Assigned Trials:</strong> {totalTrials}
            </Typography>
          </Box>

          <Typography variant="body2" fontWeight={600} gutterBottom>
            Type the REP name to confirm:
          </Typography>

          <TextField
            fullWidth
            autoFocus
            placeholder={rep.repName}
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setDeleteError('');
            }}
            error={!!deleteError}
            helperText={deleteError || `Type: ${rep.repName}`}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default REPCard;