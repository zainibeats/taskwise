'use server';

import { z } from 'zod';
import { isPast, differenceInDays } from 'date-fns';
import { generateText, extractJSON } from '@/ai/providers';

const PrioritizeTaskInputSchema = z.object({
  task: z.string(),
  deadline: z.string(),
  importance: z.number(),
  category: z.string(),
  userId: z.number().optional(),
});
export type PrioritizeTaskInput = z.infer<typeof PrioritizeTaskInputSchema>;

const PrioritizeTaskOutputSchema = z.object({
  priorityScore: z.number(),
  reasoning: z.string(),
});
export type PrioritizeTaskOutput = z.infer<typeof PrioritizeTaskOutputSchema>;

export async function prioritizeTask(input: PrioritizeTaskInput): Promise<PrioritizeTaskOutput> {
  try {
    if (!input.task || input.task.trim() === '') {
      return { priorityScore: 50, reasoning: 'No task title provided.' };
    }

    const prompt = `You are a task prioritization expert. Assign a priority score from 1 to 100 (higher = more urgent) to this task.

Task: ${input.task}
Deadline: ${input.deadline}
Importance: ${input.importance}/10
Category: ${input.category}

Scoring guide:
- Closer deadlines = higher score
- Higher importance = higher score
- Category multipliers: Health 1.5x, Finance 1.3x, Work 1.2x, Personal 1.0x, Errands 0.9x, Other 0.8x

Return ONLY valid JSON with no explanation: {"priorityScore": <number 1-100>, "reasoning": "<one sentence>"}`;

    const raw = await generateText(prompt, input.userId);
    const parsed = extractJSON(raw) as { priorityScore: number; reasoning: string };
    return { priorityScore: parsed.priorityScore, reasoning: parsed.reasoning };
  } catch (error) {
    console.error('Error in prioritizeTask:', error);

    const getCategoryMultiplier = (category: string): number => {
      const lc = category.toLowerCase();
      if (lc.includes('health')) return 1.5;
      if (lc.includes('finance')) return 1.3;
      if (lc.includes('work')) return 1.2;
      if (lc.includes('personal')) return 1.0;
      if (lc.includes('errand')) return 0.9;
      return 0.8;
    };

    const deadline = new Date(input.deadline);

    if (isPast(deadline)) {
      return {
        priorityScore: 95,
        reasoning: 'Fallback: deadline has already passed.',
      };
    }

    const daysUntilDeadline = differenceInDays(deadline, new Date());
    const categoryMultiplier = getCategoryMultiplier(input.category);
    const deadlineScore = Math.max(10, 80 - daysUntilDeadline * 5);
    const importanceScore = input.importance * 2;
    const priorityScore = Math.max(1, Math.min(100, Math.round((deadlineScore + importanceScore) * categoryMultiplier)));

    return {
      priorityScore,
      reasoning: `Fallback: ${daysUntilDeadline} days until deadline, importance ${input.importance}/10, category "${input.category}" (${categoryMultiplier}x).`,
    };
  }
}
