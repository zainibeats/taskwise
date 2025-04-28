'use client';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { UserSettingsApi } from '@/lib/api-client';

// Cache for API key to avoid excessive database calls
let cachedApiKey: string | null = null;
let lastFetchTime = 0;
const API_KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to get the API key from database or environment variable
const getApiKey = async (): Promise<string> => {
  const now = Date.now();
  
  // If we have a cached key and it's not expired, use it
  if (cachedApiKey !== null && now - lastFetchTime < API_KEY_CACHE_DURATION) {
    return cachedApiKey;
  }
  
  // Try to get the API key from database
  try {
    const userApiKey = await UserSettingsApi.getSetting('googleAiApiKey');
    if (userApiKey && userApiKey.trim() !== '') {
      // Cache the API key
      cachedApiKey = userApiKey;
      lastFetchTime = now;
      return userApiKey;
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }
  
  // Fall back to environment variable
  cachedApiKey = process.env.GOOGLE_AI_API_KEY || '';
  lastFetchTime = now;
  return cachedApiKey;
};

// Create the AI instance with dynamic API key
export const createAiInstance = async () => {
  const apiKey = await getApiKey();
  
  return genkit({
    promptDir: './prompts',
    plugins: [
      googleAI({
        apiKey,
      }),
    ],
    model: 'googleai/gemini-2.0-flash',
  });
};

// Export a function to get the current AI instance
export const getAI = async () => {
  // Re-create the instance each time to get the current API key
  return await createAiInstance();
};

// For backward compatibility
// Note: This will create an instance with potentially empty API key,
// but it will be re-initialized before actual use
export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
