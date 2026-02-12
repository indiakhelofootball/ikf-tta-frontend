
export const STATE_CODES = {
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chhattisgarh': 'CG',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Odisha': 'OD',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TS',
  'Tripura': 'TR',
  'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK',
  'West Bengal': 'WB',
  // Union Territories
  'Andaman and Nicobar Islands': 'AN',
  'Chandigarh': 'CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  'Delhi': 'DL',
  'Jammu and Kashmir': 'JK',
  'Ladakh': 'LA',
  'Lakshadweep': 'LD',
  'Puducherry': 'PY',
};

// List of all Indian states (for dropdown)
export const INDIAN_STATES = Object.keys(STATE_CODES).sort();

/**
 * Generate city code from city name (first 3 letters, uppercase)
 * @param {string} cityName - City name
 * @returns {string} - 3-letter city code
 */
export const generateCityCode = (cityName) => {
  if (!cityName) return 'XXX';
  
  // Remove special characters and extra spaces
  const cleaned = cityName
    .trim()
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ');
  
  // Get first word (most cities start with main name)
  const words = cleaned.split(' ');
  const firstWord = words[0] || cleaned;
  
  // Take first 3 characters, uppercase
  const code = firstWord.substring(0, 3).toUpperCase();
  
  return code || 'XXX';
};

/**
 * Get next sequential number for a city code prefix
 * @param {string} stateCode - State code (e.g., 'MH')
 * @param {string} cityCode - City code (e.g., 'MUM')
 * @param {Array} existingCities - Array of existing cities
 * @returns {string} - 3-digit number (e.g., '001', '002')
 */
export const getNextNumber = (stateCode, cityCode, existingCities = []) => {
  const prefix = `IKF-${stateCode}-${cityCode}`;
  
  // Find all codes with the same prefix
  const samePrefixCodes = existingCities
    .filter(city => city.code && city.code.startsWith(prefix))
    .map(city => {
      // Extract number from code (last 3 digits)
      const match = city.code.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));
  
  // Get the highest number
  const maxNumber = samePrefixCodes.length > 0 ? Math.max(...samePrefixCodes) : 0;
  
  // Next number
  const nextNumber = maxNumber + 1;
  
  // Format as 3-digit string
  return String(nextNumber).padStart(3, '0');
};

/**
 * Generate complete Trial City Code
 * Format: IKF-[STATE]-[CITY]-[NUMBER]
 * Example: IKF-MH-MUM-001
 * 
 * @param {string} state - Full state name
 * @param {string} cityName - Trial city name
 * @param {Array} existingCities - Array of existing cities
 * @returns {string} - Complete trial city code
 */
export const generateTrialCityCode = (state, cityName, existingCities = []) => {
  // Get state code
  const stateCode = STATE_CODES[state];
  if (!stateCode) {
    console.error(`Invalid state: ${state}`);
    return 'IKF-XX-XXX-000';
  }
  
  // Get city code
  const cityCode = generateCityCode(cityName);
  
  // Get next number
  const number = getNextNumber(stateCode, cityCode, existingCities);
  
  // Combine into full code
  const fullCode = `IKF-${stateCode}-${cityCode}-${number}`;
  
  return fullCode;
};

/**
 * Validate Trial City Code format
 * @param {string} code - Trial city code
 * @returns {boolean} - True if valid format
 */
export const isValidTrialCityCode = (code) => {
  if (!code) return false;
  
  // Format: IKF-XX-XXX-000
  const pattern = /^IKF-[A-Z]{2}-[A-Z]{3}-\d{3}$/;
  return pattern.test(code);
};

/**
 * Parse Trial City Code into components
 * @param {string} code - Trial city code
 * @returns {object} - { prefix, stateCode, cityCode, number }
 */
export const parseTrialCityCode = (code) => {
  if (!isValidTrialCityCode(code)) {
    return null;
  }
  
  const parts = code.split('-');
  
  return {
    prefix: parts[0],        // IKF
    stateCode: parts[1],     // MH
    cityCode: parts[2],      // MUM
    number: parseInt(parts[3], 10), // 1
  };
};

/**
 * Check if a trial city code already exists
 * @param {string} code - Trial city code to check
 * @param {Array} existingCities - Array of existing cities
 * @returns {boolean} - True if code exists
 */
export const codeExists = (code, existingCities = []) => {
  return existingCities.some(city => city.code === code);
};

// Export all utilities
export default {
  STATE_CODES,
  INDIAN_STATES,
  generateCityCode,
  getNextNumber,
  generateTrialCityCode,
  isValidTrialCityCode,
  parseTrialCityCode,
  codeExists,
};