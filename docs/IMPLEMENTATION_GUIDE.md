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

TaskWise now uses a single storage approach:

1. **Primary Storage**: SQLite database through API endpoints for ALL data (tasks, categories, user settings, etc.)
   - No dependency on localStorage for any data storage
   - All user data is stored exclusively in the database
   - This ensures consistent data management across devices
   - Provides better security as sensitive data is stored server-side

The database endpoints include:
- Task management APIs
- Category management APIs
- User settings APIs for personalization
- Authentication APIs for session management

This database-only approach provides:
- True cross-device data synchronization
- Enhanced security for sensitive information
- Consistent data access patterns
- Clear data ownership model

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

## 5. Server Actions [🚧 To Do - Future]

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

## 7. User Authentication Implementation [✅ Partially Complete]

User authentication has been implemented with the following features:

### Completed ✅
- Database schema updates for users, sessions, and user-specific data
- Configuration-based account management with `config/users.yml`
- Authentication API routes for login, logout, and session management
- User-specific tasks and categories in the SQLite database
- Password hashing with bcrypt
- Session management with secure cookies

### Still To Do 🚧
- Admin UI for user management (see new section below)
- Additional testing with multiple user accounts
- Documentation updates for user management

## 8. Admin UI for User Management [🚧 To Do]

We need to create an admin interface for managing users:

### Requirements

1. **Admin Dashboard**
   - Create a protected route at `/admin` that only admin users can access
   - Display a list of all users with their status, role, and last login time
   - Provide options to add, edit, or deactivate users

2. **User Creation Form**
   - Form for admins to create new users with:
     - Username (required)
     - Email (required)
     - Role (admin/user)
     - Initial password or option to send setup email
     - Active status toggle

3. **User Edit Form**
   - Allow editing existing user details
   - Option to reset user password
   - Option to change user role or deactivate account

4. **API Endpoints**
   - Create API endpoints for the admin UI:
     - `GET /api/admin/users` - List all users
     - `POST /api/admin/users` - Create a new user
     - `PUT /api/admin/users/:id` - Update a user
     - `DELETE /api/admin/users/:id` - Delete or deactivate a user

5. **Authorization Middleware**
   - Ensure that only users with the admin role can access these endpoints
   - Add role-based access control to the existing auth middleware

### Implementation Steps

1. **Create Admin Layout and Components**
   - Create admin layout with sidebar navigation
   - Create user list component with table/card view
   - Create user form components for adding/editing

2. **Implement API Routes**
   - Create the necessary API endpoints under `/api/admin/`
   - Implement proper validation and error handling
   - Add admin-only authorization checks

3. **Develop Admin Dashboard Pages**
   - Create admin dashboard pages using the React components
   - Implement client-side data fetching and state management
   - Add proper feedback for successful operations

4. **Testing and Documentation**
   - Test the admin UI with different user roles
   - Update documentation with admin features
   - Create admin guide for user management

## 9. Button and UI Styling [✅ Done]

TaskWise uses consistent button styling across the application to provide a cohesive user experience:

### Button Style Categories

1. **Primary Action Buttons (`category-green-btn`)**
   - Primary action buttons (save, create, edit) use a cyan color theme
   - Hover and focus states highlight with Dracula Cyan (#8be9fd)
   - Implementation in `src/app/category-green.css`
   - Features:
     - Soft glow effect on hover
     - Color transitions for interaction feedback
     - Used for task creation, editing, and other primary actions

2. **Secondary/Cancel Buttons (`category-clear-btn`)**
   - Used for cancellation and secondary actions
   - Hover state uses destructive/red color for clear visual feedback
   - Implementation in `src/app/clear-selection.css`
   - Used for cancel operations, back buttons, and destructive actions

3. **Form Controls**
   - Select dropdowns, calendar controls, and other UI elements
   - Consistent styling with the button system
   - Custom styling for hover and focus states

### Implementation

The button styles are implemented using CSS classes that can be applied to any Button component:

```tsx
// Primary action button
<Button className="category-green-btn">Save</Button>

// Secondary/cancel button
<Button variant="outline" className="category-clear-btn">Cancel</Button>
```

These styles are also applied to selects and other UI controls:

```tsx
<Select>
  <SelectTrigger className="category-green-select">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

## 10. Future Enhancements [🚧 To Do]

1. **User-defined importance**
   - Allow option to manually set importance to influence priority score (1-10 scale)

2. **Mobile Optimization**:
   - Ensure the UI works well on mobile devices

3. **Advanced AI Features**:
   - Task scheduling suggestions
   - Time estimation for tasks
   - Task dependency tracking

4. **Integration with Calendar Apps**:
   - Allow syncing with Google Calendar or other calendar services

5. **Progressive Web App (PWA)**:
   - Configure for offline use as a PWA

6. **Kanban-Style UI (Optional)**:
   - Implement a multi-column layout (similar to Trello or TickTick) where columns could represent categories, statuses, or custom groupings.
   - Use a library like `@dnd-kit` to enable drag-and-drop functionality for tasks between columns and for reordering within columns.
   - Restructure state to manage columns and the tasks within them.
   - Implement column creation and potentially column resizing.

This implementation guide provides a comprehensive roadmap for developing and deploying the TaskWise application on Vercel, leveraging the power of Next.js, Genkit AI, and Vercel's infrastructure.