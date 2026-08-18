import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography,
} from '@mui/material';

// A styled stand-in for window.confirm().
//
// The native dialog cannot be styled or branded, blocks the main thread while it
// is open, and renders the raw hostname above whatever you asked — so a delete
// prompt inside the app announces "tta.indiakhelofootball.com says". Every other
// dialog in this app is a MUI Dialog; these were the exception.
//
// DESIGN.md prefers Undo over a prompt for destructive actions, and that remains
// the better answer. It needs soft-delete and a restore endpoint per resource,
// which is a much larger change than swapping the dialog, so this keeps the
// confirm-then-delete flow and only replaces the box it is asked in.
//
// `busy` keeps the dialog open and the buttons disabled while the caller's async
// delete runs, so a second click cannot fire the same delete twice — something
// window.confirm() had no way to express.
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {typeof message === 'string'
          ? <Typography variant="body2">{message}</Typography>
          : message}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          disabled={busy}
          // The confirming action is the one the user came for, so it takes
          // focus — matching the native dialog, where Enter accepted.
          autoFocus
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
