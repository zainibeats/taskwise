'use server';
/**
 * @fileOverview This file defines a Genkit flow for prioritizing tasks based on deadlines and importance.
 *
 * - prioritizeTask - A function that takes a task and its deadline and importance as input, and returns a priority score.
 * - PrioritizeTaskInput - The input type for the prioritizeTask function.
 * - PrioritizeTaskOutput - The return type for the prioritizeTask function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
// Keep date-fns imports if needed elsewhere, or remove if only used for the deleted calculation
// import { isPast, format, parseISO, differenceInDays } from 'date-fns';

const PrioritizeTaskInputSchema = z.object({
  task: z.string().describe('The task to prioritize.'),
  deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
  importance: z.number().describe('The user-defined importance of the task (1-10, 10 being most important).'),
  category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
});
export type PrioritizeTaskInput = z.infer<typeof PrioritizeTaskInputSchema>;

const PrioritizeTaskOutputSchema = z.object({
  priorityScore: z.number().describe('The calculated priority score for the task (1-100).'),
  reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
});
export type PrioritizeTaskOutput = z.infer<typeof PrioritizeTaskOutputSchema>;

export async function prioritizeTask(input: PrioritizeTaskInput): Promise<PrioritizeTaskOutput> {
  // Add input validation if necessary
  return prioritizeTaskFlow(input);
}

const prioritizeTaskPrompt = ai.definePrompt({
  name: 'prioritizeTaskPrompt',
  input: { // Input schema now only needs the original task details
    schema: z.object({
      task: z.string().describe('The task to prioritize.'),
      deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
      importance: z.number().describe('The user-defined importance of the task (1-10, 10 being most important).'),
      category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
    }),
  },
  output: { // Output schema remains the same
    schema: z.object({
      priorityScore: z.number().describe('The calculated priority score for the task (1-100).'),
      reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
    }),
  },
  prompt: `You are an AI task prioritization expert. Calculate a final priority score (1-100, 100 being highest priority) for the given task and explain your reasoning.

Consider these factors:
1.  **User Importance (1-10):** This is the primary driver. A base score can be derived from this (e.g., importance * 8 or importance * 9).
2.  **Deadline Proximity:** Tasks with closer deadlines should generally have higher priority. Calculate the days until the deadline (today's date is ${new Date().toISOString().split('T')[0]}).
3.  **Category Context:** The urgency added by a close deadline should be heavily modulated by the category. A deadline for "Health" or "Work" adds significant urgency. A deadline for "Personal" or "Social" adds much less urgency. Use these baseline urgency weights (feel free to adjust slightly based on task specifics):
    - Health: 1.5
    - Finance: 1.3
    - Work: 1.2
    - Personal: 1.0
    - Errands: 0.9
    - Other: 0.8
4.  **Overall Balance:** Ensure the final score reflects a balanced view. A low-importance task ("Play chess") should not get a very high score (e.g., > 60) just because it's due today, unless the task description implies unusual significance. Conversely, a high-importance task far in the future should still retain a reasonable base priority.
5.  **Score Range:** Ensure the final score is strictly between 1 and 100.

Task: {{{task}}}
Deadline: {{{deadline}}}
Importance: {{{importance}}}
Category: {{{category}}}

Generate the priorityScore and reasoning.`,
});

const prioritizeTaskFlow = ai.defineFlow<
  typeof PrioritizeTaskInputSchema,
  typeof PrioritizeTaskOutputSchema
>(
  {
    name: 'prioritizeTaskFlow',
    inputSchema: PrioritizeTaskInputSchema,
    outputSchema: PrioritizeTaskOutputSchema,
  },
  async input => {
    // No calculation logic needed here anymore
    const { output } = await prioritizeTaskPrompt(input); // Pass input directly to the prompt

    // Optional: Add validation here to ensure AI output conforms to schema
    if (!output || typeof output.priorityScore !== 'number' || output.priorityScore < 1 || output.priorityScore > 100) {
        console.error("AI failed to return a valid priority score:", output);
        // Return a default or throw an error
        return { priorityScore: 50, reasoning: "AI failed to provide a valid score, assigned default." };
    }
    return output;
  }
);
