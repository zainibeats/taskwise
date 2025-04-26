# TaskWise Implementation and Deployment Guide

This guide outlines the detailed process for completing and deploying the TaskWise AI-powered todo list application on Vercel.

## 1. Project Setup and Configuration [✅ Done]

### Initial Setup

1. **Create a Next.js Project** [✅ Done]
   ```bash
   npx create-next-app@latest taskwise --typescript
   cd taskwise
   ```

2. **Install Dependencies** [✅ Done]
   ```bash
   npm install genkit date-fns better-sqlite3
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Set Up Shadcn UI** [✅ Done]
   ```bash
   npx shadcn-ui@latest init
   ```
   
4. **Configure Environment Variables** [✅ Done]
   Create a `.env.local` file:
   ```
   GENKIT_API_KEY=your_genkit_api_key
   ```

## 2. Application Structure [✅ Done]

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

## 3. AI Implementation [✅ Done]

### AI Instance Setup [✅ Done]

Create `src/ai/ai-instance.ts`:
```typescript
'use server';

import { createAI } from 'genkit';

export const ai = createAI({
  apiKey: process.env.GENKIT_API_KEY,
});
```

### Task Prioritization Algorithm [✅ Done]

The task prioritization flow in [`src/ai/flows/prioritize-task.ts`](file:///C:/Users/dontb/Documents/repos/to-do-ai/src/ai/flows/prioritize-task.ts) calculates priorities based on:

1. Days until deadline
2. Category-specific urgency ratios

The prioritization algorithm will be refined to:
- Calculate a base priority from importance.
- Modulate the impact of the deadline based on the task category, preventing less important categories (e.g., "Personal") from receiving excessively high priorities simply due to imminent deadlines.
- Ensure scores remain within the 1-100 range, providing a meaningful distribution even for tasks due soon.

*Status: [✅ Done]*

### Subtask Generation [✅ Done]

Implement the subtask suggestion flow in [`src/ai/flows/suggest-subtasks.ts`](to-do-ai/src/ai/flows/suggest-subtasks.ts) to:
- Take a task description as input
- Use AI to generate relevant subtasks that help complete the main task
- Return an array of subtask descriptions

*Status: [✅ Done]*

### Task Categorization [✅ Done]

Implement the automatic categorization flow in `src/ai/flows/categorize-task.ts`:

*Status: [✅ Done]*

## 4. User Interface Implementation [✅ Done]

### Task Form Component [✅ Done]

Create a form component that:
- Accepts task title, description, deadline, and importance
- Uses AI to suggest a category
- Submits the task to be prioritized and stored

*Status: [✅ Done]*

### Task List and Item Components [✅ Done]

Implement components to:
- Display tasks sorted by priority
- Show deadline, importance, category, and priority score
- Provide options to edit, complete, or delete tasks
- Expand to show subtasks

*Status: `task-item.tsx` [✅ Created], `task-list.tsx` [✅ Created]. `subtask-list.tsx` and subtask regeneration [🚧 To Do].*

## 5. Database Setup [✅ Done]

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

### Client Hooks [✅ Done]

To interact with the API from the frontend, custom React hooks are provided:

- `useTasks` - Hook for task-related operations
- `useCategories` - Hook for category-related operations

These hooks handle API communication and local state management, making it easy to integrate with UI components.

### Docker Configuration for Persistent Data [✅ Done]

The Docker configuration has been updated to properly support SQLite and ensure data persistence:

```dockerfile
FROM node:18-alpine

# Install dependencies required for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 777 /app/data

# Create a directory for logs
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Copy package files first to leverage Docker caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose both app port and database service port
EXPOSE 3000 3100

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:3100

# Add volume for persistent data
VOLUME ["/app/data"]

# Start both the database service and the Next.js application
CMD ["sh", "-c", "node db/connection.js & npm start"]
```

This Docker configuration:
- Installs dependencies required for SQLite
- Creates data and logs directories with appropriate permissions
- Exposes both the application port (3000) and database service port (3100)
- Sets environment variables for production mode
- Mounts volumes to ensure database persistence across container restarts
- Starts both the database service and the Next.js application
- Optimizes the build process with layer caching

The docker-compose.yml file has been similarly updated:

```yaml
services:
  taskwise:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "3100:3100"
    environment:
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:3100
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

## 6. Development Mode Database Persistence [🚧 To Do]

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

## 7. Server Actions [🚧 To Do]

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

## 8. Testing

1. **Unit Tests**:
   ```bash
   npm install -D jest @testing-library/react @testing-library/jest-dom
   ```

2. **Test AI Functions**:
   Create mock tests for AI functions to ensure they return expected outputs.

3. **Test UI Components**:
   Test key components like task creation form and task list.

## 9. Deployment to Vercel

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

## 10. Post-Deployment Tasks

1. **Set Up Analytics**:
   - Implement Vercel Analytics to track usage patterns

2. **Performance Optimization**:
   - Use the Next.js built-in performance analysis tools
   - Implement caching for AI requests to reduce API usage

## 11. Future Enhancements

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