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
  Business as BusinessIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import useGrants from '../../auth/useGrants';

function REPCard({ rep, onEdit, onDelete, onViewDetails }) {
  const { canEdit } = useGrants();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setConfirmText('');
    setDeleteError('');
  };

  const handleConfirmDelete = () => {
    if (confirmText.trim() !== 'DELETE') {
      setDeleteError('Please type "DELETE" exactly to confirm');
      return;
    }
    setDeleteDialogOpen(false);
    onDelete(rep);
  };

  const assignments = rep.cityAssignments || [];
  const uniqueCities = [...new Set(assignments.map(a => a.city).filter(Boolean))];
  const totalAssignments = assignments.length;

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
          {/* Header - REP Name */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              {rep.repName}
            </Typography>
          </Box>

          {/* Contact */}
          {rep.contactName && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <BusinessIcon fontSize="small" sx={{ color: '#10b981', flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                {rep.contactName}
              </Typography>
            </Stack>
          )}

          {/* Assigned Projects */}
          <Box
            sx={{
              mt: 'auto',
              p: 2,
              bgcolor: '#f8fafc',
              borderRadius: 2,
            }}
          >
            {totalAssignments > 0 ? (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Assigned Trials ({totalAssignments})
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {assignments.slice(0, 4).map(a => (
                    <Chip
                      key={a.id}
                      label={[a.trialSeason, a.trialType, a.city].filter(Boolean).join(' | ')}
                      size="small"
                      sx={{ fontSize: '0.72rem', fontWeight: 600, bgcolor: '#dbeafe', color: '#1d4ed8', height: 22 }}
                    />
                  ))}
                  {assignments.length > 4 && (
                    <Chip
                      label={`+${assignments.length - 4} more`}
                      size="small"
                      sx={{ fontSize: '0.72rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b', height: 22 }}
                    />
                  )}
                </Stack>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No assignments
              </Typography>
            )}
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
            {canEdit('reps') && (
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
            )}
            {canEdit('reps') && (
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
            )}
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
          <IconButton onClick={() => setDeleteDialogOpen(false)} size="small" aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action cannot be undone. All city assignments will be removed.
          </Alert>

          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>REP Name:</strong> {rep.repName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>Cities:</strong> {uniqueCities.join(', ') || 'None'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Assignments:</strong> {totalAssignments}
            </Typography>
          </Box>

          <Typography variant="body2" fontWeight={600} gutterBottom>
            Type DELETE to confirm:
          </Typography>

          <TextField
            fullWidth
            autoFocus
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setDeleteError('');
            }}
            error={!!deleteError}
            helperText={deleteError || 'Type the word DELETE in uppercase'}
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
            disabled={confirmText.trim() !== 'DELETE'}
          >
            Delete REP
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default REPCard;