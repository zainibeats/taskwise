'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import getDbConnection from '@/lib/db';

// Define types for database results
interface SettingRow {
  value: string;
  [key: string]: any;
}

// Function to get the API key from database or environment variable
const getApiKeyFromDb = async (): Promise<string> => {
  let apiKey = process.env.GOOGLE_AI_API_KEY || '';

  if (!apiKey) {
    console.warn('GOOGLE_AI_API_KEY environment variable is not set. AI features will only work with a stored API key.');
  }

  try {
    const db = getDbConnection();
    const setting = db.prepare(
      'SELECT value FROM user_settings WHERE key = ?'
    ).get('googleAiApiKey') as SettingRow | undefined;

    if (setting?.value?.trim()) {
      return setting.value;
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }

  return apiKey;
};

// Function to fix API key format issues
const fixApiKeyFormat = (apiKey: string): string => {
  // If API key doesn't start with 'AI', but contains it, try to extract the correct part
  if (!apiKey.startsWith('AI') && apiKey.includes('AI')) {
    const match = apiKey.match(/AI[a-zA-Z0-9_-]+/);
    if (match && match[0]) {
      console.log('Fixed API key format by extracting the correct part');
      return match[0];
    }
  }

  // Remove any quotes that might be wrapping the key
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) ||
      (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    console.log('Removed quotes from API key');
    return apiKey.substring(1, apiKey.length - 1);
  }

  // Remove any whitespace
  const trimmedKey = apiKey.trim();
  if (trimmedKey !== apiKey) {
    console.log('Removed whitespace from API key');
    return trimmedKey;
  }

  return apiKey;
};

// Create the AI instance with dynamic API key
export const createServerAiInstance = async (userId?: number) => {
  let apiKey = await getApiKeyFromDb(userId);

  // Validate the API key before creating the instance
  if (!apiKey || apiKey.trim() === '') {
    console.error('No valid API key available. AI features will not work.');
    throw new Error('No valid API key available for AI operations.');
  }

  // Apply fixes to API key format
  apiKey = fixApiKeyFormat(apiKey);

  // Additional validation for Google AI API keys
  // Google AI API keys typically follow specific patterns
  if (!apiKey.startsWith('AI')) {
    console.warn('API key has an unusual format. Typical Google AI keys start with "AI".');
    console.warn('This may cause an API_KEY_INVALID error from Google AI.');
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
    console.error('Error creating genkit instance:', error);
    throw new Error(`Failed to create AI instance: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Export a function to get the current AI instance
export const getServerAI = async (userId?: number) => {
  try {
    // Create a new instance each time to get the latest API key
    return await createServerAiInstance(userId);
  } catch (error) {
    console.error('Error creating AI instance:', error);
    throw error;
  }
};
