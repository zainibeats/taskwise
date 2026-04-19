# Multi-LLM Provider Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add env-var-driven support for LM Studio, Ollama, OpenAI, and Anthropic alongside the existing Google AI integration.

**Architecture:** A new `src/ai/providers.ts` module reads `AI_PROVIDER` from env and exposes two exports: `generateText(prompt, userId?)` and `extractJSON(text)`. The three existing AI flows replace their Genkit internals with these two helpers, keeping all fallback logic intact. Genkit stays installed but is only used on the `google_ai` path.

**Tech Stack:** Next.js 15, TypeScript, Genkit (Google AI only), `openai` npm package (LM Studio / Ollama / OpenAI), `@anthropic-ai/sdk` (Anthropic), `vitest` (tests), `zod` (schema types, already installed)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/ai/providers.ts` | Provider switchboard + JSON extraction helper |
| Create | `src/ai/__tests__/providers.test.ts` | Unit tests for providers.ts |
| Modify | `src/ai/flows/categorize-task.ts` | Replace Genkit internals with generateText |
| Modify | `src/ai/flows/prioritize-task.ts` | Replace Genkit internals with generateText |
| Modify | `src/ai/flows/suggest-subtasks.ts` | Replace Genkit internals with generateText |
| Modify | `.env.example` | Document all new env vars |
| Modify | `package.json` | Add openai, @anthropic-ai/sdk, vitest |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install openai @anthropic-ai/sdk
npm install -D vitest
```

- [ ] **Step 2: Add test script to package.json**

Open `package.json` and add `"test": "vitest run"` to the `scripts` block:

```json
"scripts": {
  "dev": "next dev -p 9002",
  "docker:build": "docker-compose build",
  "docker:start": "docker-compose up -d",
  "docker:stop": "docker-compose down",
  "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
  "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "sync-users": "node scripts/sync-users.js",
  "create-admin": "node scripts/create-admin.js"
}
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Verify install succeeded**

```bash
npm run test -- --reporter=verbose 2>&1 | head -5
```

Expected: "No test files found" or similar (no errors about missing packages).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add openai, anthropic sdk, and vitest"
```

---

## Task 2: Create providers.ts (TDD)

**Files:**
- Create: `src/ai/providers.ts`
- Create: `src/ai/__tests__/providers.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/ai/__tests__/providers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractJSON } from '../providers';

// extractJSON tests — pure function, no mocks needed
describe('extractJSON', () => {
  it('parses plain JSON object', () => {
    const result = extractJSON('{"category": "Work"}') as { category: string };
    expect(result.category).toBe('Work');
  });

  it('parses JSON wrapped in markdown code block', () => {
    const result = extractJSON('```json\n{"category": "Health"}\n```') as { category: string };
    expect(result.category).toBe('Health');
  });

  it('parses JSON wrapped in code block without language tag', () => {
    const result = extractJSON('```\n{"subtasks": ["a", "b"]}\n```') as { subtasks: string[] };
    expect(result.subtasks).toEqual(['a', 'b']);
  });

  it('parses JSON embedded after prose text', () => {
    const result = extractJSON('Here is your category: {"category": "Finance"}') as { category: string };
    expect(result.category).toBe('Finance');
  });

  it('throws when no JSON structure found', () => {
    expect(() => extractJSON('Just plain text, no JSON here')).toThrow('No JSON found');
  });
});

// generateText error cases — needs env var control
describe('generateText — config errors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws for unknown AI_PROVIDER value', async () => {
    process.env.AI_PROVIDER = 'unknown_provider';
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('Unknown AI_PROVIDER');
  });

  it('throws when AI_PROVIDER=openai but OPENAI_API_KEY is missing', async () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('OPENAI_API_KEY');
  });

  it('throws when AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.ANTHROPIC_API_KEY;
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: `Cannot find module '../providers'` — confirms tests are wired up correctly.

- [ ] **Step 3: Create providers.ts**

Create `src/ai/providers.ts`:

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getServerAI } from './server-ai-instance';

/**
 * Extracts and parses the first JSON object or array from a model response.
 * Handles markdown code blocks and prose-wrapped JSON.
 */
export function extractJSON(text: string): unknown {
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = codeMatch ? codeMatch[1].trim() : text.trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) throw new Error(`No JSON found in response: ${cleaned.slice(0, 80)}`);
  return JSON.parse(cleaned.slice(start));
}

/**
 * Generates text using the configured AI provider.
 * Set AI_PROVIDER in your environment to switch providers.
 *
 * --- Adding a new provider ---
 * 1. Add a new case below
 * 2. For OpenAI-compatible APIs (Groq, Mistral, Together AI, Perplexity, etc.):
 *    reuse generateWithOpenAICompat — just change baseURL and apiKey env var
 * 3. Add the new env vars to .env.example
 */
export async function generateText(prompt: string, userId?: number): Promise<string> {
  const provider = process.env.AI_PROVIDER || 'google_ai';

  switch (provider) {
    case 'google_ai':
      return generateWithGoogleAI(prompt, userId);

    case 'lm_studio':
      return generateWithOpenAICompat(prompt, {
        baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
        apiKey: 'not-needed',
        model: process.env.LOCAL_LLM_MODEL || 'local-model',
      });

    case 'ollama':
      return generateWithOpenAICompat(prompt, {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'not-needed',
        model: process.env.LOCAL_LLM_MODEL || 'llama3.2',
      });

    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
      return generateWithOpenAICompat(prompt, {
        baseURL: 'https://api.openai.com/v1',
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      });
    }

    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
      return generateWithAnthropic(prompt, apiKey);
    }

    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Valid options: google_ai, lm_studio, ollama, openai, anthropic`
      );
  }
}

