# TaskWise

> **This project is AI-generated and not intended for production use.** It is a personal experiment with no guarantees around security, stability, or maintenance. Use it locally or for hobbyist purposes only.

A self-hosted, single-user to-do app with AI-assisted prioritization, categorization, and subtask suggestions. No account setup required.

## Getting Started

### With Node.js

```bash
git clone https://github.com/zainibeats/taskwise
cd taskwise
npm install
cp .env.example .env
# Edit .env with your AI provider settings
npm run dev
```

Open [http://localhost:9002](http://localhost:9002).

### With Docker (no npm required)

```bash
git clone https://github.com/zainibeats/taskwise
cd taskwise
cp .env.example .env
# Edit .env with your AI provider settings
docker-compose up -d
```

Open [http://localhost:9002](http://localhost:9002).

See [docs/self-hosting-guide.md](docs/self-hosting-guide.md) for cross-device access, backups, and troubleshooting.

## Testing Without npm or Node.js

```bash
cp .env.test .env.test.local
# Edit .env.test.local (LM Studio is pre-configured as the default)
docker compose -f docker-compose.test.yml --env-file .env.test.local up --build
```

See [docs/testing-guide.md](docs/testing-guide.md) for full setup instructions.

## AI Providers

Set `AI_PROVIDER` in your `.env` file. Defaults to `google_ai`.

AI features are optional. The app works without a provider configured, but tasks will not be auto-categorized or prioritized.

### Google AI (default, free tier available)

```env
AI_PROVIDER=google_ai
GOOGLE_AI_API_KEY=your_key_here
```

Get a key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Anthropic

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

### LM Studio (local, free)

Start LM Studio, load a model, and enable the local server (default port 1234).

```env
AI_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=your-loaded-model-name
```

### Ollama (local, free)

```bash
ollama pull llama3.2
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama3.2
```

## Password Protection

By default the app is open. To set a password:

```bash
curl -X POST http://localhost:9002/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"password":"yourpassword"}'
```

To change it:

```bash
curl -X POST http://localhost:9002/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{"password":"newpassword","currentPassword":"oldpassword"}'
```

Sessions expire after 24 hours.

## Data

All data is stored locally in `data/taskwise.db`. Back up by copying the `data/` directory. Nothing is sent externally except AI API calls.

## License

MIT. See LICENSE for details.
