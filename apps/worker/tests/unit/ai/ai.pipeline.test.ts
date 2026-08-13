import { describe, expect, it } from 'vitest';
import { AIProjectParser } from '../../../src/ai/parser/ai-project.parser';
import { ChunkBuilderService } from '../../../src/ai/chunks/chunk-builder.service';
import { ContextBuilderService } from '../../../src/ai/context/context-builder.service';
import { PromptBuilderService } from '../../../src/ai/prompts/prompt-builder.service';
import type { AIFile } from '../../../src/ai/types/ai.types';

const file = (path: string, content = 'const value = 1;'): AIFile => ({
  path,
  content,
  size: content.length,
  language: 'typescript',
  role: 'source',
});

describe('AIProjectParser', () => {
  const parser = new AIProjectParser();
  it('detects project type, languages and categories', () => {
    const result = parser.parse({
      projectId: 'p1',
      structure: ['nest-cli.json', 'src/auth.controller.ts'],
      files: [file('src/auth.controller.ts')],
    });
    expect(result.type).toBe('nestjs');
    expect(result.languages).toEqual(['typescript']);
    expect(result.categories).toContain('controller');
  });
  it.each(['node_modules/a.ts', '.git/config', 'dist/a.js', 'coverage/a.js', '.env', 'yarn.lock'])(
    'excludes %s',
    (path) => expect(parser.isExcluded(path)).toBe(true),
  );
  it.each([
    ['a.controller.ts', 'controller'],
    ['a.service.ts', 'service'],
    ['a.repository.ts', 'repository'],
    ['component.tsx', 'component'],
    ['a.spec.ts', 'test'],
    ['migration.sql', 'migration'],
    ['README.md', 'documentation'],
  ])('classifies %s', (path, role) => expect(parser.classifyFile(path)).toBe(role));
});

describe('ChunkBuilderService', () => {
  const builder = new ChunkBuilderService();
  it('creates file chunks with metadata', () => {
    const result = builder.build([file('a.ts')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'file', path: 'a.ts', filePaths: ['a.ts'] });
  });
  it('numbers source lines in review chunks', () => {
    const result = builder.build([file('src/main.ts', 'const first = 1;\nconst second = 2;')]);
    expect(result[0]?.content).toContain('   1 | const first = 1;');
    expect(result[0]?.content).toContain('   2 | const second = 2;');
  });
  it('groups files until token limit', () => {
    const result = builder.build(
      [file('auth/a.ts', 'a'.repeat(20)), file('auth/b.ts', 'b'.repeat(20))],
      { maxTokens: 7 },
    );
    expect(result).toHaveLength(2);
  });
  it('splits oversized files', () => {
    const result = builder.build([file('large.ts', 'x'.repeat(100))], { maxTokens: 20 });
    expect(result.length).toBeGreaterThan(1);
    expect(result.every((chunk) => chunk.tokens <= 20)).toBe(true);
  });
  it('respects max chunks', () =>
    expect(
      builder.build(
        [file('a.ts', 'a'.repeat(40)), file('b.ts', 'b'.repeat(40)), file('c.ts', 'c'.repeat(40))],
        { maxTokens: 20, maxChunks: 2 },
      ),
    ).toHaveLength(2));
  it('creates architecture chunks', () =>
    expect(builder.buildArchitecture({ type: 'nestjs' }, ['src'])).toMatchObject({
      type: 'architecture',
      path: 'project://architecture',
    }));
  it('estimates at least one token', () => expect(builder.estimateTokens('')).toBe(1));
});

describe('ContextBuilderService', () => {
  const context = new ContextBuilderService();
  const chunks = [
    {
      id: '1',
      type: 'file' as const,
      path: 'auth/guard.ts',
      content: 'x',
      tokens: 2,
      filePaths: ['auth/guard.ts'],
    },
    {
      id: '2',
      type: 'file' as const,
      path: 'ui/button.tsx',
      content: 'x',
      tokens: 2,
      filePaths: ['ui/button.tsx'],
    },
  ];
  it('prioritizes task-relevant chunks', () =>
    expect(context.select(chunks, 'security')[0]!.path).toBe('auth/guard.ts'));
  it('respects context token limit', () =>
    expect(context.select(chunks, 'quality', 2)).toHaveLength(1));
  it('supports architecture tasks', () =>
    expect(
      context.select(
        [{ ...chunks[0]!, type: 'architecture', path: 'project://architecture' }],
        'architecture',
      ),
    ).toHaveLength(1));
});

describe('PromptBuilderService', () => {
  const builder = new PromptBuilderService();
  it.each(['architecture', 'bugs', 'security', 'quality', 'performance'] as const)(
    'builds %s prompt',
    (task) => {
      const result = builder.build(task, [
        { id: '1', type: 'file', path: 'a.ts', content: 'code', tokens: 1, filePaths: ['a.ts'] },
      ]);
      expect(result).toMatchObject({ task, outputFormat: 'json' });
      expect(result.prompt).toContain('a.ts');
    },
  );
  it('includes a strict JSON output contract', () =>
    expect(builder.build('bugs', []).prompt).toContain('"issues"'));
  it('does not expose chunk ids as code', () =>
    expect(
      builder.build('quality', [
        {
          id: 'secret-id',
          type: 'file',
          path: 'a.ts',
          content: 'code',
          tokens: 1,
          filePaths: ['a.ts'],
        },
      ]).prompt,
    ).not.toContain('secret-id'));
  it('builds a tree-only file selection prompt', () => {
    const result = builder.buildFileSelection(
      [
        { path: 'src/main.ts', preview: 'const app = createApp();' },
        { path: 'src/auth.service.ts', preview: 'export class AuthService {}' },
      ],
      3,
      'en',
    );
    expect(result.prompt).toContain('src/main.ts');
    expect(result.prompt).toContain('Select up to 3');
    expect(result.prompt).toContain('const app = createApp();');
    expect(result.prompt).toContain('PROJECT FILE TREE AND FIRST 100 CHARACTERS');
  });
  it('builds one merged prompt for selected files', () => {
    const result = builder.buildMergedProjectReview([
      {
        id: 'architecture',
        type: 'architecture',
        path: 'project://architecture',
        content: JSON.stringify({ structure: ['src/main.ts', 'README.md'] }),
        tokens: 200,
        filePaths: ['src/main.ts', 'README.md'],
      },
      {
        id: '1',
        type: 'file',
        path: 'src/main.ts',
        content: '   1 | const x = 1;\n   2 | return x;',
        tokens: 5,
        filePaths: ['src/main.ts'],
      },
    ]);
    expect(result.prompt).toContain('MERGED HIGH-SIGNAL REVIEW');
    expect(result.prompt).toContain('src/main.ts');
    expect(result.prompt).toContain('const x = 1;');
    expect(result.prompt).toContain('PROJECT TREE AND METADATA');
  });
});
