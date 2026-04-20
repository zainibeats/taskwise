# Single-User Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove multi-user auth infrastructure and simplify Taskwise to a single-user app with optional password protection.

**Architecture:** Replace the users/sessions/admin system with a single `app_config` table row (stores optional `password_hash`). Middleware checks this row via `/api/auth/config` (Edge-safe API call). If no password is set, the app is fully open; if set, a session cookie gates access.

**Tech Stack:** Next.js 15, better-sqlite3, bcrypt, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Rewrite | `src/lib/db.ts` |
| Rewrite | `src/lib/session.ts` |
| Rewrite | `src/middleware.ts` |
| Rewrite | `src/app/api/auth/login/route.ts` |
| Rewrite | `src/app/api/auth/set-password/route.ts` |
| Rewrite | `src/app/login/page.tsx` |
| Modify | `src/app/api/auth/session/route.ts` |
| Modify | `src/app/api/auth/logout/route.ts` |
| Modify | `src/lib/task-service.ts` |
| Modify | `src/app/api/tasks/route.ts` |
| Modify | `src/app/api/categories/route.ts` |
| Modify | `src/app/api/user-settings/route.ts` |
| Modify | `src/app/page.tsx` |
| Create | `src/app/api/auth/config/route.ts` |
| Delete | `src/lib/user-config.ts`, `src/lib/setup-check.ts`, `src/lib/middleware-check.ts`, `src/lib/auth-utils.ts` |
| Delete | `src/app/admin/`, `src/app/api/admin/`, `src/app/setup/` |
| Delete | `src/app/api/auth/setup-admin/`, `src/app/api/auth/password-needed/`, `src/app/api/auth/setup-required/` |
| Modify | `package.json` (remove `uuid`, `js-yaml` and their `@types`) |

---

## Task 1: Rewrite the database schema

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Replace db.ts with new single-user schema**

Replace the entire contents of `src/lib/db.ts` with:

```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDbConnection(): Database.Database {
  if (!dbInstance) {
    const DB_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const DB_PATH = path.join(DB_DIR, 'taskwise.db');
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('foreign_keys = ON');
    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.prepare('INSERT OR IGNORE INTO app_config (id, password_hash) VALUES (1, NULL)').run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      expires TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      importance INTEGER CHECK (importance BETWEEN 1 AND 10),
      category TEXT,
      priority_score REAL,
      is_completed BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  migrateExistingData(db);
}

function migrateExistingData(db: Database.Database) {
  // Migrate tasks: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE tasks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          deadline TEXT,
          importance INTEGER CHECK (importance BETWEEN 1 AND 10),
          category TEXT,
          priority_score REAL,
          is_completed BOOLEAN DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO tasks_new (id, title, description, deadline, importance, category, priority_score, is_completed, created_at)
          SELECT id, title, description, deadline, importance, category, priority_score, is_completed, created_at FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
      `);
    }
  } catch {}

  // Migrate categories: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(categories)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE categories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          icon TEXT NOT NULL
        );
        INSERT OR IGNORE INTO categories_new (id, name, icon)
          SELECT id, name, icon FROM categories WHERE user_id IS NULL;
        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;
      `);
    }
  } catch {}

  // Migrate user_settings: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(user_settings)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE user_settings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO user_settings_new (key, value, created_at, updated_at)
          SELECT key, value, created_at, updated_at FROM user_settings;
        DROP TABLE user_settings;
        ALTER TABLE user_settings_new RENAME TO user_settings;
      `);
    }
  } catch {}

  // Migrate sessions: rebuild without user_id if it exists
  try {
    const cols = (db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]).map(c => c.name);
    if (cols.includes('user_id')) {
      db.exec(`
        CREATE TABLE sessions_new (
          id TEXT PRIMARY KEY,
          expires TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        DROP TABLE sessions;
        ALTER TABLE sessions_new RENAME TO sessions;
      `);
    }
  } catch {}

  // Drop users table if it exists (no longer needed)
  try {
    db.exec('DROP TABLE IF EXISTS users');
  } catch {}
}

