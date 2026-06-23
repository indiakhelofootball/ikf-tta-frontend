// src/components/rep/REPDetailView.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import useGrants from '../../auth/useGrants';

// ── shared styles (mirrors REPModal) ─────────────────────────────────────────

const sectionHeaderSx = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#3B82F6',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  mb: 1.5,
};

const subLabelSx = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  mb: 1,
  display: 'block',
};

const labelSx = {
  fontSize: '0.72rem',
  color: '#94a3b8',
  fontWeight: 500,
  mb: 0.25,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const valueSx = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#1e293b',
};

const cardSx = {
  bgcolor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  p: { xs: 2, sm: 2.5 },
  mb: 2,
};

const grid2 = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
};

const grid3 = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
  gap: 2,
};

// ── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, value, mono = false, full = false, children }) {
  if (!value && !children) return null;
  return (
    <Box sx={full ? { gridColumn: '1 / -1' } : {}}>
      <Typography sx={labelSx}>{label}</Typography>
      {children || (
        <Typography sx={{ ...valueSx, ...(mono ? { fontFamily: 'monospace', letterSpacing: '0.05em' } : {}) }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

function REPDetailView({ rep, open, onClose, onEdit }) {
  const { canEdit } = useGrants();
  if (!rep) return null;

  const assignments = rep.cityAssignments || [];
  const totalAssignments = assignments.length;

  const onlineFields = [
    { key: 'website',  naKey: 'websiteNA',  label: 'Website' },
    { key: 'facebook', naKey: 'facebookNA', label: 'Facebook' },
    { key: 'instagram', naKey: 'instagramNA', label: 'Instagram' },
    { key: 'telegram', naKey: 'telegramNA', label: 'Telegram' },
  ].filter(f => rep[f.key] || rep[f.naKey]);

  const hasBackup = rep.backupContactName || rep.backupPhone || rep.backupEmail;
  const hasDocs = rep.mouDocumentUrl || rep.repLogoUrl;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh', bgcolor: '#f8fafc' } }}
    >
      {/* ── TITLE ── */}
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        bgcolor: 'white', borderBottom: '1px solid #e5e7eb', pb: 2,
      }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#1e293b">
            {rep.repName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {totalAssignments > 0 && (
              <Chip
                label={`${totalAssignments} assignment${totalAssignments !== 1 ? 's' : ''}`}
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 600, height: 20, bgcolor: '#dbeafe', color: '#1d4ed8' }}
              />
            )}
            {rep.numberOfCities > 0 && (
              <Chip
                label={`${rep.numberOfCities} ${rep.numberOfCities !== 1 ? 'cities' : 'city'}`}
                size="small"
                sx={{ fontSize: '0.7rem', fontWeight: 600, height: 20, bgcolor: '#dcfce7', color: '#16a34a' }}
              />
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {canEdit('reps') && (
            <IconButton onClick={() => { onClose(); onEdit(rep); }} size="small"
              sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#FBB040', color: 'white' } }}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton onClick={onClose} size="small" sx={{ bgcolor: '#f1f5f9' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>

        {/* ── BASIC INFORMATION ── */}
        <Box sx={cardSx}>
          <Typography sx={sectionHeaderSx}>Basic Information</Typography>
          <Box sx={grid2}>
            <Field label="REP Name" value={rep.repName} />
          </Box>
        </Box>

        {/* ── CITY ASSIGNMENTS ── */}
        <Box sx={cardSx}>
          <Typography sx={sectionHeaderSx}>
            Assigned Trials {totalAssignments > 0 && `(${totalAssignments})`}
          </Typography>
          {assignments.length > 0 ? (
            <Stack spacing={2}>
              {assignments.map((a) => (
                <Box key={a.id} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                      {[a.trialSeason, a.trialType, a.city].filter(Boolean).join(' | ')}
                    </Typography>
                    {a.trialType && (
                      <Chip label={a.trialType} size="small" sx={{ fontSize: '0.7rem', fontWeight: 500, bgcolor: '#dbeafe', color: '#1d4ed8' }} />
                    )}
                  </Stack>
                  <Box sx={grid2}>
                    <Field label="Trial Date" value={a.trialDate} />
                    <Field label="City" value={a.city} />
                    <Field label="State" value={a.state} />
                    {a.region && <Field label="Region" value={a.region} />}
                  </Box>
                  {(a.googleMapLink || a.pinCode || a.groundContactName || a.physicalAddress) && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={subLabelSx}>Ground Location</Typography>
                      <Box sx={grid2}>
                        {a.googleMapLink && (
                          <Box>
                            <Typography sx={labelSx}>Google Maps Link</Typography>
                            <Box component="a" href={a.googleMapLink} target="_blank" rel="noopener noreferrer"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem', color: '#3B82F6', fontWeight: 500, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                              Open in Maps <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Box>
                          </Box>
                        )}
                        <Field label="Pin Code" value={a.pinCode} />
                        <Field label="Reporting Time" value={a.reportingTime} />
                        <Field label="Ground Contact" value={a.groundContactName} />
                        <Field label="Ground Phone" value={a.groundContactPhone} />
                        {a.physicalAddress && <Field label="Address" value={a.physicalAddress} full />}
                      </Box>
                    </Box>
                  )}
                  {(a.courierPinCode || a.courierAddress || a.courierAcceptingName) && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={subLabelSx}>Courier Address</Typography>
                      <Box sx={grid2}>
                        <Field label="PIN Code" value={a.courierPinCode} />
                        <Field label="Accepting Person" value={a.courierAcceptingName} />
                        <Field label="Accepting Phone" value={a.courierAcceptingPhone} />
                        {a.courierAddress && <Field label="Address" value={a.courierAddress} full />}
                        {a.courierAdditionalInfo && <Field label="Additional Info" value={a.courierAdditionalInfo} full />}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f9fafb', borderRadius: 2, border: '1px dashed #e5e7eb' }}>
              <Typography variant="body2" color="text.secondary">No city assignments yet</Typography>
            </Box>
          )}
        </Box>

        {/* ── CONTACTS ── */}
        <Box sx={cardSx}>
          <Typography sx={sectionHeaderSx}>Contacts</Typography>

          <Typography sx={subLabelSx}>Primary</Typography>
          <Box sx={{ ...grid3, mb: hasBackup ? 2.5 : 0 }}>
            <Field label="Contact Name" value={rep.contactName} />
            <Field label="Phone" value={rep.phone} />
            <Field label="Email" value={rep.email} />
          </Box>

          {hasBackup && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography sx={subLabelSx}>Backup</Typography>
              <Box sx={grid3}>
                <Field label="Contact Name" value={rep.backupContactName} />
                <Field label="Phone" value={rep.backupPhone} />
                <Field label="Email" value={rep.backupEmail} />
              </Box>
            </>
          )}
        </Box>

        {/* ── DOCUMENTS & BRANDING ── */}
        {hasDocs && (
          <Box sx={cardSx}>
            <Typography sx={sectionHeaderSx}>Documents & Branding</Typography>
            <Box sx={grid2}>
              {rep.mouDocumentUrl && (
                <Box>
                  <Typography sx={labelSx}>Signed MoU / Agreement</Typography>
                  {/^https?:\/\//.test(rep.mouDocumentUrl) ? (
                    <Box
                      component="a"
                      href={rep.mouDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        fontSize: '0.85rem', color: '#3B82F6', fontWeight: 500,
                        textDecoration: 'none', '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      <FileIcon fontSize="small" /> View Document
                    </Box>
                  ) : (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                      <FileIcon fontSize="small" /> {rep.mouDocumentUrl}
                    </Box>
                  )}
                </Box>
              )}
              {rep.repLogoUrl && (
                <Box>
                  <Typography sx={labelSx}>REP Logo</Typography>
                  <Box
                    component="img"
                    src={rep.repLogoUrl}
                    alt="REP Logo"
                    sx={{
                      height: 60, objectFit: 'contain',
                      border: '1px solid #e5e7eb', borderRadius: 1,
                      p: 1, bgcolor: '#f9fafb', display: 'block',
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* ── LEGAL INFORMATION ── */}
        <Box sx={cardSx}>
          <Typography sx={sectionHeaderSx}>Legal Information</Typography>
          <Box sx={grid3}>
            <Field label="MoU Status">
              {rep.mouStatus ? (
                <Chip
                  label={rep.mouStatus}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    bgcolor: rep.mouStatus === 'Signed' ? '#dcfce7'
                      : rep.mouStatus === 'Pending' ? '#fef9c3' : '#f1f5f9',
                    color: rep.mouStatus === 'Signed' ? '#16a34a'
                      : rep.mouStatus === 'Pending' ? '#854d0e' : '#475569',
                  }}
                />
              ) : null}
            </Field>
          </Box>
        </Box>

        {/* ── ONLINE PRESENCE ── */}
        {onlineFields.length > 0 && (
          <Box sx={cardSx}>
            <Typography sx={sectionHeaderSx}>Online Presence</Typography>
            <Box sx={grid2}>
              {onlineFields.map(({ key, naKey, label }) => (
                <Box key={key}>
                  <Typography sx={labelSx}>{label}</Typography>
                  {rep[naKey] ? (
                    <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Not Available
                    </Typography>
                  ) : (
                    <Box
                      component="a"
                      href={rep[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        fontSize: '0.85rem', color: '#3B82F6', fontWeight: 500,
                        textDecoration: 'none', wordBreak: 'break-all',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {rep[key]} <OpenInNewIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}


      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: 'white' }}>
        <Button onClick={onClose} sx={{ color: '#64748b' }}>Close</Button>
        {canEdit('reps') && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => { onClose(); onEdit(rep); }}
            sx={{ bgcolor: '#FBB040', '&:hover': { bgcolor: '#E89F2C' }, fontWeight: 600 }}
          >
            Edit REP
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default REPDetailView;
