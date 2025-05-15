/**
 * Debug utility that only logs in development mode
 * Use this instead of console.log for consistent logging that's automatically
 * disabled in production environments
 */
export const debugLog = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Debug error utility that only logs in development mode
 * Use this instead of console.error for consistent error logging
 */
export const debugError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${message}`, ...args);
  } else {
    // In production, log only the message without sensitive details
    console.error(`[ERROR] ${message}`);
  }
};
