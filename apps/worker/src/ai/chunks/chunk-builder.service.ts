import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AIChunk, AIChunkType, AIFile } from '../types/ai.types';

export type ChunkOptions = { maxTokens?: number; maxChunks?: number };

@Injectable()
export class ChunkBuilderService {
  build(files: AIFile[], options: ChunkOptions = {}): AIChunk[] {
    const maxTokens = options.maxTokens ?? 6000;
    const maxChunks = options.maxChunks ?? Number.POSITIVE_INFINITY;
    const chunks: AIChunk[] = [];
    let current: AIFile[] = [];
    let tokens = 0;
    const flush = () => {
      if (!current.length || chunks.length >= maxChunks) return;
      chunks.push(this.makeChunk(current, current.length === 1 ? 'file' : 'module'));
      current = [];
      tokens = 0;
    };
    for (const file of files) {
      const fileTokens = this.estimateTokens(file.content ?? '');
      if (current.length && tokens + fileTokens > maxTokens) flush();
      if (fileTokens > maxTokens) {
        const text = file.content ?? '';
        const contentSize = Math.max(1, (maxTokens - 8) * 4);
        for (let index = 0; index < text.length; index += contentSize) {
          if (chunks.length >= maxChunks) break;
          chunks.push(
            this.makeChunk([{ ...file, content: text.slice(index, index + contentSize) }], 'file'),
          );
        }
        continue;
      }
      current.push(file);
      tokens += fileTokens;
    }
    flush();
    return chunks;
  }

  buildArchitecture(metadata: Record<string, unknown>, structure: string[]): AIChunk {
    const content = JSON.stringify({ metadata, structure }, null, 2);
    return {
      id: randomUUID(),
      type: 'architecture',
      path: 'project://architecture',
      content,
      tokens: this.estimateTokens(content),
      filePaths: structure,
    };
  }

  estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(content.length / 4));
  }
  private makeChunk(files: AIFile[], type: AIChunkType): AIChunk {
    const content = files
      .map((file) => `// FILE: ${file.path}\n${file.content ?? ''}`)
      .join('\n\n');
    return {
      id: randomUUID(),
      type,
      path: files.length === 1 ? files[0]!.path : this.commonPath(files.map((file) => file.path)),
      language: files[0]!.language,
      content,
      tokens: this.estimateTokens(content),
      filePaths: files.map((file) => file.path),
    };
  }
  private commonPath(paths: string[]): string {
    return paths[0]?.split('/').slice(0, -1).join('/') || 'project';
  }
}
