// src/utils/trialCodeGenerator.js

const PROJECT_CODES_MAP = {
  'IKF': 'IKF',
  'Project Nari Shakti': 'PNS',
};

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
 * Get next sequential number for a code prefix
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
 * Generate a project code
 * Format: IKF-S5-001 or PNS-S6-002
 *
 * @param {string} projectName - e.g., "IKF" or "Project Nari Shakti"
 * @param {string} season - e.g., "Season 5"
 * @param {Array} existingTrials - array of existing trials
 * @param {Array} adminProjects - admin-managed project list, each { name, comment }.
 *   `comment` holds the project's code abbreviation (set on create, survives renames
 *   since a rename updates the row in place). Preferred over the hardcoded map so a
 *   renamed project keeps the same code prefix for all of its future trials.
 * @returns {string}
 */
export const generateProjectCode = (projectName, season, existingTrials = [], adminProjects = []) => {
  const match = adminProjects.find((p) => p.name === projectName);
  const projectCode = (match && match.comment) || PROJECT_CODES_MAP[projectName] || projectName.substring(0, 3).toUpperCase();
  const seasonCode = getSeasonCode(season);
  const prefix = `${projectCode}-${seasonCode}`;
  const number = getNextNumber(prefix, existingTrials);
  return `${prefix}-${number}`;
};
