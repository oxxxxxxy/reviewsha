import { describe, expect, it } from 'vitest';
import { MergeService } from '../../../src/services/merge.service';
import type { ParsedProject } from '../../../src/services/parser.service';

describe('MergeService', () => {
  it('creates a unified analysis context', () => {
    const result = new MergeService().merge({
      projectId: 'p1',
      uploadId: 'u1',
      download: { size: 3 },
      extract: { filesCount: 1 },
      parse: {
        files: [],
        languages: ['TypeScript'],
        structure: [],
        statistics: { files: 0, bytes: 0, lines: 0 },
      },
    });
    expect(result.project).toEqual({ projectId: 'p1', uploadId: 'u1' });
    expect(result.download).toEqual({ size: 3 });
    expect(result.extract).toEqual({ filesCount: 1 });
    expect(result.languages).toEqual(['TypeScript']);
  });
  it('preserves parsed files and statistics', () => {
    const parse: ParsedProject = {
      files: [{ path: 'a.ts', extension: '.ts', size: 2, hash: 'hash', lines: 1 }],
      languages: ['TypeScript'],
      structure: ['a.ts'],
      statistics: { files: 1, bytes: 2, lines: 1 },
    };
    const result = new MergeService().merge({
      projectId: 'p',
      uploadId: 'u',
      download: {},
      extract: {},
      parse,
    });
    expect(result.files).toBe(parse.files);
    expect(result.statistics).toBe(parse.statistics);
  });
});
