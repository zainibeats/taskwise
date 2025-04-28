import getDbConnection from './db';

interface CountResult {
  count: number;
}

/**
 * Check if this is the first time setup (no admin users exist)
 */
export function isFirstTimeSetup(): boolean {
  try {
    const db = getDbConnection();
    const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as CountResult;
    return result.count === 0;
  } catch (error) {
    console.error('Error checking setup status:', error);
    // Assume it's a first-time setup if we can't check
    return true;
  }
}

/**
 * Check if admin default credentials are valid (for first login)
 */
export function isDefaultAdminCredentials(username: string, password: string): boolean {
  return username === 'admin' && password === 'admin';
} 