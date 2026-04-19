# Multi-LLM Provider Support Design

**Date:** 2026-04-19  
**Status:** Approved

## Overview

Add support for multiple AI providers alongside the existing Google AI (Gemini) integration. Provider selection is controlled by environment variables. Initial focus is LM Studio for free local inference, with OpenAI, Anthropic, and Ollama also supported. The design is intentionally open for future expansion.

Supported providers:
- `google_ai` — Google Gemini via Genkit (existing, default)
- `lm_studio` — LM Studio local server (OpenAI-compatible, no API key needed)
- `ollama` — Ollama local server (OpenAI-compatible, no API key needed)
- `openai` — OpenAI API
- `anthropic` — Anthropic API

## Architecture

A new file `src/ai/providers.ts` acts as the provider switchboard. It reads `AI_PROVIDER` from the environment and exports a single function:

```typescript
generateText(prompt: string, userId?: number): Promise<string>
```

The three existing AI flows (`categorize-task`, `prioritize-task`, `suggest-subtasks`) replace their internal Genkit calls with a call to `generateText`. No other files change.

Genkit remains in place only for the `google_ai` path, which already works correctly and has good error handling.

## Environment Variables

```
# Required: selects the active provider (defaults to google_ai)
AI_PROVIDER=google_ai

# Google AI (existing)
GOOGLE_AI_API_KEY=...

# OpenAI
OPENAI_API_KEY=...

# Anthropic
ANTHROPIC_API_KEY=...

# LM Studio (OpenAI-compatible, defaults shown)
LM_STUDIO_BASE_URL=http://localhost:1234/v1

# Ollama (OpenAI-compatible, defaults shown)
OLLAMA_BASE_URL=http://localhost:11434/v1

# Local model name — used by lm_studio and ollama
LOCAL_LLM_MODEL=llama3.2
```

## Components

### `src/ai/providers.ts` (new)

Reads `AI_PROVIDER` and returns appropriate provider. Contains a switch statement with a comment block marking where to add future providers.

Provider implementations:
- **google_ai**: calls existing `createServerAiInstance` (Genkit), passes `userId` for per-user API key lookup
- **lm_studio / ollama / openai**: uses `openai` npm package with provider-specific `baseURL` and `apiKey`. LM Studio and Ollama use `'not-needed'` as the API key placeholder since no auth is required
- **anthropic**: uses `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`

### `src/ai/flows/*.ts` (modified — 3 files)

Each flow already constructs a prompt string and parses a text response. Changes:
1. Remove Genkit `defineFlow` wrapper (not needed once bypassing Genkit)
2. Replace `ai.generate({ prompt })` with `await generateText(prompt, userId)`
3. Keep all existing fallback logic unchanged

### `.env.example` (modified)

Add all new env vars with inline comments explaining each provider's requirements.

## Data Flow

```
Task action (create/edit)
  → Flow function (categorize / prioritize / suggest-subtasks)
    → generateText(prompt, userId)
      → reads AI_PROVIDER env var
      → google_ai: createServerAiInstance() → ai.generate()
      → lm_studio/ollama/openai: openai.chat.completions.create()
      → anthropic: anthropic.messages.create()
    → returns string
  → Flow parses response, returns typed result
  → Falls back to heuristics if generateText throws
```

## Error Handling

- `providers.ts` throws a descriptive error if required config is missing (e.g., `"OPENAI_API_KEY is required when AI_PROVIDER=openai"`)
- If `AI_PROVIDER` is an unrecognised value, throws `"Unknown AI_PROVIDER: <value>"`
- All three flows already wrap AI calls in try/catch with fallback logic — a provider failure degrades gracefully without crashing the app
- LM Studio / Ollama errors surface as "server not reachable" style messages, guiding the user to ensure the local server is running

## New Dependencies

| Package | Used for |
|---------|----------|
| `openai` | LM Studio, Ollama, OpenAI (one package for all three) |
| `@anthropic-ai/sdk` | Anthropic |

## Expansion Notes

To add a new provider in future:
1. Add a new case to the switch in `src/ai/providers.ts`
2. Add relevant env vars to `.env.example`
3. For OpenAI-compatible APIs (Groq, Mistral, Together AI, etc.) — reuse the existing `openai` package path, just change `baseURL` and `apiKey`
4. For custom protocols — add the provider's SDK as a dependency and implement the case

Most modern LLM APIs (Groq, Mistral, Together AI, Perplexity) are OpenAI-compatible, so the `openai` package handles them with only a `baseURL` change.
