// src/utils/errorHandling.js
// Comprehensive error handling for event handlers and async operations

import toast from 'react-hot-toast';

/**
 * Extract user-friendly error message from various error types
 */
export const getErrorMessage = (error) => {
  // API Error Response
  if (error?.response) {
    return error.response.data?.message || 
           error.response.data?.error || 
           `Request failed with status ${error.response.status}`;
  }
  
  // Network Error
  if (error?.message === 'Network Error') {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  // Timeout Error
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  
  // JavaScript Error
  if (error?.message) {
    return error.message;
  }
  
  // Unknown Error
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Log error to console (and optionally to error tracking service)
 */
export const logErrorToService = (error, context = {}) => {
  // Development: Log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error:', error);
    console.error('📍 Context:', context);
  }
  
  // Production: Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { extra: context });
  }
};

/**
 * Show error toast notification
 */
export const showErrorToast = (error, customMessage = null) => {
  const message = customMessage || getErrorMessage(error);
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
};

/**
 * Wrapper for async functions - automatically handles errors
 * 
 * Usage:
 * const handleSubmit = asyncHandler(async () => {
 *   await api.createREP(data);
 *   toast.success('REP created!');
 * }, 'Failed to create REP');
 */
export const asyncHandler = (asyncFn, errorMessage = null) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      logErrorToService(error, { function: asyncFn.name });
      showErrorToast(error, errorMessage);
      throw error;
    }
  };
};

/**
 * Wrapper for event handlers - automatically handles errors
 * 
 * Usage:
 * <button onClick={safeHandler(handleClick, 'Failed to process click')}>
 */
export const safeHandler = (handler, errorMessage = null) => {
  return (...args) => {
    try {
      const result = handler(...args);
      
      // If handler returns a promise, handle async errors
      if (result instanceof Promise) {
        return result.catch((error) => {
          logErrorToService(error, { handler: handler.name });
          showErrorToast(error, errorMessage);
        });
      }
      
      return result;
    } catch (error) {
      logErrorToService(error, { handler: handler.name });
      showErrorToast(error, errorMessage);
    }
  };
};

/**
 * Wrapper for API calls with automatic error handling
 * 
 * Usage:
 * const data = await withErrorHandling(
 *   () => repAPI.create(repData),
 *   'Failed to create REP'
 * );
 */
export const withErrorHandling = async (apiCall, errorMessage = null) => {
  try {
    return await apiCall();
  } catch (error) {
    logErrorToService(error);
    showErrorToast(error, errorMessage);
    throw error;
  }
};