# TaskWise: AI-Powered Todo List Application

TaskWise is an intelligent todo list application that uses AI to help you manage your tasks more effectively. The application prioritizes your tasks, suggests subtasks, and categorizes items automatically to streamline your productivity workflow.

## ✨ Features

- **AI Task Prioritization**: Automatically calculates priority scores based on deadlines, importance, and category
- **Smart Categorization**: Automatically categorizes tasks based on content
- **Subtask Suggestions**: AI generates relevant subtasks to help break down complex tasks
- **Task Management**: Create, edit, complete, and delete tasks with an intuitive interface
- **Cross-Device Sync**: Access your tasks from any device by connecting to your self-hosted server

## 🛠️ Technology Stack

- [Next.js](https://nextjs.org/) - React framework for building the UI
- [Genkit](https://genkit.ai/) with [Google Gemini API](https://ai.google.dev/gemini-api) - AI framework for task prioritization and subtask generation
- [Shadcn UI](https://ui.shadcn.com/) - Component library for the user interface
- [date-fns](https://date-fns.org/) - Date manipulation library
- [SQLite](https://www.sqlite.org/) - Lightweight database for task storage

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or newer
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/zainibeats/taskwise
   cd taskwise
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file with your configuration:
   ```
   # Required
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   
   # Optional - defaults shown below
   NODE_ENV=development
   PORT=9002
   DB_SERVER_PORT=3100
   NEXT_PUBLIC_API_URL=http://localhost:3100
   ```
   (You can obtain a Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey) - they offer a free tier with 60 queries per minute)

4. Run the development server with database support:
   ```bash
   # Run both database service and Next.js in one command
   npm run dev:with-db
   
   # Or run them separately
   npm run db:start   # In one terminal
   npm run dev        # In another terminal
   ```

5. Open [http://localhost:9002](http://localhost:9002) in your browser to see the application.

## 🔒 Data Storage Approach

TaskWise now uses SQLite for task persistence, which means:

- **Self-Hosted**: All your task data remains on your server, not in the browser
- **Cross-Device Sync**: Access your tasks from any device by connecting to your self-hosted instance
- **Data Persistence**: Your data is safely stored in a SQLite database file on your server
- **Simple Setup**: No complex database configuration required - SQLite works out of the box

The SQLite database is stored in the `data/taskwise.db` file in your project directory.

## 🏠 Self-Hosting Guide

### For Personal Use (Simplest)

1. Follow the installation steps above
2. Build the application for production:
   ```bash
   npm run build
   # or
   yarn build
   ```
3. Start the production server:
   ```bash
   npm start
   # or
   yarn start
   ```

### For Team/Organization Deployment

1. Fork the repository on GitHub
2. Deploy to Vercel, Netlify, or any static hosting service that supports Next.js
3. Set the `GOOGLE_AI_API_KEY` environment variable in your hosting provider's settings

### Docker Deployment (Recommended)

#### Using Dockerfile

A `Dockerfile` is included for building a Docker image:

```dockerfile
FROM node:18-alpine

# Install dependencies required for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data /app/logs && chmod 777 /app/data /app/logs

COPY . .
RUN npm install
RUN npm run build

# Expose both app and DB service ports
EXPOSE 3000 3100

# Start both the database service and Next.js app
CMD ["sh", "-c", "node db/connection.js & npm start"]
```

Build and run with:
```bash
docker build -t taskwise .
docker run -p 3000:3000 -p 3100:3100 -e GOOGLE_AI_API_KEY=your_key_here -v ./data:/app/data taskwise
```

> **Note**: The `-v ./data:/app/data` flag creates a volume to persist your database outside the container.

#### Using Docker Compose

For a more streamlined setup, use the provided `docker-compose.yml`:

```powershell
# Set your Google AI API key in the environment (Windows PowerShell)
$env:GOOGLE_AI_API_KEY="your_key_here"

# Start the application
docker-compose up -d

# To stop the application
docker-compose down
```

For bash/Linux/macOS:
```bash
# Set your Google AI API key in the environment
export GOOGLE_AI_API_KEY=your_key_here

# Start the application
docker-compose up -d
```

This method automatically handles:
- Environment variables (Google AI API key)
- Port mapping (3000 for web app, 3100 for database service)
- Volume mounting for data persistence
- Container lifecycle management
- Starting both the database service and web application

## 🧠 AI Features Explained

### Task Prioritization

Tasks are prioritized based on:
- Deadline proximity
- Task category. The AI considers the category context when evaluating the urgency implied by the deadline, aiming for a balanced priority score even for near-term tasks.

### Category-Specific Urgency Ratios

Different task categories have different urgency multipliers:
- Health: 1.5
- Finance: 1.3
- Work: 1.2
- Personal: 1.0
- Errands: 0.9
- Other: 0.8

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
