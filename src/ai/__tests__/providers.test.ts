import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractJSON } from '../providers';

// extractJSON tests — pure function, no mocks needed
describe('extractJSON', () => {
  it('parses plain JSON object', () => {
    const result = extractJSON('{"category": "Work"}') as { category: string };
    expect(result.category).toBe('Work');
  });

  it('parses JSON wrapped in markdown code block', () => {
    const result = extractJSON('```json\n{"category": "Health"}\n```') as { category: string };
    expect(result.category).toBe('Health');
  });

  it('parses JSON wrapped in code block without language tag', () => {
    const result = extractJSON('```\n{"subtasks": ["a", "b"]}\n```') as { subtasks: string[] };
    expect(result.subtasks).toEqual(['a', 'b']);
  });

  it('parses JSON embedded after prose text', () => {
    const result = extractJSON('Here is your category: {"category": "Finance"}') as { category: string };
    expect(result.category).toBe('Finance');
  });

  it('throws when no JSON structure found', () => {
    expect(() => extractJSON('Just plain text, no JSON here')).toThrow('No JSON found');
  });
});

// generateText error cases — needs env var control
describe('generateText — config errors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws for unknown AI_PROVIDER value', async () => {
    process.env.AI_PROVIDER = 'unknown_provider';
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('Unknown AI_PROVIDER');
  });

  it('throws when AI_PROVIDER=openai but OPENAI_API_KEY is missing', async () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('OPENAI_API_KEY');
  });

  it('throws when AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    delete process.env.ANTHROPIC_API_KEY;
    const { generateText } = await import('../providers');
    await expect(generateText('hello')).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
