import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import getDbConnection from './db';
import { User } from './user-config';

// Session expiration time in milliseconds (default: 24 hours)
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

// Session cookie name
const SESSION_COOKIE_NAME = 'taskwise_session';

// Session type definition
export interface Session {
  id: string;
  user_id: number;
  expires: string;
  data?: string;
  user?: User;
}

/**
 * Create a new session for a user
 */
export function createSession(user: User): string {
  if (!user.id) {
    throw new Error('User ID is required to create a session');
  }

  const db = getDbConnection();
  const sessionId = uuidv4();
  const expires = new Date(Date.now() + SESSION_EXPIRY).toISOString();

  // Store session in database
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires, data)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, user.id, expires, JSON.stringify({ username: user.username, role: user.role }));

  return sessionId;
}

/**
 * Set the session cookie for a user
 */
export function setSessionCookie(sessionId: string): void {
  const expires = new Date(Date.now() + SESSION_EXPIRY);
  const cookieStore = cookies();
  
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    expires,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(): void {
  const cookieStore = cookies();
  
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

/**
 * Get the current session from cookie
 */
export function getSessionFromCookie(): string | undefined {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  return sessionCookie?.value;
}

/**
 * Get session by ID
 */
export function getSessionById(sessionId: string): Session | null {
  const db = getDbConnection();
  
  // Delete expired sessions
  db.prepare('DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP').run();
  
  // Get session
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | null;
  
  if (!session) {
    return null;
  }
  
  // Check if session is expired
  if (new Date(session.expires) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  
  // Get user info
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as User | null;
  
  if (!user) {
    return null;
  }
  
  return { ...session, user };
}

/**
 * Get the current user's session
 */
export function getCurrentSession(): Session | null {
  const sessionId = getSessionFromCookie();
  
  if (!sessionId) {
    return null;
  }
  
  return getSessionById(sessionId);
}

/**
 * Delete a session by ID
 */
export function deleteSession(sessionId: string): void {
  const db = getDbConnection();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: number): void {
  const db = getDbConnection();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Extend a session's expiration time
 */
export function extendSession(sessionId: string): void {
  const db = getDbConnection();
  const expires = new Date(Date.now() + SESSION_EXPIRY).toISOString();
  
  db.prepare('UPDATE sessions SET expires = ? WHERE id = ?').run(expires, sessionId);
  
  // Also update cookie
  setSessionCookie(sessionId);
} 