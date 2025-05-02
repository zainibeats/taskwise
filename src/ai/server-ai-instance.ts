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
const getApiKeyFromDb = async (userId?: number): Promise<string> => {
  let apiKey = process.env.GOOGLE_AI_API_KEY || '';
  
  // Log if environment variable is missing
  if (!apiKey) {
    console.warn('GOOGLE_AI_API_KEY environment variable is not set. AI features will only work with user API key.');
  }
  
  // Always try to get API key from the database first if user ID is provided
  if (userId) {
    try {
      console.log(`Attempting to retrieve API key for user ID: ${userId}`);
      const db = getDbConnection();
      
      // First check if the table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='user_settings'
      `).get();
      
      if (tableExists) {
        // Check if the 'value' column exists
        const tableInfo = db.prepare(`PRAGMA table_info(user_settings)`).all() as any[];
        const hasValueColumn = tableInfo.some(column => column.name === 'value');
        
        if (hasValueColumn) {
          console.log(`Querying user_settings table for googleAiApiKey for user ${userId}`);
          
          // Log all settings for this user to help debug
          try {
            const allSettings = db.prepare(
              'SELECT key, value FROM user_settings WHERE user_id = ?'
            ).all(userId) as any[];
            console.log(`Found ${allSettings.length} settings for user ${userId}:`, 
              allSettings.map(s => s.key).join(', '));
          } catch (e) {
            console.error('Error listing all user settings:', e);
          }
          
          const setting = db.prepare(
            'SELECT value FROM user_settings WHERE user_id = ? AND key = ?'
          ).get(userId, 'googleAiApiKey') as SettingRow | undefined;
          
          if (setting && setting.value) {
            if (setting.value.trim() !== '') {
              // Log a portion of the key for debugging (just first few chars)
              const keyPreview = setting.value.substring(0, 5) + '...';
              console.log(`Found API key for user ${userId}: ${keyPreview}`);
              
              // Basic validation - Google AI keys usually start with 'AI'
              if (!setting.value.startsWith('AI')) {
                console.warn(`API key for user ${userId} may not be valid - doesn't start with 'AI'`);
              }
              
              return setting.value;
            } else {
              console.log(`API key found for user ${userId} but it's empty`);
            }
          } else {
            console.log(`No API key setting found for user ${userId} with key 'googleAiApiKey'`);
          }
        } else {
          console.log(`user_settings table exists but doesn't have a 'value' column`);
        }
      } else {
        console.log(`user_settings table doesn't exist`);
      }
      
      console.log(`No custom API key found for user ${userId}, falling back to environment variable`);
    } catch (error) {
      console.error('Error fetching API key from database:', error);
    }
  } else {
    console.log("No user ID provided, using environment variable");
  }
  
  // Basic validation for environment variable API key
  if (apiKey && !apiKey.startsWith('AI')) {
    console.warn("Environment variable API key may not be valid - doesn't start with 'AI'");
  }
  
  // Fall back to environment variable
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
      model: 'googleai/gemini-2.0-flash',
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