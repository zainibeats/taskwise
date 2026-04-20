# TaskWise: AI-Powered To-Do List Application

> **Note**: This project contains AI-generated code.

TaskWise is a minimal, single-user to-do list application that uses AI to help you manage tasks more effectively. It prioritizes tasks, suggests subtasks, and categorizes items automatically — with no account setup required.

## ✨ Features

- **AI Task Prioritization**: Automatically calculates priority scores based on deadlines, importance, and category
- **Smart Categorization**: Automatically categorizes tasks based on content
- **Subtask Suggestions**: AI generates relevant subtasks to help break down complex tasks
- **Task Management**: Create, edit, complete, and delete tasks with an intuitive interface
- **Custom Categories**: Add and customize your own task categories
- **Optional Password Protection**: Secure the app with a single password if self-hosting
- **Cross-Device Sync**: Access your tasks from any device by connecting to your self-hosted server

## 🛠️ Technology Stack

- [Next.js](https://nextjs.org/) - React framework for building the UI
- [Genkit](https://genkit.ai/) with [Google Gemini API](https://ai.google.dev/gemini-api) - AI framework (one of several supported providers)
- [Shadcn UI](https://ui.shadcn.com/) - Component library for the user interface
- [date-fns](https://date-fns.org/) - Date manipulation library
- [SQLite](https://www.sqlite.org/) - Lightweight database for task storage

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or newer
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
   ```

3. Create a `.env.local` file with your configuration:
   ```env
   # AI provider — see "AI Providers" section below
   AI_PROVIDER=google_ai
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here

   # Optional
   NODE_ENV=development
   PORT=9002
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:9002](http://localhost:9002) — the app loads directly, no login required.

## 🔒 Optional Password Protection

By default the app is open access — useful for local use. To add a password:

```bash
curl -X POST http://localhost:9002/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"password":"yourpassword"}'
```

Once set, visiting the app will redirect to a login page. To change the password, provide the current one:

```bash
curl -X POST http://localhost:9002/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"password":"newpassword","currentPassword":"oldpassword"}'
```

Password is stored as a bcrypt hash in the local SQLite database. Sessions expire after 24 hours.

## 🧠 AI Providers

Set `AI_PROVIDER` in your `.env.local` to choose a provider. Defaults to `google_ai`.

### Google AI (default)

Free tier available — 60 requests/minute.

```env
AI_PROVIDER=google_ai
GOOGLE_AI_API_KEY=your_key_here
```

Get a key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # optional, defaults to gpt-4o-mini
```

### Anthropic

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest   # optional
```

### LM Studio (local, free)

Run LM Studio, load a model, and start the local server (default port 1234).

```env
AI_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=your-loaded-model-name
```

### Ollama (local, free)

Install [Ollama](https://ollama.ai) and pull a model: `ollama pull llama3.2`

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama3.2
```

> AI features are optional — the app works fully without an API key, AI calls will simply fail silently and tasks will have no auto-categorization or priority scores.

## 🏠 Self-Hosting

### Docker (recommended)

```bash
git clone https://github.com/zainibeats/taskwise
cd taskwise

# Create .env with your AI key
echo "GOOGLE_AI_API_KEY=your_key_here" > .env

# Edit docker-compose.yml if deploying to a remote server:
# set NEXT_PUBLIC_API_URL to your server's IP or hostname

docker-compose up -d
```

For a detailed self-hosting guide (Docker Compose, cross-device access, backups, domain setup), see [docs/self-hosting-guide.md](docs/self-hosting-guide.md).

**Docker troubleshooting:**
- Allocate at least 2 GB of memory to Docker
- For native module errors, try rebuilding: `docker-compose build --no-cache taskwise`
- On Windows, use the PowerShell setup script: `.\scripts\setup-taskwise.ps1`

## 📊 AI Features Explained

### Task Prioritization

Priority scores are calculated from:
- Deadline proximity
- Task importance (1–10)
- Category urgency multiplier:

| Category | Multiplier |
|----------|-----------|
| Health   | 1.5 |
| Finance  | 1.3 |
| Work     | 1.2 |
| Personal | 1.0 |
| Errands  | 0.9 |
| Other    | 0.8 |

### Auto-Categorization

New tasks are automatically assigned to a category based on their title and description.

### Subtask Suggestions

When a task is created, the AI suggests relevant subtasks to help break the work into actionable steps.

## 📦 Data Storage

TaskWise uses SQLite stored at `data/taskwise.db` in the project directory.

- All data stays on your server — nothing is sent to external services except AI API calls
- No complex database setup required
- Back up by copying the `data/` directory

## 📝 License

This project is licensed under the MIT License — see the LICENSE file for details.
