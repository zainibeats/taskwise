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
