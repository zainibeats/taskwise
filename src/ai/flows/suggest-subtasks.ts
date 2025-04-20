'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting subtasks for a given task using AI.
 *
 * - suggestSubtasks - A function that takes a task description as input and returns a list of suggested subtasks.
 * - SuggestSubtasksInput - The input type for the suggestSubtasks function.
 * - SuggestSubtasksOutput - The output type for the suggestSubtasks function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestSubtasksInputSchema = z.object({
  taskDescription: z.string().describe('The description of the main task.'),
});
export type SuggestSubtasksInput = z.infer<typeof SuggestSubtasksInputSchema>;

const SuggestSubtasksOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('A list of suggested subtasks for the main task.'),
});
export type SuggestSubtasksOutput = z.infer<typeof SuggestSubtasksOutputSchema>;

export async function suggestSubtasks(input: SuggestSubtasksInput): Promise<SuggestSubtasksOutput> {
  return suggestSubtasksFlow(input);
}

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
