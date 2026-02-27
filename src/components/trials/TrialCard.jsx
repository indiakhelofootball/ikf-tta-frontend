// src/components/trials/TrialCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, Stack, Box, Button, Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

const captionSx = {
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#86868b',
  display: 'block',
  mb: 0.3,
  fontWeight: 600,
};

function TrialCard({ trial, onEdit, onDelete }) {
  const navigate = useNavigate();
  const cities = trial.assignedCities || [];
  const cityCount = cities.length;
  const hasTier = trial.tierType && trial.tierType !== 'Not Any';

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>

        {/* Project identity */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{
            fontSize: '1.2rem', fontWeight: 700,
            fontFamily: '"SF Mono", "Fira Code", monospace',
            color: '#1d1d1f', letterSpacing: '0.01em', mb: 0.5,
          }}>
            {trial.trialCode || trial.trialName}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6e6e73', fontWeight: 500 }}>
            {trial.season}
            {trial.trialType ? ` · ${trial.trialType}` : ''}
          </Typography>
        </Box>

        {/* Stats row */}
        <Box sx={{
          p: 2, bgcolor: '#f5f5f7', borderRadius: 2.5, mb: 'auto',
          display: 'flex', gap: 0,
        }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography sx={captionSx}>Regions</Typography>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>
              {cityCount}
            </Typography>
          </Box>

          {hasTier && (
            <>
              <Box sx={{ width: '1px', bgcolor: 'rgba(0,0,0,0.08)', my: 0.25 }} />
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography sx={captionSx}>Tier</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>
                  {trial.tierType}
                </Typography>
              </Box>
            </>
          )}

          {hasTier && trial.tierAmount && (
            <>
              <Box sx={{ width: '1px', bgcolor: 'rgba(0,0,0,0.08)', my: 0.25 }} />
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography sx={captionSx}>Amount</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>
                  ₹{Number(trial.tierAmount).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Notes preview */}
        {trial.comment && (
          <Typography sx={{
            fontSize: '0.78rem', color: '#86868b', mt: 2, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {trial.comment}
          </Typography>
        )}
      </CardContent>

      {/* Actions */}
      <Box sx={{ p: 3, pt: 0 }}>
        <Divider sx={{ mb: 2, borderColor: 'rgba(0,0,0,0.06)' }} />
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined" size="small"
            endIcon={<ArrowIcon sx={{ fontSize: '0.95rem' }} />}
            onClick={() => navigate(`/trials/${trial.id}`)}
            sx={{
              flex: 1, borderColor: 'rgba(0,0,0,0.12)', color: '#1d1d1f',
              fontWeight: 600, borderRadius: 2, textTransform: 'none', fontSize: '0.85rem',
              '&:hover': { borderColor: '#5B63D3', bgcolor: '#f5f5f7', color: '#5B63D3' },
            }}
          >
            Open
          </Button>
          <Button
            variant="contained" size="small"
            startIcon={<EditIcon sx={{ fontSize: '0.95rem' }} />}
            onClick={() => onEdit(trial)}
            sx={{
              flex: 1, bgcolor: '#FDE68A', color: '#111827',
              fontWeight: 600, borderRadius: 2, textTransform: 'none', fontSize: '0.85rem',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined" size="small" color="error"
            onClick={() => onDelete(trial)}
            sx={{
              minWidth: 'auto', px: 1.5, borderRadius: 2,
              borderColor: '#fecaca',
              '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' },
            }}
          >
            <DeleteIcon sx={{ fontSize: '1rem' }} />
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}

export default TrialCard;
