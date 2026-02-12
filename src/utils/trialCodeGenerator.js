// src/utils/trialCodeGenerator.js

import { TRIAL_TYPE_CODES } from '../components/trials/trialConstants';

/**
 * Extract season number from season string
 * e.g., "Season 6" -> "S6", "Custom" -> "CUS"
 */
const getSeasonCode = (season) => {
  if (!season) return 'S0';
  if (season === 'Custom') return 'CUS';
  const match = season.match(/(\d+)/);
  return match ? `S${match[1]}` : 'S0';
};

/**
 * Get trial type short code
 * e.g., "Regular" -> "REG"
 */
const getTypeCode = (trialType) => {
  return TRIAL_TYPE_CODES[trialType] || 'OTH';
};

/**
 * Get next sequential number for a trial code prefix
 * @param {string} prefix - Code prefix (e.g., "TRL-S6-REG")
 * @param {Array} existingTrials - Array of existing trials
 * @returns {string} - 3-digit number (e.g., "001")
 */
const getNextNumber = (prefix, existingTrials = []) => {
  const samePrefixCodes = existingTrials
    .filter(trial => trial.trialCode && trial.trialCode.startsWith(prefix))
    .map(trial => {
      const match = trial.trialCode.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  const maxNumber = samePrefixCodes.length > 0 ? Math.max(...samePrefixCodes) : 0;
  return String(maxNumber + 1).padStart(3, '0');
};

/**
 * Generate a trial code
 * Format: TRL-S6-REG-001
 *
 * @param {string} season - Season string (e.g., "Season 6")
 * @param {string} trialType - Trial type (e.g., "Regular")
 * @param {Array} existingTrials - Array of existing trials with trialCode field
 * @returns {string} - Generated trial code
 */
export const generateTrialCode = (season, trialType, existingTrials = []) => {
  const seasonCode = getSeasonCode(season);
  const typeCode = getTypeCode(trialType);
  const prefix = `TRL-${seasonCode}-${typeCode}`;
  const number = getNextNumber(prefix, existingTrials);
  return `${prefix}-${number}`;
};

/**
 * Validate trial code format
 * @param {string} code - Trial code
 * @returns {boolean}
 */
export const isValidTrialCode = (code) => {
  if (!code) return false;
  const pattern = /^TRL-[A-Z0-9]+-[A-Z]{3}-\d{3}$/;
  return pattern.test(code);
};
