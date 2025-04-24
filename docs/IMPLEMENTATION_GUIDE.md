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
   npm install genkit date-fns
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
│   ├── page.tsx           # Main todo list page
│   ├── layout.tsx         # Root layout with providers
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Shadcn UI components
│   ├── task-form.tsx      # Form for creating new tasks
│   ├── task-list.tsx      # List of tasks with filtering
│   ├── task-item.tsx      # Individual task component
│   └── subtask-list.tsx   # List of subtasks
├── ai/
│   ├── ai-instance.ts     # Genkit AI instance setup
│   └── flows/
│       ├── prioritize-task.ts    # AI task prioritization
│       ├── suggest-subtasks.ts   # AI subtask suggestion
│       └── categorize-task.ts    # AI task categorization
├── lib/
│   ├── utils.ts           # Utility functions
│   └── db.ts              # Database access layer
└── types/
    └── index.ts           # TypeScript type definitions
```

## 3. AI Implementation [🚧 In Progress]

### AI Instance Setup

Create `src/ai/ai-instance.ts`: [✅ Done]

```typescript
'use server';

import { createAI } from 'genkit';

export const ai = createAI({
  apiKey: process.env.GENKIT_API_KEY,
});
```

### Task Prioritization Algorithm

The task prioritization flow in [`src/ai/flows/prioritize-task.ts`](file:///C:/Users/dontb/Documents/repos/to-do-ai/src/ai/flows/prioritize-task.ts) calculates priorities based on:

1. Days until deadline
2. Category-specific urgency ratios

The prioritization algorithm will be refined to:
- Calculate a base priority from importance.
- Modulate the impact of the deadline based on the task category, preventing less important categories (e.g., "Personal") from receiving excessively high priorities simply due to imminent deadlines.
- Ensure scores remain within the 1-100 range, providing a meaningful distribution even for tasks due soon.

*Status: [✅ Done]*

### Subtask Generation

Implement the subtask suggestion flow in [`src/ai/flows/suggest-subtasks.ts`](to-do-ai/src/ai/flows/suggest-subtasks.ts) to:
- Take a task description as input
- Use AI to generate relevant subtasks that help complete the main task
- Return an array of subtask descriptions

*Status: [✅ Done]*

### Task Categorization

Implement the automatic categorization flow in `src/ai/flows/categorize-task.ts`:

*Status: [✅ Done]*


## 4. User Interface Implementation [🚧 In Progress]

### Main Page

Implement the main todo list page in `src/app/page.tsx` with:
- Task creation form
- Task list with sorting and filtering options
- Task completion functionality

*Status: [🚧 Partially Implemented]*

### Task Form Component

Create a form component that:
- Accepts task title, description, deadline, and importance
- Uses AI to suggest a category
- Submits the task to be prioritized and stored

*Status: [✅ Done]*

### Task List and Item Components

Implement components to:
- Display tasks sorted by priority
- Show deadline, importance, category, and priority score
- Provide options to edit, complete, or delete tasks
- Expand to show subtasks

*Status: `task-item.tsx` [✅ Created], `task-list.tsx` [✅ Created]. `subtask-list.tsx` and subtask regeneration [🚧 To Do].*

## 5. Database Setup [🚧 In Progress]

### Local Storage Implementation [✅ Done]

For data persistence, TaskWise uses browser localStorage, providing several benefits:

1. **Privacy**: All user data stays on their device, not on a server
2. **Simplicity**: No database setup required for self-hosting
3. **Offline Use**: Application remains functional without internet connection

The implementation is in `src/lib/storage.ts` and provides the following functionality:

```typescript
// Key localStorage functions
getStoredTasks(): Task[] | null        // Retrieve tasks from storage
saveTasks(tasks: Task[]): boolean      // Save tasks to storage
getStoredCategoryIcons(): object | null // Retrieve categories and icons
saveCategoryIcons(icons: object): boolean // Save categories and icons
clearAllData(): boolean                // Clear all application data
```

### Future Database Support [🚧 To Do]

If server-side persistence is desired in the future, the storage layer is designed to be extensible. Options to consider:

1. **Vercel Postgres**: For deployment to Vercel
   ```bash
   npm install @vercel/postgres
   ```
2. **SQLite**: For local development or simple self-hosting
   ```bash
   npm install better-sqlite3
     title TEXT NOT NULL,
     description TEXT,
     deadline DATE,
     importance INTEGER CHECK (importance BETWEEN 1 AND 10),
     category TEXT,
     priority_score DECIMAL,
     is_completed BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE subtasks (
     id SERIAL PRIMARY KEY,
     task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
     description TEXT NOT NULL,
     is_completed BOOLEAN DEFAULT FALSE
   );
   ```

## 6. Server Actions [🚧 To Do]

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

## 7. Testing

1. **Unit Tests**:
   ```bash
   npm install -D jest @testing-library/react @testing-library/jest-dom
   ```

2. **Test AI Functions**:
   Create mock tests for AI functions to ensure they return expected outputs.

3. **Test UI Components**:
   Test key components like task creation form and task list.

## 8. Deployment to Vercel

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

## 9. Post-Deployment Tasks

1. **Set Up Analytics**:
   - Implement Vercel Analytics to track usage patterns

2. **Performance Optimization**:
   - Use the Next.js built-in performance analysis tools
   - Implement caching for AI requests to reduce API usage

## 10. Future Enhancements


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