# TaskWise: AI-Powered Todo List Application

TaskWise is an intelligent todo list application that uses AI to help you manage your tasks more effectively. The application prioritizes your tasks, suggests subtasks, and categorizes items automatically to streamline your productivity workflow.

## ✨ Features

- **AI Task Prioritization**: Automatically calculates priority scores based on deadlines, importance, and category
- **Smart Categorization**: Automatically categorizes tasks based on content
- **Subtask Suggestions**: AI generates relevant subtasks to help break down complex tasks
- **Task Management**: Create, edit, complete, and delete tasks with an intuitive interface
- **Toast Notifications**: Get feedback on actions with elegant toast notifications

## 🛠️ Technology Stack

- [Next.js](https://nextjs.org/) - React framework for building the UI
- [Genkit AI](https://genkit.ai/) - AI library for task prioritization and subtask generation
- [Shadcn UI](https://ui.shadcn.com/) - Component library for the user interface
- [date-fns](https://date-fns.org/) - Date manipulation library

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or newer
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/taskwise.git
   cd taskwise
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file with your Genkit API key:
   ```
   GENKIT_API_KEY=your_genkit_api_key
   ```
   (You can obtain a Genkit API key from [genkit.ai](https://genkit.ai))

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🔒 Privacy-First Approach

TaskWise uses browser localStorage for task persistence, which means:

- **Data Privacy**: All your task data remains on your device and is never sent to a server
- **No Database Required**: Self-hosting is simple with no database configuration
- **Offline Capability**: The app works even when offline (after initial load)

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
3. Set the `GENKIT_API_KEY` environment variable in your hosting provider's settings

### Docker Deployment (Optional)

Bring your own Docker setup with a `Dockerfile` like:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run with:
```bash
docker build -t taskwise .
docker run -p 3000:3000 -e GENKIT_API_KEY=your_key_here taskwise
```

## 💾 Data Storage

TaskWise uses browser localStorage for persisting:
- Tasks and subtasks
- Custom categories and emoji icons
- Task priority calculations

This approach prioritizes user privacy while ensuring your data remains accessible across browser sessions. If you clear your browser data, your tasks will be reset, so consider periodic exports if needed.

## 🧠 AI Features Explained

### Task Prioritization

Tasks are prioritized based on:
- Deadline proximity
- User-defined importance (1-10)
- Task category. The AI considers the category context when evaluating the urgency implied by the deadline, aiming for a balanced priority score even for near-term tasks.

### Category-Specific Urgency Ratios

Different task categories have different urgency multipliers:
- Health: 1.5
- Finance: 1.3
- Work: 1.2
- Personal: 1.0
- Errands: 0.9
- Other: 0.8

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Next.js team for the wonderful framework
- Genkit AI for the AI capabilities
- Shadcn UI for the beautiful components