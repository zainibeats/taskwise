'use client';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// For backward compatibility
export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