async function generateWithGoogleAI(prompt: string, userId?: number): Promise<string> {
  const ai = await getServerAI(userId);
  const response = await ai.generate(prompt);
  return response.text;
}

async function generateWithOpenAICompat(
  prompt: string,
  config: { baseURL: string; apiKey: string; model: string }
): Promise<string> {
  const client = new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey });
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content ?? '';
}

async function generateWithAnthropic(prompt: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
```

- [ ] **Step 4: Run tests — expect passes**

```bash
npm test
```

Expected: All 8 tests pass. If `generateText` import tests fail with module caching issues, run `npm test -- --no-cache`.

- [ ] **Step 5: Commit**

```bash
git add src/ai/providers.ts src/ai/__tests__/providers.test.ts
git commit -m "feat: add multi-provider AI abstraction (providers.ts)"
```

---

## Task 3: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace .env.example contents**

Replace the entire file with:

```bash
# ===========================================
# AI PROVIDER CONFIGURATION
# ===========================================
# Choose which AI provider to use.
# Valid values: google_ai | lm_studio | ollama | openai | anthropic
# Defaults to google_ai if not set.
AI_PROVIDER=google_ai

# --- Google AI (default) ---
# Get a free key at https://aistudio.google.com/app/apikey
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# --- LM Studio (local, free, no API key needed) ---
# Start LM Studio, go to Local Server tab, and click Start Server.
# Default port is 1234. Load any model before making requests.
# LM_STUDIO_BASE_URL=http://localhost:1234/v1
# LOCAL_LLM_MODEL=your-loaded-model-name

# --- Ollama (local, free, no API key needed) ---
# Install Ollama (ollama.ai) and run: ollama pull llama3.2
# OLLAMA_BASE_URL=http://localhost:11434/v1
# LOCAL_LLM_MODEL=llama3.2

# --- OpenAI ---
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini   # optional, defaults to gpt-4o-mini

# --- Anthropic ---
# ANTHROPIC_API_KEY=sk-ant-...

# ===========================================
# DEVELOPMENT ENVIRONMENT CONFIGURATION
# ===========================================
NODE_ENV=development
PORT=9002
DB_SERVER_PORT=3100
NEXT_PUBLIC_API_URL=http://localhost:3100
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example with all AI provider options"
```

---

## Task 4: Refactor categorize-task.ts

**Files:**
- Modify: `src/ai/flows/categorize-task.ts`

- [ ] **Step 1: Replace the file contents**

The full new file (keep the fallback logic, replace only the AI call):

```typescript
'use server';

import { z } from 'zod';
import { generateText, extractJSON } from '@/ai/providers';

const CategorizeTaskInputSchema = z.object({
  taskDescription: z.string(),
  categories: z.array(z.string()).optional(),
  categoriesString: z.string().optional(),
  userId: z.number().optional(),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string(),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  try {
    if (!input.taskDescription || input.taskDescription.trim() === '') {
      return { category: 'Other' };
    }

    const defaultCategories = ['Health', 'Finance', 'Work', 'Personal', 'Errands', 'Other'];
    const categories = input.categories?.join(', ') ?? defaultCategories.join(', ');

    const prompt = `You are a task categorization expert. Categorize the following task into exactly one of these categories: ${categories}.

Task: ${input.taskDescription}

Return ONLY valid JSON with no explanation: {"category": "CategoryName"}`;

    const raw = await generateText(prompt, input.userId);
    const parsed = extractJSON(raw) as { category: string };
    return { category: parsed.category };
  } catch (error) {
    console.error('Error in categorizeTask:', error);

    const defaultCategories = ['Health', 'Finance', 'Work', 'Personal', 'Errands', 'Other'];
    const availableCategories = input.categories ?? defaultCategories;
    const task = input.taskDescription.toLowerCase();

    const keywordMap: Record<string, string[]> = {
      health: ['health', 'doctor', 'medical', 'medicine', 'exercise', 'workout', 'gym', 'fitness', 'diet'],
      finance: ['finance', 'money', 'bank', 'pay', 'bill', 'budget', 'tax', 'invest', 'loan'],
      work: ['work', 'job', 'office', 'project', 'meeting', 'email', 'presentation', 'client', 'deadline', 'report'],
      personal: ['personal', 'home', 'family', 'friend', 'hobby', 'read', 'learn', 'study', 'relax'],
      errands: ['errand', 'shop', 'store', 'buy', 'pick up', 'groceries', 'mail', 'laundry', 'clean'],
    };

    for (const category of availableCategories) {
      const lc = category.toLowerCase();
      if (task.includes(lc)) return { category };
      const keywords = keywordMap[lc] ?? [];
      if (keywords.some(kw => task.includes(kw))) return { category };
    }

    return { category: availableCategories.includes('Other') ? 'Other' : availableCategories[0] };
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | grep -i "categorize\|providers\|error" | head -20
```

Expected: No errors referencing categorize-task.ts or providers.ts.

- [ ] **Step 3: Commit**

```bash
git add src/ai/flows/categorize-task.ts
git commit -m "refactor: categorize-task uses generateText provider abstraction"
```

---

## Task 5: Refactor prioritize-task.ts

**Files:**
- Modify: `src/ai/flows/prioritize-task.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
'use server';

import { z } from 'zod';
import { isPast, differenceInDays } from 'date-fns';
import { generateText, extractJSON } from '@/ai/providers';

const PrioritizeTaskInputSchema = z.object({
  task: z.string(),
  deadline: z.string(),
  importance: z.number(),
  category: z.string(),
  userId: z.number().optional(),
});
export type PrioritizeTaskInput = z.infer<typeof PrioritizeTaskInputSchema>;

const PrioritizeTaskOutputSchema = z.object({
  priorityScore: z.number(),
  reasoning: z.string(),
});
export type PrioritizeTaskOutput = z.infer<typeof PrioritizeTaskOutputSchema>;

export async function prioritizeTask(input: PrioritizeTaskInput): Promise<PrioritizeTaskOutput> {
  try {
    if (!input.task || input.task.trim() === '') {
      return { priorityScore: 50, reasoning: 'No task title provided.' };
    }

    const prompt = `You are a task prioritization expert. Assign a priority score from 1 to 100 (higher = more urgent) to this task.

Task: ${input.task}
Deadline: ${input.deadline}
Importance: ${input.importance}/10
Category: ${input.category}

Scoring guide:
- Closer deadlines = higher score
- Higher importance = higher score
- Category multipliers: Health 1.5x, Finance 1.3x, Work 1.2x, Personal 1.0x, Errands 0.9x, Other 0.8x

Return ONLY valid JSON with no explanation: {"priorityScore": <number 1-100>, "reasoning": "<one sentence>"}`;

    const raw = await generateText(prompt, input.userId);
    const parsed = extractJSON(raw) as { priorityScore: number; reasoning: string };
    return { priorityScore: parsed.priorityScore, reasoning: parsed.reasoning };
  } catch (error) {
    console.error('Error in prioritizeTask:', error);

    const getCategoryMultiplier = (category: string): number => {
      const lc = category.toLowerCase();
      if (lc.includes('health')) return 1.5;
      if (lc.includes('finance')) return 1.3;
      if (lc.includes('work')) return 1.2;
      if (lc.includes('personal')) return 1.0;
      if (lc.includes('errand')) return 0.9;
      return 0.8;
    };

    const deadline = new Date(input.deadline);

    if (isPast(deadline)) {
      return {
        priorityScore: 95,
        reasoning: 'Fallback: deadline has already passed.',
      };
    }

    const daysUntilDeadline = differenceInDays(deadline, new Date());
    const categoryMultiplier = getCategoryMultiplier(input.category);
    const deadlineScore = Math.max(10, 80 - daysUntilDeadline * 5);
    const importanceScore = input.importance * 2;
    const priorityScore = Math.max(1, Math.min(100, Math.round((deadlineScore + importanceScore) * categoryMultiplier)));

    return {
      priorityScore,
      reasoning: `Fallback: ${daysUntilDeadline} days until deadline, importance ${input.importance}/10, category "${input.category}" (${categoryMultiplier}x).`,
    };
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | grep -i "prioritize\|providers\|error" | head -20
```

Expected: No errors referencing prioritize-task.ts.

- [ ] **Step 3: Commit**

```bash
git add src/ai/flows/prioritize-task.ts
git commit -m "refactor: prioritize-task uses generateText provider abstraction"
```

---

## Task 6: Refactor suggest-subtasks.ts

**Files:**
- Modify: `src/ai/flows/suggest-subtasks.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
'use server';

import { z } from 'zod';
import { generateText, extractJSON } from '@/ai/providers';

const SuggestSubtasksInputSchema = z.object({
  taskDescription: z.string(),
  userId: z.number().optional(),
});
export type SuggestSubtasksInput = z.infer<typeof SuggestSubtasksInputSchema>;

const SuggestSubtasksOutputSchema = z.object({
  subtasks: z.array(z.string()),
});
export type SuggestSubtasksOutput = z.infer<typeof SuggestSubtasksOutputSchema>;

export async function suggestSubtasks(input: SuggestSubtasksInput): Promise<SuggestSubtasksOutput> {
  try {
    if (!input.taskDescription || input.taskDescription.trim() === '') {
      return { subtasks: ['Please provide a task description to generate subtasks.'] };
    }

    const prompt = `Suggest 2-3 high-level subtasks that break down this task into its key stages. Keep each subtask concise.

Task: ${input.taskDescription}

Return ONLY valid JSON with no explanation: {"subtasks": ["subtask 1", "subtask 2", "subtask 3"]}`;

    const raw = await generateText(prompt, input.userId);
    const parsed = extractJSON(raw) as { subtasks: string[] };
    return { subtasks: parsed.subtasks };
  } catch (error) {
    console.error('Error in suggestSubtasks:', error);

    let errorMessage = 'Failed to generate subtasks. ';
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        errorMessage += 'Your API key appears to be invalid. Please check settings.';
      } else if (error.message.includes('No valid API key')) {
        errorMessage += 'Please add a valid API key in settings.';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage += "Your API key doesn't have permission to use this service.";
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage += "You've exceeded your API quota.";
      } else {
        errorMessage += 'Please try again or check your provider configuration.';
      }
    }

    return { subtasks: [errorMessage] };
  }
}
```

- [ ] **Step 2: Run full typecheck**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: No errors. If you see errors about `z` from `genkit`, confirm all three flow files now import `z` from `'zod'`.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ai/flows/suggest-subtasks.ts
git commit -m "refactor: suggest-subtasks uses generateText provider abstraction"
```

---

## Task 7: Smoke test with LM Studio

This task verifies the full integration end-to-end using LM Studio.

**Prerequisites:**
- LM Studio installed on your machine
- At least one model downloaded in LM Studio

- [ ] **Step 1: Start LM Studio server**

In LM Studio: open the "Local Server" tab (the `<->` icon), load a model, and click **Start Server**. The default URL is `http://localhost:1234`.

- [ ] **Step 2: Copy .env and configure**

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```
AI_PROVIDER=lm_studio
LOCAL_LLM_MODEL=<name-of-your-loaded-model>
```

The model name must match exactly what LM Studio shows. You can verify available models:

```bash
curl http://localhost:1234/v1/models
```

Copy the `id` field from the response and use that as `LOCAL_LLM_MODEL`.

- [ ] **Step 3: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 4: Test AI features**

1. Open `http://localhost:9002` in your browser
2. Log in
3. Create a new task (e.g., "Schedule a dentist appointment")
4. Verify:
   - Task gets categorized (should be "Health")
   - Task gets a priority score
   - Subtask suggestions appear

If the task gets categorized as "Other" and shows fallback subtask text, check the terminal for error messages from LM Studio. Common issues:
- Model name mismatch → re-check `LOCAL_LLM_MODEL` matches `curl http://localhost:1234/v1/models`
- LM Studio server not running → start it in the LM Studio app
- Model not loaded → load a model in LM Studio before starting the server

- [ ] **Step 5: Verify fallback still works**

Stop LM Studio server. Create another task. The app should still work — categorization and prioritization use heuristic fallbacks, and subtasks show an error message instead of crashing.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete multi-LLM provider support via AI_PROVIDER env var"
```
