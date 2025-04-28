'use client';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Function to get the API key from localStorage or environment variable
const getApiKey = (): string => {
  // Try to get the API key from localStorage
  if (typeof window !== 'undefined') {
    const userApiKey = localStorage.getItem('googleAiApiKey');
    if (userApiKey && userApiKey.trim() !== '') {
      return userApiKey;
    }
  }
  
  // Fall back to environment variable
  return process.env.GOOGLE_AI_API_KEY || '';
};

// Create the AI instance with dynamic API key
export const createAiInstance = () => {
  return genkit({
    promptDir: './prompts',
    plugins: [
      googleAI({
        apiKey: getApiKey(),
      }),
    ],
    model: 'googleai/gemini-2.0-flash',
  });
};

// Export a function to get the current AI instance
export const getAI = () => {
  // Re-create the instance each time to get the current API key
  return createAiInstance();
};

// For backward compatibility
export const ai = createAiInstance();
