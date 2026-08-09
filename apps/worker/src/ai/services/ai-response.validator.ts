import { Injectable } from '@nestjs/common';
import type { AIReviewResult } from '../types/ai.types';

@Injectable()
export class AIResponseValidator {
  parse(content: string): AIReviewResult {
    let value: unknown;
    try {
      value = JSON.parse(content);
    } catch {
      throw new Error('AI response is not valid JSON');
    }
    if (
      !value ||
      typeof value !== 'object' ||
      !Array.isArray((value as { issues?: unknown }).issues)
    )
      throw new Error('AI response must contain issues array');
    const issues = (value as { issues: unknown[] }).issues.map((issue) => {
      if (!issue || typeof issue !== 'object') throw new Error('AI issue has invalid shape');
      const item = issue as Record<string, unknown>;
      const categories = [
        'SECURITY',
        'BUG',
        'ARCHITECTURE',
        'PERFORMANCE',
        'QUALITY',
        'STYLE',
        'DOCUMENTATION',
      ];
      if (
        !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(String(item.severity)) ||
        typeof item.file !== 'string' ||
        typeof item.problem !== 'string' ||
        typeof item.recommendation !== 'string' ||
        (item.category !== undefined && !categories.includes(String(item.category)))
      )
        throw new Error('AI issue has invalid fields');
      return item as unknown as AIReviewResult['issues'][number];
    });
    const result = value as Record<string, unknown>;
    return {
      issues,
      summary: typeof result.summary === 'string' ? result.summary : undefined,
      strengths: Array.isArray(result.strengths) ? (result.strengths as string[]) : [],
      weaknesses: Array.isArray(result.weaknesses) ? (result.weaknesses as string[]) : [],
    };
  }
}
