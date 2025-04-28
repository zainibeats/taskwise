'use server';

/**
 * @fileOverview A task categorization AI agent.
 *
 * - categorizeTask - A function that handles the task categorization process.
 * - CategorizeTaskInput - The input type for the categorizeTask function.
 * - CategorizeTaskOutput - The return type for the categorizeTask function.
 */

import { getAI } from '@/ai/ai-instance';
import { z } from 'genkit';

const CategorizeTaskInputSchema = z.object({
  taskDescription: z.string().describe('The task description to be categorized.'),
  categories: z.array(z.string()).optional().describe('A list of categories to choose from.'),
  categoriesString: z.string().optional().describe('A comma-separated list of categories to choose from.'),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string().describe('The category that best fits the task from the predefined list.'),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  try {
    // Get the current AI instance with the latest API key
    const ai = getAI();
    
    // Join categories array into a string if present
    const categoriesString = input.categories ? input.categories.join(", ") : undefined;
    
    // Define the flow and prompt inside the function to use the current AI instance
    const prompt = ai.definePrompt({
      name: 'categorizeTaskPrompt',
      input: {
        schema: z.object({
          taskDescription: z.string().describe('The task description to be categorized.'),
          categoriesString: z.string().optional().describe('A comma-separated list of categories to choose from.'),
        }),
      },
      output: {
        schema: z.object({
          category: z.string().describe('The category that best fits the task from the predefined list.'),
        }),
      },
      prompt: `You are a task categorization expert. Given the task description, determine the most appropriate category for it from the following list:
{{#if categoriesString}}
  {{categoriesString}}
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
    
    // Run the flow with the input
    return await categorizeTaskFlow({ ...input, categoriesString });
  } catch (error) {
    console.error("Error in categorizeTask:", error);
    // Return a fallback value in case of error
    return { category: "Other" };
  }
}
