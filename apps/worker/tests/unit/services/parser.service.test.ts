import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ParserService } from '../../../src/services/parser.service';

describe('ParserService', () => {
  it('indexes supported source files and statistics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-parser-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src/main.ts'), 'const value = 1;\n');
    await writeFile(join(root, 'README.md'), '# demo\n');
    const result = await new ParserService().parse(root);
    expect(result.files).toHaveLength(2);
    expect(result.languages).toEqual(['TypeScript']);
    expect(result.statistics.files).toBe(2);
    expect(result.statistics.lines).toBe(2);
    expect(result.files.find((file) => file.path === 'src/main.ts')?.hash).toHaveLength(64);
    await rm(root, { recursive: true, force: true });
  });

  it.each(['.git', 'node_modules', 'dist', 'build'])('ignores %s directories', async (ignored) => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-parser-'));
    await mkdir(join(root, ignored), { recursive: true });
    await writeFile(join(root, ignored, 'secret.ts'), 'secret');
    await writeFile(join(root, 'main.py'), 'print(1)');
    const result = await new ParserService().parse(root);
    expect(result.files.map((file) => file.path)).toEqual(['main.py']);
    await rm(root, { recursive: true, force: true });
  });

  it('ignores environment files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-parser-'));
    await writeFile(join(root, '.env'), 'SECRET=x');
    await writeFile(join(root, '.env.local'), 'SECRET=x');
    await writeFile(join(root, 'main.go'), 'package main');
    expect((await new ParserService().parse(root)).files).toHaveLength(1);
    await rm(root, { recursive: true, force: true });
  });

  it.each([
    ['.ts', 'TypeScript'],
    ['.tsx', 'TypeScript'],
    ['.js', 'JavaScript'],
    ['.py', 'Python'],
    ['.java', 'Java'],
    ['.go', 'Go'],
  ])('detects %s as %s', async (extension, language) => {
    const root = await mkdtemp(join(tmpdir(), 'reviewsha-parser-'));
    await writeFile(join(root, `file${extension}`), 'line');
    expect((await new ParserService().parse(root)).languages).toContain(language);
    await rm(root, { recursive: true, force: true });
  });
});
