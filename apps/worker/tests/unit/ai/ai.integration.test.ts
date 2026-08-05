import { describe, expect, it, vi } from 'vitest';
import { AIResponseValidator } from '../../../src/ai/services/ai-response.validator';
import { AIService } from '../../../src/ai/services/ai.service';
import { OmniRouterProvider } from '../../../src/ai/providers/omni-router.provider';

describe('AI integration layer', () => {
  it('validates structured responses', () =>
    expect(
      new AIResponseValidator().parse(
        JSON.stringify({
          issues: [{ severity: 'HIGH', file: 'a.ts', problem: 'x', recommendation: 'y' }],
        }),
      ).issues,
    ).toHaveLength(1));
  it('rejects invalid JSON', () =>
    expect(() => new AIResponseValidator().parse('text')).toThrow('valid JSON'));
  it('rejects a response without issues', () =>
    expect(() => new AIResponseValidator().parse('{}')).toThrow('issues array'));
  it('rejects invalid severity', () =>
    expect(() =>
      new AIResponseValidator().parse(
        JSON.stringify({
          issues: [{ severity: 'BAD', file: 'a', problem: 'x', recommendation: 'y' }],
        }),
      ),
    ).toThrow('invalid fields'));
  it('AIService validates provider output', async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue({
        content: '{"issues":[]}',
        model: 'mock',
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      }),
    };
    await expect(
      new AIService(provider as never, new AIResponseValidator()).analyze({
        system: '',
        prompt: '',
        outputFormat: 'json',
        chunks: [],
        task: 'bugs',
      }),
    ).resolves.toMatchObject({ result: { issues: [] }, response: { model: 'mock' } });
  });
  it('provider requires credentials', async () => {
    const config = { get: vi.fn(() => undefined), getOrThrow: vi.fn() };
    await expect(
      new OmniRouterProvider(config as never).generate({
        system: '',
        prompt: '',
        outputFormat: 'json',
        chunks: [],
        task: 'bugs',
      }),
    ).rejects.toThrow('not configured');
  });
});
