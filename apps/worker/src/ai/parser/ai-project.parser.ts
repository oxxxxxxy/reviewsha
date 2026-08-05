import { Injectable } from '@nestjs/common';
import type { AIFileRole, AIProject, AIProjectMetadata } from '../types/ai.types';

@Injectable()
export class AIProjectParser {
  parse(project: AIProject): AIProjectMetadata {
    const files = project.files.filter((file) => !this.isExcluded(file.path));
    const categories = [...new Set(files.map((file) => this.category(file.path)))].sort();
    return {
      projectId: project.projectId,
      name: project.name,
      type: this.detectType(files, project.structure),
      languages: [
        ...new Set(files.flatMap((file) => (file.language ? [file.language.toLowerCase()] : []))),
      ].sort(),
      filesCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      categories,
    };
  }

  classifyFile(path: string): AIFileRole {
    const lower = path.toLowerCase();
    if (/(^|\/)(test|tests|__tests__)(\/|$)|\.(spec|test)\./.test(lower)) return 'test';
    if (/migration/.test(lower)) return 'migration';
    if (/\.controller\.|\/controllers?\//.test(lower)) return 'controller';
    if (/\.service\.|\/services?\//.test(lower)) return 'service';
    if (/\.repository\.|\/repositories?\//.test(lower)) return 'repository';
    if (/\.(tsx|jsx)$|\/components?\//.test(lower)) return 'component';
    if (/\.(json|ya?ml|toml|env\.)$|(^|\/)(config|docker)/.test(lower)) return 'config';
    if (/\.md$|readme/i.test(lower)) return 'documentation';
    return 'source';
  }

  isExcluded(path: string): boolean {
    return (
      /(^|\/)(node_modules|\.git|dist|build|coverage)(\/|$)/.test(path) ||
      /(^|\/)\.env(?:\.|$)/.test(path) ||
      /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.ya?ml)$/.test(path)
    );
  }

  private category(path: string): string {
    return this.classifyFile(path);
  }
  private detectType(files: { path: string }[], structure: string[]): string {
    const paths = [...files.map((file) => file.path), ...structure].join('\n').toLowerCase();
    if (paths.includes('nest-cli.json') || paths.includes('@nestjs')) return 'nestjs';
    if (paths.includes('next.config')) return 'nextjs';
    if (paths.includes('vite.config')) return 'vite';
    if (paths.includes('manage.py')) return 'django';
    if (paths.includes('go.mod')) return 'go';
    return 'generic';
  }
}
