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
    console.log("Fetching API key from user settings...");
    const userApiKey = await UserSettingsApi.getSetting('googleAiApiKey');
    
    if (userApiKey && userApiKey.trim() !== '') {
      console.log("Found API key in user settings");
      
      // Basic validation - Google AI keys usually start with 'AI'
      if (!userApiKey.startsWith('AI')) {
        console.warn("API key may not be valid - doesn't start with 'AI'");
        console.warn("This may cause API_KEY_INVALID errors from Google AI");
      }
      
      // Cache the API key
      cachedApiKey = userApiKey;
      lastFetchTime = now;
      return userApiKey;
    } else {
      console.log("No API key found in user settings");
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }
  
  // Fall back to environment variable - which should be empty now
  const envApiKey = process.env.GOOGLE_AI_API_KEY || '';
  
  if (!envApiKey || envApiKey.trim() === '') {
    console.warn("No API key available - AI features will not work");
    console.warn("Please set an API key in the settings page");
  }
  
  cachedApiKey = envApiKey;
  lastFetchTime = now;
  return cachedApiKey;
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
export const createAiInstance = async () => {
  try {
    let apiKey = await getApiKey();
    
    if (!apiKey || apiKey.trim() === '') {
      console.error("No valid API key available");
      throw new Error("No API key available. Please set an API key in the settings page.");
    }
    
    // Apply fixes to API key format
    apiKey = fixApiKeyFormat(apiKey);
    
    return genkit({
      promptDir: './prompts',
      plugins: [
        googleAI({
          apiKey,
        }),
      ],
      model: 'googleai/gemini-2.0-flash',
    });
  } catch (error) {
    console.error("Error creating AI instance:", error);
    throw error;
  }
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