if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  });
}

export default getDbConnection;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck 2>&1 | head -30`

Expected: errors only about files we haven't touched yet (user-config, auth-utils imports), not about db.ts itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "refactor: simplify db schema to single-user (remove users, user_id FKs, add app_config)"
```

---

## Task 2: Rewrite session.ts

**Files:**
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Replace session.ts**

Replace the entire contents of `src/lib/session.ts` with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/session.ts
git commit -m "refactor: simplify session.ts — no user references, use crypto.randomUUID"
```

---

## Task 3: Create /api/auth/config route

**Files:**
- Create: `src/app/api/auth/config/route.ts`

- [ ] **Step 1: Create the file**

Create `src/app/api/auth/config/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import getDbConnection from '@/lib/db';

export async function GET() {
  try {
    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;
    return NextResponse.json({ passwordSet: !!(config?.password_hash) });
  } catch {
    return NextResponse.json({ passwordSet: false });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/config/route.ts
git commit -m "feat: add /api/auth/config endpoint for middleware auth check"
```

---

## Task 4: Rewrite middleware.ts

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace middleware.ts**

Replace the entire contents of `src/middleware.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'taskwise_session';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/set-password',
  '/api/auth/config',
  '/api/auth/session',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if password protection is enabled (Edge-safe: use fetch)
  try {
    const baseUrl = new URL(request.url).origin;
    const configRes = await fetch(`${baseUrl}/api/auth/config`);
    if (configRes.ok) {
      const { passwordSet } = await configRes.json();
      if (!passwordSet) {
        return NextResponse.next();
      }
    }
  } catch {
    // If config check fails, allow through (fail open for availability)
    return NextResponse.next();
  }

  // Password is set — require a valid session cookie
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|images/).*)',],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "refactor: simplify middleware to single-user optional-password auth"
```

---

## Task 5: Rewrite /api/auth/login

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Replace login route**

Replace the entire contents of `src/app/api/auth/login/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import getDbConnection from '@/lib/db';
import { createSession } from '@/lib/session';

