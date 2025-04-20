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
import { isPast, format, parseISO, differenceInDays } from 'date-fns';

const PrioritizeTaskInputSchema = z.object({
  task: z.string().describe('The task to prioritize.'),
  deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
  importance: z.number().describe('The importance of the task (1-10, 10 being most important).'),
  category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
});
export type PrioritizeTaskInput = z.infer<typeof PrioritizeTaskInputSchema>;

const PrioritizeTaskOutputSchema = z.object({
  priorityScore: z.number().describe('The calculated priority score for the task.'),
  reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
});
export type PrioritizeTaskOutput = z.infer<typeof PrioritizeTaskOutputSchema>;

export async function prioritizeTask(input: PrioritizeTaskInput): Promise<PrioritizeTaskOutput> {
  return prioritizeTaskFlow(input);
}

const prioritizeTaskPrompt = ai.definePrompt({
  name: 'prioritizeTaskPrompt',
  input: {
    schema: z.object({
      task: z.string().describe('The task to prioritize.'),
      deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
      importance: z.number().describe('The importance of the task (1-10, 10 being most important).'),
      category: z.string().describe('The category of the task (e.g., Work, Personal, Health).'),
    }),
  },
  output: {
    schema: z.object({
      priorityScore: z.number().describe('The calculated priority score for the task.'),
      reasoning: z.string().describe('The AI reasoning behind the assigned priority score.'),
    }),
  },
  prompt: `You are an AI task prioritization expert. Given the task, its deadline, its importance, and its category, determine a priority score (1-100, 100 being highest priority) and explain your reasoning.

Here are some category-specific urgency ratios, where a higher ratio means the task becomes more urgent as the deadline approaches:
- Health: 1.5
- Finance: 1.3
- Work: 1.2
- Personal: 1.0
- Errands: 0.9
- Other: 0.8

Task: {{{task}}}
Deadline: {{{deadline}}}
Importance: {{{importance}}}
Category: {{{category}}}

Priority Score: {{priorityScore}}
Reasoning: {{reasoning}}`,
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
    const {task, deadline, importance, category} = input;

    // Parse the deadline and calculate days until deadline
    const parsedDeadline = parseISO(deadline);
    const daysUntilDeadline = differenceInDays(parsedDeadline, new Date());

    // Determine category-specific urgency ratio
    let categoryRatio = 1.0; // Default ratio
    switch (category) {
      case "Health":
        categoryRatio = 1.5;
        break;
      case "Finance":
        categoryRatio = 1.3;
        break;
      case "Work":
        categoryRatio = 1.2;
        break;
      case "Personal":
        categoryRatio = 1.0;
        break;
      case "Errands":
        categoryRatio = 0.9;
        break;
      default:
        categoryRatio = 0.8;
    }

    // Adjust priority score based on deadline proximity and category ratio
    let priorityScore = importance * 10; // Base priority
    if (daysUntilDeadline <= 7) {
      priorityScore += importance * categoryRatio * (7 - daysUntilDeadline); // Increase priority as deadline approaches
    }

    // Ensure priority score stays within the 1-100 range
    priorityScore = Math.max(1, Math.min(100, priorityScore));

    const {output} = await prioritizeTaskPrompt({
      ...input,
      priorityScore,
    });
    return output!;
  }
);
