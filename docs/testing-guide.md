# TaskWise Testing Guide

This guide explains how to run a fully functional TaskWise instance for human testing without installing Node.js or npm on your host machine. Everything runs inside Docker — including the build step.

## Prerequisites

- Docker and Docker Compose installed on your machine
- A local LLM server running on the host (recommended: LM Studio) **or** a cloud API key

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/zainibeats/taskwise
cd taskwise
```

### 2. Create your test environment file

```bash
cp .env.test .env.test.local
```

Open `.env.test.local` in a text editor. The defaults are pre-configured for LM Studio, so if that is your AI provider you only need to verify the `LM_STUDIO_BASE_URL` value (see [AI Provider Configuration](#ai-provider-configuration) below).

### 3. Start the test environment

```bash
docker compose -f docker-compose.test.yml --env-file .env.test.local up --build
```

The first run takes several minutes — Docker installs all dependencies and compiles the Next.js application inside the container. Subsequent starts are fast because Docker caches the build layers.

### 4. Open the application

Navigate to `http://localhost:9002` in your browser.

---

## AI Provider Configuration

The test environment is pre-set to `AI_PROVIDER=lm_studio`. Edit `.env.test.local` to switch providers.

### LM Studio (recommended — local, free)

1. Download and open [LM Studio](https://lmstudio.ai)
2. Load any model from the discovery tab
3. Click **Local Server** in the left sidebar and press **Start Server**
4. The server defaults to port `1234`

**Linux:**
```env
AI_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://localhost:1234/v1
```

**Mac / Windows:**
Docker cannot reach the host via `localhost` on these platforms. Use the special hostname Docker provides instead:
```env
AI_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
```

LM Studio's OpenAI-compatible endpoint supports structured JSON output, which makes it the most reliable local option for TaskWise's AI flows.

---

### Ollama (alternative local option)

1. Install and start [Ollama](https://ollama.com)
2. Pull a model: `ollama pull llama3.2`

**Linux:**
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama3.2
```

**Mac / Windows:**
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
LOCAL_LLM_MODEL=llama3.2
```

---

### Cloud providers

If you prefer a cloud model, set the relevant key in `.env.test.local`:

| Provider | Variables required |
|---|---|
| Google AI | `AI_PROVIDER=google_ai`, `GOOGLE_AI_API_KEY` |
| OpenAI | `AI_PROVIDER=openai`, `OPENAI_API_KEY`, optionally `OPENAI_MODEL` |
| Anthropic | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` |

Cloud providers do not require any local server setup and work identically on Linux, Mac, and Windows.

---

## What the Test Environment Does Differently

| | Production (`docker-compose.yml`) | Test (`docker-compose.test.yml`) |
|---|---|---|
| Env file | `.env` | `.env.test.local` |
| Data volumes | `taskwise-data`, `taskwise-logs` | `taskwise-test-data`, `taskwise-test-logs` |
| Container name | `taskwise` | `taskwise-test` |

The test environment uses separate named volumes so it never touches your production data. You can run both environments simultaneously without conflict.

---

## Stopping and Cleaning Up

Stop the container:
```bash
docker compose -f docker-compose.test.yml down
```

Remove the container **and** its data volumes (full reset):
```bash
docker compose -f docker-compose.test.yml down -v
```

---

## Troubleshooting

### The app starts but AI features do not work

- Confirm your AI provider's server is running before starting the container.
- On Mac/Windows, ensure you used `host.docker.internal` instead of `localhost` in the base URL.
- Check the container logs for connection errors:
  ```bash
  docker logs taskwise-test
  ```

### Build fails with bcrypt or SQLite errors

Docker needs at least 2 GB of memory allocated to compile native modules.

- **Docker Desktop:** Settings → Resources → Memory → set to 2 GB or more
- Try a clean build if the layer cache is stale:
  ```bash
  docker compose -f docker-compose.test.yml build --no-cache
  ```

### Port 9002 is already in use

Another process (or the production container) is using port 9002. Stop the conflicting process or container, then retry. Both test and production containers share the host network, so they cannot run simultaneously on the same port.
