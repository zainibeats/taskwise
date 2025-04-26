# TaskWise Database Service

This directory contains a standalone database service that provides persistent data storage for the TaskWise application during development. This solution addresses the data persistence issues caused by Next.js hot reloading.

## Why a Separate Database Service?

In development mode (`npm run dev`), Next.js employs Hot Module Replacement (HMR) which frequently refreshes and reloads modules as you make code changes. This causes issues with our SQLite singleton connection, resulting in:

1. Database connection resets with each reload
2. Loss of data persistence across reloads
3. Inconsistent behavior between development and production

The database service solves these issues by running SQLite in a separate Node.js process, outside the Next.js application lifecycle.

## Running the Database Service

There are two ways to use the database service:

### Option 1: Run Together with Next.js (Recommended)

Use the combined development script that starts both the database service and the Next.js development server:

```bash
npm run dev:with-db
```

This uses `concurrently` to start both processes in parallel.

### Option 2: Run Separately

Start the database service in one terminal:

```bash
npm run db:start
```

Then start the Next.js development server in another terminal:

```bash
npm run dev
```

## Database Service Implementation

The database service:

1. Creates a SQLite database file in the `data/` directory
2. Initializes the database tables if they don't exist
3. Starts an HTTP server on port 3100 that provides a REST API for task and category operations
4. Handles all database operations outside the Next.js application lifecycle
5. Provides the same API endpoints as the Next.js API routes

## API Endpoints

The database service provides the following API endpoints:

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `PATCH /api/tasks/:id` - Toggle task completion

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create or update a category
- `DELETE /api/categories?name=categoryName` - Delete a category

## Production Use

In production, the TaskWise application uses the direct SQLite connection method (not this service), as module reloading isn't an issue in production mode. The application automatically detects whether it's running in development or production mode and adjusts accordingly. 