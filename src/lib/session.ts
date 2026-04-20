import { cookies } from 'next/headers';
import getDbConnection from './db';

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = 'taskwise_session';

export interface Session {
  id: string;
  expires: string;
}

export function createSession(): string {
  const db = getDbConnection();
  const sessionId = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
  db.prepare('INSERT INTO sessions (id, expires) VALUES (?, ?)').run(sessionId, expires);
  return sessionId;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS);
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    expires,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });
}

export async function getSessionFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export function isValidSession(sessionId: string): boolean {
  const db = getDbConnection();
  db.prepare('DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP').run();
  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId) as Session | null;
  return !!session;
}

export async function getCurrentSessionId(): Promise<string | null> {
  const sessionId = await getSessionFromCookie();
  if (!sessionId) return null;
  return isValidSession(sessionId) ? sessionId : null;
}

export function deleteSession(sessionId: string): void {
  const db = getDbConnection();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function deleteAllSessions(): void {
  const db = getDbConnection();
  db.prepare('DELETE FROM sessions').run();
}

export async function extendSession(sessionId: string): Promise<void> {
  const db = getDbConnection();
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
  db.prepare('UPDATE sessions SET expires = ? WHERE id = ?').run(expires, sessionId);
  await setSessionCookie(sessionId);
}
