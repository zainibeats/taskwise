import { getDbConnection } from '@/lib/db';
import { cookies } from 'next/headers';
import { type User } from './user-config';
import { Database } from 'better-sqlite3';

// Session type
interface Session {
  id: string;
  user_id: number;
  expires: string;
  data?: string;
}

// Cookie name constant to ensure consistency
const SESSION_COOKIE_NAME = 'taskwise_session';

// Get the current session ID from cookies
export async function getSessionId(req?: Request): Promise<string | null> {
  // Use either the request cookies or the server component cookies API
  let cookieValue: string | undefined;
  
  if (req) {
    // Use request cookies for API routes
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const sessionCookie = cookieHeader
        .split(';')
        .find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
      
      if (sessionCookie) {
        cookieValue = sessionCookie.split('=')[1].trim();
      }
    }
  } else {
    try {
      // Use server component cookies API - must await cookies()
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      cookieValue = sessionCookie?.value;
    } catch (error) {
      console.error('Error accessing cookies:', error);
    }
  }
  
  return cookieValue || null;
}

// Get the current user from session
export async function getUserFromSession(req?: Request): Promise<User | null> {
  try {
    const sessionId = await getSessionId(req);
    if (!sessionId) return null;
    
    const db = getDbConnection();
    
    // Get session
    const session = db.prepare(`
      SELECT user_id, expires 
      FROM sessions 
      WHERE id = ?
    `).get(sessionId) as Session | undefined;
    
    if (!session) return null;
    
    // Check if session is expired
    if (new Date(session.expires) < new Date()) {
      // Delete expired session
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      return null;
    }
    
    // Get user
    const user = db.prepare(`
      SELECT id, username, email, role, active, password_hash
      FROM users
      WHERE id = ? AND active = 1
    `).get(session.user_id) as User | undefined;
    
    return user || null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

// Create a new session for a user
export function createSession(userId: number, expiresInHours = 24): string {
  const db = getDbConnection();
  
  // Generate random session ID
  const sessionId = crypto.randomUUID();
  
  // Calculate expiration
  const expires = new Date();
  expires.setHours(expires.getHours() + expiresInHours);
  
  // Insert session
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, expires.toISOString());
  
  return sessionId;
}

// Delete a session
export function deleteSession(sessionId: string): boolean {
  try {
    const db = getDbConnection();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Verify if a user has admin privileges
export async function isAdmin(req?: Request): Promise<boolean> {
  const user = await getUserFromSession(req);
  return user?.role === 'admin';
} 