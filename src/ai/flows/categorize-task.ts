'use server';

/**
 * @fileOverview A task categorization AI agent.
 *
 * - categorizeTask - A function that handles the task categorization process.
 * - CategorizeTaskInput - The input type for the categorizeTask function.
 * - CategorizeTaskOutput - The return type for the categorizeTask function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const CategorizeTaskInputSchema = z.object({
  task: z.string().describe('The task to be categorized.'),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string().describe('The category of the task (e.g., work, personal, errands).'),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  return categorizeTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTaskPrompt',
  input: {
    schema: z.object({
      task: z.string().describe('The task to be categorized.'),
    }),
  },
  output: {
    schema: z.object({
      category: z.string().describe('The category of the task (e.g., work, personal, errands).'),
    }),
  },
  prompt: `You are a task categorization expert.  Given the task, determine the most appropriate category for it.

Task: {{{task}}}

Category:`,
});

const categorizeTaskFlow = ai.defineFlow<
  typeof CategorizeTaskInputSchema,
  typeof CategorizeTaskOutputSchema
>(
  {
    name: 'categorizeTaskFlow',
    inputSchema: CategorizeTaskInputSchema,
    outputSchema: CategorizeTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
