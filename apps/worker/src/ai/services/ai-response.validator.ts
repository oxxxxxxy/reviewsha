import { Injectable } from '@nestjs/common';
import type { AIReviewResult } from '../types/ai.types';

@Injectable()
export class AIResponseValidator {
  parse(content: string): AIReviewResult {
    let value: unknown;
    const normalized = content
      .trim()
      .replace(/^```(?:json)?\s*/iu, '')
      .replace(/\s*```$/u, '')
      .trim();
    try {
      value = JSON.parse(normalized);
    } catch {
      // Models occasionally add a short preamble around the JSON despite the
      // response_format request. Recover the first complete object instead
      // of retrying the whole five-task analysis.
      const start = normalized.indexOf('{');
      const end = normalized.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          value = JSON.parse(normalized.slice(start, end + 1));
        } catch {
          value = { issues: [], summary: normalized.slice(0, 500) };
        }
      } else {
        value = { issues: [], summary: normalized.slice(0, 500) };
      }
    }
    if (
      !value ||
      typeof value !== 'object' ||
      !Array.isArray((value as { issues?: unknown }).issues)
    )
      throw new Error('AI response must contain issues array');
    const issues = (value as { issues: unknown[] }).issues.flatMap((issue) => {
      if (!issue || typeof issue !== 'object') return [];
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
      const severity = String(item.severity ?? 'INFO').toUpperCase();
      const problem = item.problem ?? item.description ?? item.title;
      const recommendation = item.recommendation ?? item.fix ?? item.solution;
      const file = item.file ?? item.path ?? 'unknown';
      if (
        !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(severity) ||
        typeof file !== 'string' ||
        typeof problem !== 'string' ||
        typeof recommendation !== 'string'
      )
        return [];
      return [
        {
          ...item,
          severity,
          file,
          problem,
          recommendation,
          ...(item.category !== undefined &&
          categories.includes(String(item.category).toUpperCase())
            ? { category: String(item.category).toUpperCase() }
            : {}),
        } as unknown as AIReviewResult['issues'][number],
      ];
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
