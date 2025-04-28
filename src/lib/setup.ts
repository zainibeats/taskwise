import getDbConnection from "@/lib/db";

export function isSetupRequired() {
  try {
    const db = getDbConnection();
    // Check if there are any admin users in the system
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    return adminCount.count === 0;
  } catch (error) {
    // If the users table doesn't exist yet, setup is required
    return true;
  }
} 