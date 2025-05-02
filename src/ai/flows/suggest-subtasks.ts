'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting subtasks for a given task using AI.
 *
 * - suggestSubtasks - A function that takes a task description as input and returns a list of suggested subtasks.
 * - SuggestSubtasksInput - The input type for the suggestSubtasks function.
 * - SuggestSubtasksOutput - The output type for the suggestSubtasks function.
 */

import { getServerAI } from '@/ai/server-ai-instance';
import { z } from 'genkit';

const SuggestSubtasksInputSchema = z.object({
  taskDescription: z.string().describe('The description of the main task.'),
  userId: z.number().optional().describe('The user ID to get the API key for.'),
});
export type SuggestSubtasksInput = z.infer<typeof SuggestSubtasksInputSchema>;

const SuggestSubtasksOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('A list of suggested subtasks for the main task.'),
});
export type SuggestSubtasksOutput = z.infer<typeof SuggestSubtasksOutputSchema>;

export async function suggestSubtasks(input: SuggestSubtasksInput): Promise<SuggestSubtasksOutput> {
  try {
    // Log that we're trying to suggest subtasks with a specific user ID
    console.log(`Attempting to suggest subtasks with user ID: ${input.userId || 'none'}`);
    
    // Check if taskDescription is provided and not empty
    if (!input.taskDescription || input.taskDescription.trim() === '') {
      console.warn('Task description is empty, cannot suggest subtasks');
      return { subtasks: ["Please provide a task description to generate subtasks."] };
    }
    
    // Get the current AI instance with the latest API key
    const ai = await getServerAI(input.userId);
    
    // Define the flow and prompt inside the function to use the current AI instance
    const prompt = ai.definePrompt({
      name: 'suggestSubtasksPrompt',
      input: {
        schema: z.object({
          taskDescription: z.string().describe('The description of the main task.'),
        }),
      },
      output: {
        schema: z.object({
          subtasks: z.array(z.string()).describe('A list of suggested subtasks for the main task.'),
        }),
      },
      prompt: `You are a helpful AI assistant that suggests high-level subtasks for a given task.

  Given the following task description, suggest 2-3 broad subtasks that break down the main task into its key components or stages. Avoid overly specific or numerous micro-steps.

  Task Description: {{{taskDescription}}}

  Subtasks (provide 2-3):`,
    });

    const suggestSubtasksFlow = ai.defineFlow<
      typeof SuggestSubtasksInputSchema,
      typeof SuggestSubtasksOutputSchema
    >(
      {
        name: 'suggestSubtasksFlow',
        inputSchema: SuggestSubtasksInputSchema,
        outputSchema: SuggestSubtasksOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
    
    // Run the flow with the input
    return await suggestSubtasksFlow(input);
  } catch (error) {
    console.error("Error in suggestSubtasks:", error);
    
    // Provide more specific error messages based on error type
    let errorMessage = "Failed to generate subtasks. ";
    
    if (error instanceof Error) {
      if (error.message.includes("API_KEY_INVALID")) {
        errorMessage += "Your API key appears to be invalid. Please check your API key in settings.";
      } else if (error.message.includes("No valid API key available")) {
        errorMessage += "Please add a valid Google AI API key in the settings.";
      } else if (error.message.includes("PERMISSION_DENIED")) {
        errorMessage += "Your API key doesn't have permission to use this service.";
      } else if (error.message.includes("QUOTA_EXCEEDED")) {
        errorMessage += "You've exceeded your API quota limit.";
      } else {
        errorMessage += "Please try again later or check your API key.";
      }
    }
    
    // Return a fallback value with the specific error message
    return { subtasks: [errorMessage] };
  }
}
