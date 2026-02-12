// src/utils/errorLogger.js

/**
 * Error Logging Utility
 * Logs errors to console in development and can be extended to send to error tracking service
 */

export const logError = (error, errorInfo) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error Caught by Boundary:', error);
    console.error('📍 Error Info:', errorInfo);
    console.error('📚 Component Stack:', errorInfo?.componentStack);
  }

  // In production, you would send this to an error tracking service
  // Examples: Sentry, LogRocket, Bugsnag, etc.
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo?.componentStack } } });
    
    // Or send to your own backend
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     message: error.message,
    //     stack: error.stack,
    //     componentStack: errorInfo?.componentStack,
    //     timestamp: new Date().toISOString(),
    //     userAgent: navigator.userAgent,
    //     url: window.location.href,
    //   }),
    // });
  }
};

/**
 * Format error for display
 */
export const formatError = (error) => {
  if (error?.response) {
    // API error
    return {
      message: error.response.data?.message || 'API request failed',
      status: error.response.status,
      type: 'API_ERROR',
    };
  } else if (error?.message) {
    // JavaScript error
    return {
      message: error.message,
      type: 'JS_ERROR',
    };
  } else {
    // Unknown error
    return {
      message: 'An unexpected error occurred',
      type: 'UNKNOWN_ERROR',
    };
  }
};

/**
 * Check if error is recoverable
 */
export const isRecoverableError = (error) => {
  // Network errors are usually recoverable
  if (error?.message?.includes('Network Error')) return true;
  if (error?.message?.includes('timeout')) return true;
  if (error?.response?.status === 429) return true; // Rate limit
  if (error?.response?.status >= 500) return true; // Server errors
  
  return false;
};