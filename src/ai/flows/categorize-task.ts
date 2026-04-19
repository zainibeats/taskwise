'use server';

import { z } from 'zod';
import { generateText, extractJSON } from '@/ai/providers';

const CategorizeTaskInputSchema = z.object({
  taskDescription: z.string(),
  categories: z.array(z.string()).optional(),
  categoriesString: z.string().optional(),
  userId: z.number().optional(),
});
export type CategorizeTaskInput = z.infer<typeof CategorizeTaskInputSchema>;

const CategorizeTaskOutputSchema = z.object({
  category: z.string(),
});
export type CategorizeTaskOutput = z.infer<typeof CategorizeTaskOutputSchema>;

export async function categorizeTask(input: CategorizeTaskInput): Promise<CategorizeTaskOutput> {
  try {
    if (!input.taskDescription || input.taskDescription.trim() === '') {
      return { category: 'Other' };
    }

    const defaultCategories = ['Health', 'Finance', 'Work', 'Personal', 'Errands', 'Other'];
    const categories = input.categories?.join(', ') ?? defaultCategories.join(', ');

    const prompt = `You are a task categorization expert. Categorize the following task into exactly one of these categories: ${categories}.

Task: ${input.taskDescription}

Return ONLY valid JSON with no explanation: {"category": "CategoryName"}`;

    const raw = await generateText(prompt, input.userId);
    const parsed = extractJSON(raw) as { category: string };
    return { category: parsed.category };
  } catch (error) {
    console.error('Error in categorizeTask:', error);

    const defaultCategories = ['Health', 'Finance', 'Work', 'Personal', 'Errands', 'Other'];
    const availableCategories = input.categories ?? defaultCategories;
    const task = input.taskDescription.toLowerCase();

    const keywordMap: Record<string, string[]> = {
      health: ['health', 'doctor', 'medical', 'medicine', 'exercise', 'workout', 'gym', 'fitness', 'diet'],
      finance: ['finance', 'money', 'bank', 'pay', 'bill', 'budget', 'tax', 'invest', 'loan'],
      work: ['work', 'job', 'office', 'project', 'meeting', 'email', 'presentation', 'client', 'deadline', 'report'],
      personal: ['personal', 'home', 'family', 'friend', 'hobby', 'read', 'learn', 'study', 'relax'],
      errands: ['errand', 'shop', 'store', 'buy', 'pick up', 'groceries', 'mail', 'laundry', 'clean'],
    };

    for (const category of availableCategories) {
      const lc = category.toLowerCase();
      if (task.includes(lc)) return { category };
      const keywords = keywordMap[lc] ?? [];
      if (keywords.some(kw => task.includes(kw))) return { category };
    }

    return { category: availableCategories.includes('Other') ? 'Other' : availableCategories[0] };
  }
}
