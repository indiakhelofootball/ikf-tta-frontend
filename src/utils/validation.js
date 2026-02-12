// src/utils/validation.js
// Validation utilities for forms

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  // Check if empty
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  // Check email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }

  // Check length
  if (email.length > 254) {
    return {
      isValid: false,
      error: 'Email is too long',
    };
  }

  return {
    isValid: true,
    error: '',
  };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePassword = (password) => {
  // Check if empty
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  // Check minimum length
  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters long',
    };
  }

  // Check maximum length
  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password is too long',
    };
  }

  return {
    isValid: true,
    error: '',
  };
};

/**
 * Validate login form
 * @param {string} email - Email to validate
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateLoginForm = (email, password) => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  const errors = {};
  
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};