'use server';
/**
 * @fileOverview A task prioritization AI agent.
 *
 * - prioritizeTask - A function that calculates the priority of a task based on deadline, importance, and category.
 * - PrioritizeTaskInput - The input type for the prioritizeTask function.
 * - PrioritizeTaskOutput - The return type for the prioritizeTask function.
 */

import { getServerAI } from '@/ai/server-ai-instance';
import { z } from 'genkit';
import { isPast, differenceInDays } from 'date-fns';

const PrioritizeTaskInputSchema = z.object({
  task: z.string().describe('The task to prioritize.'),
  deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
  importance: z.number().describe('The user-defined importance of the task (1-10, 10 being most important).'),
  category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
  userId: z.number().optional().describe('The user ID to get the API key for.'),
});
export type PrioritizeTaskInput = z.infer<typeof PrioritizeTaskInputSchema>;

const PrioritizeTaskOutputSchema = z.object({
  priorityScore: z.number().describe('The calculated priority score for the task (1-100).'),
  reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
});
export type PrioritizeTaskOutput = z.infer<typeof PrioritizeTaskOutputSchema>;

export async function prioritizeTask(input: PrioritizeTaskInput): Promise<PrioritizeTaskOutput> {
  try {
    // Log that we're trying to prioritize with a specific user ID
    console.log(`Attempting to prioritize task with user ID: ${input.userId || 'none'}`);
    
    // Get the current AI instance with the latest API key
    let ai;
    try {
      ai = await getServerAI(input.userId);
    } catch (aiError) {
      console.error("Error initializing AI with user API key:", aiError);
      throw new Error(`AI initialization failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
    }
    
    // Define the flow and prompt inside the function to use the current AI instance
    const prioritizeTaskPrompt = ai.definePrompt({
      name: 'prioritizeTaskPrompt',
      input: {
        schema: z.object({
          task: z.string().describe('The task to prioritize.'),
          deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
          importance: z.number().describe('The user-defined importance of the task (1-10, 10 being most important).'),
          category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
        }),
      },
      output: {
        schema: z.object({
          priorityScore: z.number().describe('The calculated priority score for the task (1-100).'),
          reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
        }),
      },
      prompt: `You are a task prioritization expert. Given the following task information, assign a priority score from 1 to 100 (higher being more urgent) and explain your reasoning.

Task title: {{{task}}}
Deadline: {{{deadline}}}
User-defined importance: {{{importance}}} (1-10 scale)
Category: {{{category}}}

Considerations:
1. Tasks with closer deadlines should have higher priority scores.
2. Tasks with higher user-defined importance should have higher priority scores.
3. Different categories should influence priority:
   - Health tasks should generally have the highest priority multiplier (1.5)
   - Finance tasks should have a high priority multiplier (1.3) 
   - Work tasks should have a moderately high priority multiplier (1.2)
   - Personal tasks should have a standard priority multiplier (1.0)
   - Errands should have a slightly lower priority multiplier (0.9)
   - Other tasks should have the lowest priority multiplier (0.8)
4. Consider the absolute deadline (how soon it is) but also the appropriateness of urgency for the category.
   - A work deadline of 2 days might deserve high urgency (90+)
   - A personal errand with same deadline might warrant moderate urgency (70-80)
5. Balance these considerations to provide a reasonable priority score.

Provide:
1. A priority score (number between 1-100)
2. Brief reasoning for this score

Priority score: `,
    });

    const prioritizeTaskFlow = ai.defineFlow<typeof PrioritizeTaskInputSchema, typeof PrioritizeTaskOutputSchema>(
      {
        name: 'prioritizeTaskFlow',
        inputSchema: PrioritizeTaskInputSchema,
        outputSchema: PrioritizeTaskOutputSchema,
      },
      async input => {
        const { output } = await prioritizeTaskPrompt(input);
        return output!;
      }
    );
    
    // Run the flow with the input
    const result = await prioritizeTaskFlow(input);
    return result;
  } catch (error) {
    console.error("Error in prioritizeTask:", error);
    
    // Calculate category multiplier for fallback calculation
    const getCategoryMultiplier = (category: string): number => {
      const lowerCategory = category.toLowerCase();
      if (lowerCategory.includes('health')) return 1.5;
      if (lowerCategory.includes('finance')) return 1.3;
      if (lowerCategory.includes('work')) return 1.2;
      if (lowerCategory.includes('personal')) return 1.0;
      if (lowerCategory.includes('errand')) return 0.9;
      return 0.8; // default/other
    };
    
    // Provide a fallback priority score based on more comprehensive heuristics
    const now = new Date();
    const deadline = new Date(input.deadline);
    
    // Handle past deadlines
    if (isPast(deadline)) {
      return {
        priorityScore: 95,
        reasoning: "Fallback calculation: Task deadline has already passed, marking as very high priority.",
      };
    }
    
    const daysUntilDeadline = differenceInDays(deadline, now);
    const categoryMultiplier = getCategoryMultiplier(input.category);
    
    // Base score starts at 80 for urgent tasks (due today)
    // Reduced by 5 points per day until deadline, but never below 10
    const deadlineScore = Math.max(10, 80 - (daysUntilDeadline * 5));
    
    // Importance contributes up to 20 points (scaled from 1-10 input)
    const importanceScore = input.importance * 2;
    
    // Calculate total score with category multiplier
    let priorityScore = (deadlineScore + importanceScore) * categoryMultiplier;
    
    // Ensure the priority is within 1-100
    priorityScore = Math.max(1, Math.min(100, Math.round(priorityScore)));
    
    return {
      priorityScore,
      reasoning: `Fallback calculation due to AI service error. Score based on: ${daysUntilDeadline} days until deadline (${deadlineScore} points), user importance ${input.importance} (${importanceScore} points), and category "${input.category}" (multiplier: ${categoryMultiplier.toFixed(1)}).`,
    };
  }
}
