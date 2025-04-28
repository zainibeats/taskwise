# TaskWise Implementation and Deployment Guide

This guide outlines the detailed process for completing and deploying the TaskWise AI-powered todo list application on Vercel.

## 1. Application Structure [✅ Done]

### Core Components

```
src/
├── app/
│   ├── page.tsx              # Main todo list page
│   ├── layout.tsx            # Root layout with providers
│   ├── globals.css           # Global styles
│   ├── hooks/                # React hooks
│   │   ├── useTasks.ts       # Hook for task operations
│   │   └── useCategories.ts  # Hook for category operations
│   ├── api/                  # API routes
│   │   ├── tasks/            # Task API endpoints
│   │   └── categories/       # Category API endpoints
│   └── types/                # TypeScript type definitions
├── components/
│   ├── ui/                   # Shadcn UI components
│   ├── task-form.tsx         # Form for creating new tasks
│   ├── task-list.tsx         # List of tasks with filtering
│   ├── task-item.tsx         # Individual task component
│   └── subtask-list.tsx      # List of subtasks
├── ai/
│   ├── ai-instance.ts        # Genkit AI instance setup
│   └── flows/
│       ├── prioritize-task.ts    # AI task prioritization
│       ├── suggest-subtasks.ts   # AI subtask suggestion
│       └── categorize-task.ts    # AI task categorization
└── lib/
    ├── db.ts                 # Database connection singleton
    └── task-service.ts       # Task and category data access
```

## 2. User Interface Implementation [✅ Done]

### Task List and Item Components [✅ Done]

Implement components to:
- Display tasks sorted by priority
- Show deadline, importance, category, and priority score
- Provide options to edit, complete, or delete tasks
- Expand to show subtasks

*Status: `task-item.tsx` [✅ Created], `task-list.tsx` [✅ Created]. `subtask-list.tsx` and subtask regeneration [🚧 To Do].*

## 3. Database Setup [✅ Done]

### SQLite Implementation with Connection Singleton [✅ Done]

For data persistence, TaskWise uses SQLite with a connection singleton pattern, providing several benefits:

1. **Cross-Device Access**: Data is stored on the server, making it accessible from any device
2. **Simplicity**: Minimal database setup with a single file
3. **Self-Contained**: The database is stored in a single file that can be easily backed up
4. **Persistent Connection**: A singleton database connection ensures data consistency across requests

The implementation is in `src/lib/db.ts` and includes:

```typescript
// Database singleton pattern
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Database connection singleton
let dbInstance: Database.Database | null = null;

/**
 * Get a singleton database connection
 * This ensures we reuse the same connection across all API requests
 */
export function getDbConnection(): Database.Database {
  if (!dbInstance) {
    // Ensure the data directory exists
    const DB_DIR = path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const DB_PATH = path.join(DB_DIR, 'taskwise.db');
    
    // Create database instance
    dbInstance = new Database(DB_PATH);
    
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');
    
    // Initialize tables
    initDb(dbInstance);
  }
  
  return dbInstance;
}
```

This singleton pattern:
- Maintains a single database connection across all API requests
- Prevents issues with multiple connections to the same SQLite file
- Ensures the database is initialized only once
- Properly handles database table creation on first run

### API Layer with CORS Support [✅ Done]

TaskWise implements a RESTful API layer that interfaces with the SQLite database and includes CORS support for cross-origin access:

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `PATCH /api/tasks/:id` - Toggle task completion
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create or update a category
- `DELETE /api/categories?name=categoryName` - Delete a category

Each API endpoint includes:
- Proper error handling with detailed error messages
- CORS headers for cross-origin access
- Request validation
- Response status codes appropriate to the operation

The API routes are implemented using Next.js API routes in the `src/app/api` directory.

### Client-Side Storage Strategy [✅ Done]

TaskWise uses a two-tier storage approach:

1. **Primary Storage**: SQLite database through API endpoints for all data (tasks, categories, etc.)
2. **Fallback Storage**: localStorage is used only as a fallback for tasks when the API is unavailable
   - Categories are now stored exclusively in the database
   - This ensures consistent category management across devices
   - No dependency on localStorage for category management


## 4. Development Mode Database Persistence [🚧 To Do]

The current database implementation works well in production but has issues in development mode due to Next.js hot reloading. Each time the code changes or the server restarts, the database connection singleton is reset.

### Solution: External Database Connection File [✅ Done]

To fix this issue, we've implemented a standalone database service:

1. **Created a database service using ES modules**:
   ```bash
   mkdir -p db
   touch db/connection.js
   ```

   The service is implemented as an ES module (since our project uses `"type": "module"` in package.json) and runs outside the Next.js application lifecycle.

2. **Implemented a Node.js HTTP server for database operations**:
   ```javascript
   // db/connection.js
   import sqlite3 from 'better-sqlite3';
   import fs from 'fs';
   import path from 'path';
   import http from 'http';
   import { fileURLToPath } from 'url';

   // Get current file path in ESM
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);

   // Initialize database, tables, and HTTP server...
   ```

3. **Added scripts to package.json for running the service**:
   ```json
   "scripts": {
     "dev": "next dev --turbopack -p 9002",
     "dev:with-db": "concurrently \"node db/connection.js\" \"next dev --turbopack -p 9002\"",
     "db:start": "node db/connection.js"
   }
   ```

4. **Updated the database client to use the external service in development mode**:
   In `src/lib/db.ts`, we detect development mode and use fetch API to communicate with the database service instead of direct SQLite connections.

To use the database service in development:

```bash
# Start both the database service and Next.js
npm run dev:with-db

# Or start them separately
npm run db:start
npm run dev
```

