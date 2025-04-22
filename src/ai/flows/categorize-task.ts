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
  taskDescription: z.string().describe('The task description to be categorized.'),
  categories: z.array(z.string()).optional().describe('A list of categories to choose from.'),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string().describe('The category that best fits the task from the predefined list.'),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  return categorizeTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTaskPrompt',
  input: {
    schema: z.object({
      taskDescription: z.string().describe('The task description to be categorized.'),
      categories: z.array(z.string()).optional().describe('A list of categories to choose from.'),
    }),
  },
  output: {
    schema: z.object({
      category: z.string().describe('The category that best fits the task from the predefined list.'),
    }),
  },
  prompt: `You are a task categorization expert. Given the task description, determine the most appropriate category for it from the following list:
{{#if categories}}
  {{categories.join(", ")}}
{{else}}
  Health, Finance, Work, Personal, Errands, Other
{{/if}}

Task Description: {{{taskDescription}}}

Category: `,
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
