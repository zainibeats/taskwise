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

## 4. Server Actions [🚧 To Do - Future]

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

## 5A. Deployment to Vercel [🚧 To Do - Future]

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

## 5B. Docker Deployment [✅ Done]

For self-hosting, Docker provides the most reliable deployment method:

1. **Docker Configuration**:
   - A Dockerfile has been created using Node.js 20 (alpine version) with fallback to Node.js 18 for environments with compatibility issues
   - Docker Compose configuration includes:
     - Proper environment variable passing
     - Volume mounting for data persistence
     - Port exposure (9002 for web UI, 3100 for database API)
     - Memory allocation settings (2GB recommended)

2. **Key Implementation Decisions**:
   - Using Node.js 20 by default, with Node.js 18 as fallback for bcrypt compatibility issues in some environments
   - Including necessary build tools for native modules
   - Proper handling of cross-origin issues with API URL configuration
   - Creating a .dockerignore file to optimize build context

3. **Deployment Steps**:
   ```bash
   # Configure docker-compose.yml with server's IP
   # Replace http://localhost:3100 with http://YOUR_SERVER_IP:3100
   
   # Start the application
   docker-compose up -d
   
   # Create admin user
   docker-compose exec taskwise npm run create-admin
   ```

4. **Troubleshooting**:
   - Node.js version compatibility issues are documented (use Node.js 18 if Node.js 20 fails)
   - Build-time vs. runtime environment differences are handled
   - Memory allocation requirements are documented

See the [Self-Hosting Guide](self-hosting-guide.md) for comprehensive Docker deployment instructions.

## 6. User Authentication Implementation [✅ Partially Complete]

User authentication has been implemented with the following features:

### Completed ✅
- Database schema updates for users, sessions, and user-specific data
- Configuration-based account management with `config/users.yml`
- Authentication API routes for login, logout, and session management
- User-specific tasks and categories in the SQLite database
- Password hashing with bcrypt
- Session management with secure cookies
- Admin UI for user management

## 8. Button and UI Styling [✅ Done]

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

## 9. Future Enhancements [🚧 To Do]

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