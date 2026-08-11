import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, relative, join } from 'node:path';

export type ParsedFile = {
  path: string;
  extension: string;
  size: number;
  language?: string;
  hash: string;
  lines: number;
};
export type ParsedProject = {
  files: ParsedFile[];
  languages: string[];
  structure: string[];
  statistics: { files: number; bytes: number; lines: number };
};

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build']);
const languageByExtension: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.c': 'C',
  '.h': 'C/C++',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.cs': 'C#',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.sh': 'Shell',
  '.sql': 'SQL',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.txt': 'Text',
  '.csv': 'CSV',
  '.toml': 'TOML',
};

@Injectable()
export class ParserService {
  async parse(root: string): Promise<ParsedProject> {
    const files: ParsedFile[] = [];
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        if (entry.name === '.env' || entry.name.startsWith('.env.')) continue;
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) await walk(absolute);
        else if (entry.isFile()) files.push(await this.inspectFile(root, absolute));
      }
    };
    await walk(root);
    const languages = [
      ...new Set(files.flatMap((file) => (file.language ? [file.language] : []))),
    ].sort();
    return {
      files,
      languages,
      structure: files.map((file) => file.path),
      statistics: {
        files: files.length,
        bytes: files.reduce((sum, file) => sum + file.size, 0),
        lines: files.reduce((sum, file) => sum + file.lines, 0),
      },
    };
  }

  private async inspectFile(root: string, filePath: string): Promise<ParsedFile> {
    const info = await stat(filePath);
    const extension = extname(filePath).toLowerCase();
    const hash = createHash('sha256');
    let lines = 0;
    let hasBytes = false;
    for await (const chunk of createReadStream(filePath)) {
      const text = chunk.toString('utf8');
      lines += text.split('\n').length - 1;
      hasBytes = true;
      hash.update(chunk);
    }
    if (hasBytes) lines = Math.max(lines, 1);
    return {
      path: relative(root, filePath),
      extension,
      size: info.size,
      language: languageByExtension[extension],
      hash: hash.digest('hex'),
      lines,
    };
  }
}
