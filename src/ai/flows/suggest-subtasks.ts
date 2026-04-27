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
        errorMessage += 'Your API key appears to be invalid. Check GOOGLE_AI_API_KEY in .env.';
      } else if (error.message.includes('No valid API key') || error.message.includes('environment variable is not set')) {
        errorMessage += 'Please set the required API key in your .env file.';
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
