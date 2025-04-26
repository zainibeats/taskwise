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

In production, the application can use two approaches:

1. **Direct SQLite Connection**: When running in production mode without Docker, the application uses the direct SQLite connection method as module reloading isn't an issue.

2. **Database Service**: When running with Docker, both the database service and the Next.js application are started together, providing a consistent interface and better isolation.

## Docker Configuration

When running in Docker:

1. The database service is started automatically alongside the Next.js application using the command:
   ```
   sh -c "node db/connection.js & npm start"
   ```

2. Environment variables are configured in the Dockerfile and docker-compose.yml:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=http://localhost:3100
   ```

3. Both ports are exposed:
   - 3000: Next.js application
   - 3100: Database service

4. Data persistence is handled through Docker volumes:
   ```
   VOLUME ["/app/data"]
   ```

5. The Docker Compose configuration includes:
   ```yaml
   volumes:
     - ./data:/app/data
     - ./logs:/app/logs
   ```

This setup ensures that:
- The database is persistent across container restarts
- The application and database service work together seamlessly
- Logging information is available outside the container 