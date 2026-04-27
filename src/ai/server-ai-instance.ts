'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const fixApiKeyFormat = (apiKey: string): string => {
  if (!apiKey.startsWith('AI') && apiKey.includes('AI')) {
    const match = apiKey.match(/AI[a-zA-Z0-9_-]+/);
    if (match && match[0]) {
      return match[0];
    }
  }

  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    return apiKey.substring(1, apiKey.length - 1);
  }

  return apiKey.trim();
};

export const createServerAiInstance = async () => {
  let apiKey = process.env.GOOGLE_AI_API_KEY || '';

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set. AI features will not work.');
  }

  apiKey = fixApiKeyFormat(apiKey);

  if (!apiKey.startsWith('AI')) {
    console.warn('API key has an unusual format. Typical Google AI keys start with "AI".');
  }

  try {
    return genkit({
      promptDir: './prompts',
      plugins: [
        googleAI({
          apiKey,
        }),
      ],
      model: 'googleai/gemini-2.5-flash',
    });
  } catch (error) {
    throw new Error(`Failed to create AI instance: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getServerAI = async () => {
  return await createServerAiInstance();
};
