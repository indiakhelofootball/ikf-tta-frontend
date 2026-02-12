// src/components/trials/TrialCard.jsx

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Box,
  Button,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CalendarMonth as CalendarIcon,
  EmojiEvents as TrophyIcon,
  LocationCity as CityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { STATUS_COLORS } from './trialConstants';

function TrialCard({ trial, onEdit, onDelete, onViewDetails }) {
  const [expanded, setExpanded] = useState(false);
  const cities = trial.assignedCities || [];
  const cityCount = cities.length;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getDateDisplay = () => {
    if (trial.scheduleType === 'Fixed' && trial.startDate) {
      return `${formatDate(trial.startDate)} - ${formatDate(trial.endDate)}`;
    }
    if (trial.scheduleType === 'Tentative') {
      return trial.tentativeDateRange || `Tentative: ${trial.tentativeMonth || 'TBD'}`;
    }
    return 'No dates set';
  };

  const tierDisplay = trial.tierType === 'Not Any' ? 'No Tier' : trial.tierType;

  return (
    <Card
      sx={{
        minHeight: 340,
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          borderColor: '#cbd5e1',
        },
      }}
    >
      <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#1e293b', lineHeight: 1.3 }}>
            {trial.trialName}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={trial.trialCode}
              size="small"
              sx={{
                fontFamily: 'monospace', bgcolor: '#f1f5f9',
                fontSize: '0.7rem', fontWeight: 600, color: '#475569',
                borderRadius: 1,
              }}
            />
            <Chip
              label={trial.status}
              size="small"
              color={STATUS_COLORS[trial.status] || 'default'}
              sx={{ borderRadius: 1 }}
            />
          </Stack>
        </Box>

        {/* Info rows */}
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TrophyIcon fontSize="small" sx={{ color: '#6366f1', opacity: 0.7 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {trial.season} &middot; {trial.trialType}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <CalendarIcon fontSize="small" sx={{ color: '#f59e0b', opacity: 0.7 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {getDateDisplay()}
            </Typography>
          </Stack>

          <Stack
            direction="row" spacing={1.5} alignItems="center"
            onClick={() => cityCount > 0 && setExpanded(!expanded)}
            sx={{
              cursor: cityCount > 0 ? 'pointer' : 'default',
              borderRadius: 1, px: 0.5, mx: -0.5,
              '&:hover': cityCount > 0 ? { bgcolor: '#f8fafc' } : {},
            }}
          >
            <CityIcon fontSize="small" sx={{ color: '#10b981', opacity: 0.7 }} />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.8rem' }}>
              {cityCount} {cityCount === 1 ? 'City' : 'Cities'} Assigned
            </Typography>
            {cityCount > 0 && (
              expanded ? <ExpandLessIcon fontSize="small" sx={{ color: '#94a3b8' }} /> :
              <ExpandMoreIcon fontSize="small" sx={{ color: '#94a3b8' }} />
            )}
          </Stack>

          <Collapse in={expanded}>
            <Box sx={{ pl: 4, pt: 0.5 }}>
              <Stack spacing={0.5}>
                {cities.map((city, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#cbd5e1' }} />
                    <Typography variant="caption" color="text.secondary">
                      {typeof city === 'string' ? city : `${city.cityName}${city.trialRegion && city.trialRegion !== city.cityName ? ` - ${city.trialRegion}` : ''}`}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </Stack>

        {/* Tier summary */}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
          <Stack direction="row" spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tier</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>{tierDisplay}</Typography>
            </Box>
            {trial.scheduleType === 'Tentative' && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</Typography>
                <Chip label="Tentative" size="small" color="warning" sx={{ display: 'block', mt: 0.25, height: 20 }} />
              </Box>
            )}
            {trial.tierType !== 'Not Any' && trial.tierAmount && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                  &#8377;{trial.tierAmount?.toLocaleString('en-IN')}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </CardContent>

      {/* Actions */}
      <Box sx={{ p: 3, pt: 0 }}>
        <Divider sx={{ mb: 2, borderColor: '#f1f5f9' }} />
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined" size="small"
            startIcon={<ViewIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => onViewDetails(trial)}
            sx={{
              flex: 1, borderColor: '#e2e8f0', color: '#475569',
              fontWeight: 600, borderRadius: 1.5, textTransform: 'none',
              '&:hover': { borderColor: '#5B63D3', bgcolor: '#f8fafc', color: '#5B63D3' },
            }}
          >
            View
          </Button>
          <Button
            variant="contained" size="small"
            startIcon={<EditIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => onEdit(trial)}
            sx={{
              flex: 1, bgcolor: '#5B63D3', color: 'white',
              fontWeight: 600, borderRadius: 1.5, textTransform: 'none',
              '&:hover': { bgcolor: '#4A52C2' },
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined" size="small" color="error"
            onClick={() => onDelete(trial)}
            sx={{
              minWidth: 'auto', px: 1.5, borderRadius: 1.5,
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
