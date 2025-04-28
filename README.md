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

## 🔒 User Authentication

TaskWise now includes a configuration-based user authentication system that:

- Allows for administrator-defined user accounts via a simple YAML configuration file
- Separates tasks and categories per user
- Securely stores passwords using bcrypt hashing
- Implements session-based authentication

### User Configuration

Users are defined in the `config/users.yml` file:

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
```

When you make changes to this file, run the sync script to update the database:

```bash
npm run sync-users
```

Users will be prompted to set their own password on first login.

## 🔒 Data Storage Approach

TaskWise now uses SQLite for task persistence, which means:

- **Self-Hosted**: All your task data remains on your server, not in the browser
- **Cross-Device Sync**: Access your tasks from any device by connecting to your self-hosted instance
- **Data Persistence**: Your data is safely stored in a SQLite database file on your server
- **Simple Setup**: No complex database configuration required - SQLite works out of the box
- **Fallback Mechanism**: If the database is temporarily unavailable, tasks fall back to localStorage

The SQLite database is stored in the `data/taskwise.db` file in your project directory.

## 🏠 Self-Hosting Guide

TaskWise can be self-hosted on your own server. For detailed instructions, see the [comprehensive self-hosting guide](docs/self-hosting-guide.md) which covers:

- Docker Compose setup (recommended)
- Direct Docker deployment
- Cross-device database access configuration
- Troubleshooting common issues
- Domain name setup
- Security considerations
- Data backup strategies

The most important thing to remember when self-hosting is to configure the `NEXT_PUBLIC_API_URL` with your server's actual IP address or hostname to ensure cross-device database access works properly.

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
