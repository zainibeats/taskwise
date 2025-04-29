'use server';

/**
 * @fileOverview A task categorization AI agent.
 *
 * - categorizeTask - A function that handles the task categorization process.
 * - CategorizeTaskInput - The input type for the categorizeTask function.
 * - CategorizeTaskOutput - The return type for the categorizeTask function.
 */

import { getServerAI } from '@/ai/server-ai-instance';
import { z } from 'genkit';

const CategorizeTaskInputSchema = z.object({
  taskDescription: z.string().describe('The task description to be categorized.'),
  categories: z.array(z.string()).optional().describe('A list of categories to choose from.'),
  categoriesString: z.string().optional().describe('A comma-separated list of categories to choose from.'),
  userId: z.number().optional().describe('The user ID to get the API key for.'),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string().describe('The category that best fits the task.'),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

/**
 * Categorizes a task using AI.
 * If AI is unavailable, uses keyword matching as a fallback.
 */
export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  try {
    // Log that we're trying to categorize with a specific user ID
    console.log(`Attempting to categorize task with user ID: ${input.userId || 'none'}`);

    // Get the current AI instance with the latest API key
    const ai = await getServerAI(input.userId);
    
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
    
    // Use keyword matching as a fallback
    const defaultCategories = ["Health", "Finance", "Work", "Personal", "Errands", "Other"];
    const availableCategories = input.categories || defaultCategories;
    
    // Simple keyword matching for categories
    const task = input.taskDescription.toLowerCase();
    const keywordMap: Record<string, string[]> = {
      'health': ['health', 'doctor', 'medical', 'medicine', 'exercise', 'workout', 'gym', 'fitness', 'diet'],
      'finance': ['finance', 'money', 'bank', 'pay', 'bill', 'budget', 'tax', 'invest', 'loan'],
      'work': ['work', 'job', 'office', 'project', 'meeting', 'email', 'presentation', 'client', 'deadline', 'report'],
      'personal': ['personal', 'home', 'family', 'friend', 'hobby', 'read', 'learn', 'study', 'relax'],
      'errands': ['errand', 'shop', 'store', 'buy', 'pick up', 'groceries', 'mail', 'laundry', 'clean']
    };
    
    // Find matching category by keywords
    for (const category of availableCategories) {
      const lowercaseCategory = category.toLowerCase();
      
      // Direct match with task description
      if (task.includes(lowercaseCategory)) {
        return { category };
      }
      
      // Check keywords for this category
      const keywords = keywordMap[lowercaseCategory] || [];
      if (keywords.some(keyword => task.includes(keyword))) {
        return { category };
      }
    }
    
    // If no match found, return "Other" or the first available category
    return { category: availableCategories.includes("Other") ? "Other" : availableCategories[0] };
  }
}
