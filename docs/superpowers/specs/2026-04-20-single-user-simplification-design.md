# Single-User Simplification Design

**Date:** 2026-04-20
**Project:** Taskwise
**Goal:** Remove multi-user/admin infrastructure and simplify to a single-user todo app. Auth is optional — the app works out of the box with no setup required, but the user can add a password for security.

---

## What Gets Deleted

| Path | Reason |
|------|--------|
| `src/app/admin/` | Multi-user admin panel |
| `src/app/api/admin/` | User CRUD API routes |
| `src/app/api/auth/setup-admin/` | Admin creation route |
| `src/app/api/auth/password-needed/` | Multi-user password check |
| `src/app/api/auth/setup-required/` | First-run detection route |
| `src/lib/user-config.ts` | User CRUD operations |
| `src/lib/setup-check.ts` | First-run detection logic |
| `src/lib/middleware-check.ts` | Edge-compatible auth checks |
| `src/lib/auth-utils.ts` | User lookup from session |

**Dependencies removed:** `uuid` (replaced by `crypto.randomUUID()`)
**Dependencies kept:** `bcrypt` (still used for optional password hashing), `better-sqlite3`

---

## Database Schema Changes

### Remove
- `users` table (entire table dropped)
- `sessions.user_id` column
- `tasks.user_id` column and foreign key
- `categories.user_id` column and foreign key
- `user_settings.user_id` column and foreign key

### Add
```sql
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Seeded on DB init:
INSERT OR IGNORE INTO app_config (id, password_hash) VALUES (1, NULL);
```

`password_hash = NULL` means no password set; app is open access. Data always persists in SQLite regardless of whether a password is ever configured.

### Sessions (simplified)
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  expires DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
No `user_id` — a valid session simply means "authenticated."

---

## Auth Flow

### Middleware (`src/middleware.ts`)
```
1. Read app_config.password_hash
2. If NULL → pass through (no auth required)
3. If set → check session cookie
   - Valid session → pass through
   - No/invalid session → redirect to /login
```

### Login (`/login`)
- Password-only form (no username)
- POST `/api/auth/login` → verify against `app_config.password_hash`
- On success → create session, redirect to `/`

### Set/Change Password (in app settings)
- Optional section in app settings UI
- POST `/api/auth/set-password` → hash and store in `app_config`
- If changing an existing password → invalidate all current sessions

### Logout
- POST `/api/auth/logout` → delete session row, clear cookie
- Only relevant when password protection is enabled

### Auth API routes kept
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/set-password`
- `GET /api/auth/session` (extend session expiry)

---

## What Gets Modified

### `src/lib/db.ts`
- Remove `users` table creation and all user-related migrations
- Add `app_config` table with seeded row
- Simplify `sessions` table (remove `user_id`)
- Remove `user_id` foreign keys from `tasks`, `categories`, `user_settings`

### `src/lib/session.ts`
- Keep session creation/validation
- Remove all user lookup and user object attachment
- Session = authenticated boolean only

### `src/app/api/tasks/route.ts` and all task sub-routes
- Remove `getUserFromSession()` calls
- Remove `userId` parameter from all queries

### `src/app/api/categories/route.ts`
- Remove `userId` filtering
- Remove `getUserFromSession()` calls

### `src/app/api/user-settings/route.ts`
- Remove `userId` filtering — settings are now app-level

### `src/app/page.tsx`
- Remove auth/session check at top of component
- Remove login/setup redirect logic

### `src/app/login/page.tsx`
- Simplify to password-only form (remove username field, remove setup branching)

### `src/app/setup/page.tsx`
- Remove (password setup moves to app settings)

---

## What Stays Untouched

- All AI flows (`src/ai/`) and AI API routes
- Task, category, subtask data model (minus `user_id`)
- `user_settings` table structure (minus `user_id`, now app-level settings)
- All task/category/subtask UI components

---

## User Experience

1. **First run (no password set):** App opens directly at `/` — fully functional, no login required. All data persists in SQLite.
2. **Optional security:** User goes to settings → sets a password → login required from that point on.
3. **Password change:** Available in settings; invalidates existing sessions.
4. **No password ever set:** App remains open access forever; data always persists.

---

## Out of Scope

- Multiple user accounts
- Role-based access
- OAuth / external auth providers
- User profile management
- Admin panel