This approach:
- Maintains a persistent database connection outside Next.js's module system
- Works consistently in both development and production environments
- Allows for proper data persistence across hot reloads

## 5. Server Actions [🚧 To Do]

Implement server actions for database operations:

```typescript
'use server'

import { sql } from '@vercel/postgres';
import { prioritizeTask } from '@/ai/flows/prioritize-task';
import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const deadline = formData.get('deadline') as string;
  const importance = parseInt(formData.get('importance') as string);
  const category = formData.get('category') as string;

  // Get priority score from AI
  const { priorityScore } = await prioritizeTask({
    task: title,
    deadline,
    importance,
    category,
  });

  // Insert task into database
  await sql`
    INSERT INTO tasks (title, description, deadline, importance, category, priority_score)
    VALUES (${title}, ${description}, ${deadline}, ${importance}, ${category}, ${priorityScore})
    RETURNING id
  `;
}
```

## 6. Deployment to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial TaskWise implementation"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Create an account on [Vercel](https://vercel.com)
   - Create a new project and connect your GitHub repository
   - Set up environment variables:
     - `GENKIT_API_KEY`

3. **Database Setup**:
   - Create a Vercel Postgres database from the Vercel dashboard
   - Run the schema creation SQL scripts

4. **Deploy**:
   - Set the build command: `npm run build`
   - Set the output directory: `out`
   - Deploy the application

5. **Monitor**:
   - Check logs for any deployment issues
   - Set up usage alerts for the database and AI API

## 7. User Authentication Implementation [🚧 To Do]

To implement user authentication with a configuration-based approach:

### Overview

The user authentication system will:
- Use a simple configuration file (YAML/JSON) for admin account management
- Allow users to set their own passwords on first login
- Separate tasks and categories per user in the SQLite database
- Support simple login/logout functionality
- Implement session management

### Configuration-Based Account Management

1. **Create Users Configuration File**:
   ```bash
   mkdir -p config
   touch config/users.yml
   ```
   
   Example `users.yml` structure:
   ```yaml
   users:
     - username: admin
       role: admin
       email: admin@example.com
       active: true
     - username: user1
       role: user
       email: user1@example.com
       active: true
     - username: user2
       role: user
       email: user2@example.com
       active: false
   ```

2. **Database Schema Updates**:
   We need to modify our database schema to:
   - Add users table
   - Add user ID to tasks and categories
   - Add sessions table for authentication
   
   Schema modifications:
   ```sql
   -- Users table
   CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT UNIQUE NOT NULL,
     password_hash TEXT,
     email TEXT,
     role TEXT NOT NULL DEFAULT 'user',
     active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     last_login TEXT
   );
   
   -- Update tasks table
   ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id);
   
   -- Update categories table
   ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id);
   
   -- Sessions table
   CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     expires TEXT NOT NULL,
     data TEXT,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   ```

3. **Authentication API Routes**:
   Create the following API routes:
   - `/api/auth/login` - Login with username/password
   - `/api/auth/logout` - End user session
   - `/api/auth/session` - Get current session info
   - `/api/auth/set-password` - Set initial password

4. **Auth Middleware**:
   Create middleware to check authentication for protected routes
   
5. **Config File Loader**:
   Create a service to load and manage the users configuration file

6. **UI Components**:
   - Login form
   - Password setup form
   - Session management

### Implementation Steps

1. **Update Database Schema**
   - Modify the database schema in both `db.ts` and `connection.js`
   - Create migration functions to update existing databases

2. **User Configuration Manager**
   - Create a service to load user configuration from YAML/JSON
   - Implement functions to synchronize with the database

3. **Authentication Services**
   - Implement password hashing with bcrypt
   - Create session management functions
   - Add auth middleware

4. **API Endpoints**
   - Create the authentication API endpoints
   - Update existing API routes to filter by user_id

5. **UI Components**
   - Add login page
   - Add password setup page
   - Update task management to work with authentication

6. **Testing**
   - Test with multiple user accounts
   - Verify data separation between users

7. **Documentation**
   - Update README
   - Document the configuration file format
   - Update self-hosting guide

### Security Considerations

1. **Password Storage**:
   - Store only password hashes using bcrypt
   - Implement password strength requirements

2. **Session Management**:
   - Use secure cookies for session storage
   - Implement session expiration
   - Provide session renewal

3. **Rate Limiting**:
   - Implement rate limiting for login attempts
   - Add protection against brute force attacks

4. **Least Privilege**:
   - Ensure admin-only actions are properly protected

This implementation plan provides a straightforward approach to multi-user support while maintaining the simplicity of TaskWise's architecture and avoiding the need for a complex admin UI.

## 8. Future Enhancements

1. **User-defined importance**
   - Allow option to manually set importance to influence priority score (1-10 scale)

2. **User Authentication**:
   - Implement authentication using NextAuth.js

3. **Mobile Optimization**:
   - Ensure the UI works well on mobile devices

4. **Advanced AI Features**:
   - Task scheduling suggestions
   - Time estimation for tasks
   - Task dependency tracking

5. **Integration with Calendar Apps**:
   - Allow syncing with Google Calendar or other calendar services

6. **Progressive Web App (PWA)**:
   - Configure for offline use as a PWA

7. **Kanban-Style UI (Optional)**:
   - Implement a multi-column layout (similar to Trello or TickTick) where columns could represent categories, statuses, or custom groupings.
   - Use a library like `@dnd-kit` to enable drag-and-drop functionality for tasks between columns and for reordering within columns.
   - Restructure state to manage columns and the tasks within them.
   - Implement column creation and potentially column resizing.

This implementation guide provides a comprehensive roadmap for developing and deploying the TaskWise application on Vercel, leveraging the power of Next.js, Genkit AI, and Vercel's infrastructure.