const SESSION_COOKIE_NAME = 'taskwise_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;

    if (!config?.password_hash) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 });
    }

    const match = await bcrypt.compare(password, config.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const sessionId = createSession();
    const expires = new Date(Date.now() + SESSION_EXPIRY_MS);

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "refactor: login route — password-only, no username"
```

---

## Task 6: Rewrite /api/auth/set-password

**Files:**
- Modify: `src/app/api/auth/set-password/route.ts`

- [ ] **Step 1: Replace set-password route**

Replace the entire contents of `src/app/api/auth/set-password/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import getDbConnection from '@/lib/db';
import { deleteAllSessions, createSession } from '@/lib/session';

const SESSION_COOKIE_NAME = 'taskwise_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { password, currentPassword } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDbConnection();
    const config = db.prepare('SELECT password_hash FROM app_config WHERE id = 1').get() as { password_hash: string | null } | null;

    // If a password already exists, require the current password to change it
    if (config?.password_hash) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, config.password_hash);
      if (!match) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE app_config SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(passwordHash);

    // Invalidate all existing sessions after password change
    deleteAllSessions();

    // Create a fresh session for the current user
    const sessionId = createSession();
    const expires = new Date(Date.now() + SESSION_EXPIRY_MS);

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      expires,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'An error occurred while setting password' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/set-password/route.ts
git commit -m "refactor: set-password route — app-level password, invalidates sessions on change"
```

---

## Task 7: Update /api/auth/session and /api/auth/logout

**Files:**
- Modify: `src/app/api/auth/session/route.ts`
- Modify: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Update session route**

Replace the entire contents of `src/app/api/auth/session/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionId, extendSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  try {
    const sessionId = await getCurrentSessionId();
    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    await extendSession(sessionId);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false, error: 'Session check failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update logout route**

Replace the entire contents of `src/app/api/auth/logout/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSessionFromCookie } from '@/lib/session';

export async function POST(_req: NextRequest) {
  try {
    const sessionId = await getSessionFromCookie();
    if (sessionId) {
      deleteSession(sessionId);
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
      name: 'taskwise_session',
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'An error occurred during logout' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/session/route.ts src/app/api/auth/logout/route.ts
git commit -m "refactor: session and logout routes — remove user data, clean up imports"
```

---

## Task 8: Update task-service.ts

**Files:**
- Modify: `src/lib/task-service.ts`

- [ ] **Step 1: Remove userId from createTask and category operations**

In `src/lib/task-service.ts`, make these changes:

1. Change `createTask` signature — remove `userId` param, remove it from INSERT and AI calls:

```typescript
// OLD
createTask: async (task: Omit<DbTask, 'id'>, userId?: number): Promise<DbTask> => {
```
```typescript
// NEW
createTask: async (task: Omit<DbTask, 'id'>): Promise<DbTask> => {
```

2. Remove `userId` from the AI calls inside `createTask`:
```typescript
// OLD
const result = await categorizeTask({ 
  taskDescription: title + (description ? ` - ${description}` : ''),
  userId 
});
```
```typescript
// NEW
const result = await categorizeTask({ 
  taskDescription: title + (description ? ` - ${description}` : '')
});
```

```typescript
// OLD
const result = await prioritizeTask({
  task: title,
  deadline: deadline || '',
  importance: importance || 5,
  category: taskCategory || 'Other',
  userId
});
```
```typescript
// NEW
const result = await prioritizeTask({
  task: title,
  deadline: deadline || '',
  importance: importance || 5,
  category: taskCategory || 'Other'
});
```

```typescript
// OLD
const result = await suggestSubtasks({
  taskDescription: title + (description ? ` - ${description}` : ''),
  userId
});
```
```typescript
// NEW
const result = await suggestSubtasks({
  taskDescription: title + (description ? ` - ${description}` : '')
});
```

3. Change the INSERT in `createTask` — remove `user_id`:
```typescript
// OLD
const result = db.prepare(`
  INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed, user_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(title, description, deadline, importance, taskCategory, taskPriorityScore, is_completed ? 1 : 0, userId || null);
```
```typescript
// NEW
const result = db.prepare(`
  INSERT INTO tasks (title, description, deadline, importance, category, priority_score, is_completed)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(title, description, deadline, importance, taskCategory, taskPriorityScore, is_completed ? 1 : 0);
```

4. Simplify `getAllCategories` — remove userId param and filtering:
```typescript
// OLD
getAllCategories: async (userId?: number): Promise<DbCategory[]> => {
  const db = getDb();
  if (userId) {
    return db.prepare('SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL').all(userId) as DbCategory[];
  } else {
    return db.prepare('SELECT * FROM categories').all() as DbCategory[];
  }
},
```
```typescript
// NEW
getAllCategories: async (): Promise<DbCategory[]> => {
  const db = getDb();
  return db.prepare('SELECT * FROM categories').all() as DbCategory[];
},
```

5. Simplify `saveCategory` — remove user_id logic:
```typescript
// OLD
saveCategory: async (category: DbCategory): Promise<DbCategory> => {
  const db = getDb();
  const { name, icon, user_id } = category;
  const existing = db.prepare('SELECT * FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)').get(name, user_id) as { user_id: number | null } | undefined;
  if (existing) {
    if (existing.user_id === null) {
      db.prepare('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)').run(name, icon, user_id);
    } else {
      db.prepare('UPDATE categories SET icon = ? WHERE name = ? AND user_id = ?').run(icon, name, user_id);
    }
  } else {
    db.prepare('INSERT INTO categories (name, icon, user_id) VALUES (?, ?, ?)').run(name, icon, user_id);
  }
  return category;
},
```
```typescript
// NEW
saveCategory: async (category: DbCategory): Promise<DbCategory> => {
  const db = getDb();
  const { name, icon } = category;
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) {
    db.prepare('UPDATE categories SET icon = ? WHERE name = ?').run(icon, name);
  } else {
    db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').run(name, icon);
  }
  return category;
},
```

6. Simplify `deleteCategory` — remove userId param:
```typescript
// OLD
deleteCategory: async (name: string, userId?: number): Promise<boolean> => {
  const db = getDb();
  if (userId) {
    const result = db.prepare('DELETE FROM categories WHERE name = ? AND user_id = ?').run(name, userId);
    return result.changes > 0;
  } else {
    const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    return result.changes > 0; 
  }
}
```
```typescript
// NEW
deleteCategory: async (name: string): Promise<boolean> => {
  const db = getDb();
  const result = db.prepare('DELETE FROM categories WHERE name = ?').run(name);
  return result.changes > 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/task-service.ts
git commit -m "refactor: task-service — remove userId from all operations"
```

---

## Task 9: Update /api/tasks/route.ts

**Files:**
- Modify: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Remove userId from POST handler**

Replace the entire contents of `src/app/api/tasks/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/task-service';

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}));
}

export async function GET(_request: NextRequest) {
  try {
    const tasks = await taskService.getAllTasks();
    return setCorsHeaders(NextResponse.json(tasks));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();
    if (!taskData.title) {
      return setCorsHeaders(NextResponse.json({ error: 'Title is required' }, { status: 400 }));
    }
    const task = await taskService.createTask(taskData);
    return setCorsHeaders(NextResponse.json(task, { status: 201 }));
  } catch (error) {
    console.error('Error creating task:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to create task', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "refactor: tasks route — remove userId and session lookup"
```

---

## Task 10: Update /api/categories/route.ts

**Files:**
- Modify: `src/app/api/categories/route.ts`

- [ ] **Step 1: Remove session/userId from categories route**

Replace the entire contents of `src/app/api/categories/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '@/lib/task-service';

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}));
}

export async function GET(_request: NextRequest) {
  try {
    const categories = await categoryService.getAllCategories();
    return setCorsHeaders(NextResponse.json(categories));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const categoryData = await request.json();
    if (!categoryData.name || !categoryData.icon) {
      return setCorsHeaders(NextResponse.json({ error: 'Name and icon are required' }, { status: 400 }));
    }
    const category = await categoryService.saveCategory(categoryData);
    return setCorsHeaders(NextResponse.json(category, { status: 201 }));
  } catch (error) {
    console.error('Error saving category:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to save category', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) {
      return setCorsHeaders(NextResponse.json({ error: 'Category name is required' }, { status: 400 }));
    }
    const success = await categoryService.deleteCategory(name);
    if (!success) {
      return setCorsHeaders(NextResponse.json({ error: 'Category not found' }, { status: 404 }));
    }
    return setCorsHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Error deleting category:', error);
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Failed to delete category', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/categories/route.ts
git commit -m "refactor: categories route — remove session and userId"
```

---

## Task 11: Update /api/user-settings/route.ts

**Files:**
- Modify: `src/app/api/user-settings/route.ts`

- [ ] **Step 1: Replace user-settings route**

Replace the entire contents of `src/app/api/user-settings/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDbConnection from '@/lib/db';

interface AppSetting {
  key: string;
  value: string;
}

export async function GET(_req: NextRequest) {
  try {
    const db = getDbConnection();
    const settings = db.prepare('SELECT key, value FROM user_settings').all() as AppSetting[];
    const settingsObj: Record<string, string> = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    const db = getDbConnection();
    const existing = db.prepare('SELECT id FROM user_settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE user_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)').run(key, value);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user-settings/route.ts
git commit -m "refactor: user-settings route — remove userId, settings are now app-level"
```

---

## Task 12: Update src/app/page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove auth state and useEffect from page.tsx**

In `src/app/page.tsx`, inside the `TaskWiseApp` function, remove:
1. The `isAuthenticated` and `isAuthChecking` state declarations
2. The entire `useEffect` block that calls `checkAuth` (lines 76–113)
3. Remove `useRouter` and `useSearchParams` imports if they're no longer used after this change

Check if `useRouter` or `useSearchParams` are used elsewhere in the file before removing those imports.

The function should open with just the `builtInCategories` definition and the hooks it actually uses.

- [ ] **Step 2: Check for remaining router/searchParams usage**

Run: `grep -n "useRouter\|useSearchParams\|isAuthenticated\|isAuthChecking\|checkAuth\|setup-required" src/app/page.tsx`

Remove any remaining references to the removed state variables. If `router` is used elsewhere in the file (e.g., for non-auth navigation), keep `useRouter`.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: remove auth check from main page"
```

---

## Task 13: Rewrite src/app/login/page.tsx

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace login page with password-only form**

Replace the entire contents of `src/app/login/page.tsx` with:

```typescript
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get('returnUrl') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.push(returnUrl);
      } else {
        const data = await response.json();
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid password',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Login failed', description: 'An error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">TaskWise</CardTitle>
          <CardDescription className="text-center">Enter your password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "refactor: login page — password-only form, no username or setup check"
```

---

## Task 14: Delete removed files and directories

**Files:**
- Delete: `src/lib/user-config.ts`, `src/lib/setup-check.ts`, `src/lib/middleware-check.ts`, `src/lib/auth-utils.ts`
- Delete: `src/app/admin/`, `src/app/api/admin/`, `src/app/setup/`
- Delete: `src/app/api/auth/setup-admin/`, `src/app/api/auth/password-needed/`, `src/app/api/auth/setup-required/`

- [ ] **Step 1: Delete lib files**

```bash
rm src/lib/user-config.ts src/lib/setup-check.ts src/lib/middleware-check.ts src/lib/auth-utils.ts
```

- [ ] **Step 2: Delete app directories**

```bash
rm -rf src/app/admin src/app/setup src/app/api/admin
rm -rf src/app/api/auth/setup-admin src/app/api/auth/password-needed src/app/api/auth/setup-required
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npm run typecheck 2>&1 | head -50`

Expected: no errors (or only pre-existing unrelated errors). Fix any import errors that reference deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete auth, admin, and setup files no longer needed"
```

---

## Task 15: Remove unused dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove uuid and js-yaml**

```bash
npm uninstall uuid js-yaml @types/uuid @types/js-yaml
```

- [ ] **Step 2: Remove sync-users and create-admin scripts if they exist**

```bash
ls scripts/
```

If `scripts/sync-users.js` or `scripts/create-admin.js` exist, delete them:

```bash
rm -f scripts/sync-users.js scripts/create-admin.js
```

Also remove from `package.json` scripts section — delete the `"sync-users"` and `"create-admin"` lines.

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build 2>&1 | tail -20`

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove uuid and js-yaml dependencies"
```

---

## Task 16: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify open access (no password set)**

Open `http://localhost:9002` — should load the main TaskWise UI directly with no login redirect.

- [ ] **Step 3: Verify task creation works**

Create a task via the UI. Confirm it appears in the list and persists on page refresh.

- [ ] **Step 4: Verify password protection**

Call the set-password endpoint:
```bash
curl -s -X POST http://localhost:9002/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"password":"testpass123"}' | cat
```
Expected: `{"success":true}` and a `Set-Cookie` header with `taskwise_session`.

- [ ] **Step 5: Verify redirect to login**

Open a new incognito window and navigate to `http://localhost:9002`. Should redirect to `/login`.

- [ ] **Step 6: Verify login works**

Enter `testpass123` on the login page. Should redirect back to `/` and show the todo app.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete single-user simplification — optional password auth, no admin"
```
