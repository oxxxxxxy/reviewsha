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
      const start = normalized.indexOf('{');
      const end = normalized.lastIndexOf('}');
      if (start < 0 || end <= start) {
        // Some development models ignore JSON mode and return a long plain-text
        // review. Preserve that response as an explicit unstructured review so
        // the pipeline can finish without inventing findings.
        if (normalized.length >= 32) {
          return {
            issues: [],
            summary: normalized.slice(0, 2000),
            strengths: [],
            weaknesses: ['Модель вернула неструктурированный ответ без массива issues.'],
          };
        }
        throw new Error('AI response is not valid JSON');
      }
      try {
        value = JSON.parse(normalized.slice(start, end + 1));
      } catch {
        throw new Error('AI response is not valid JSON');
      }
    }
    if (!value || typeof value !== 'object')
      throw new Error('AI response must contain issues array');
    const object = value as Record<string, unknown>;
    // Small local models sometimes wrap the same review in a prose-oriented
    // `reviewSummary` object. Normalize that shape into the stable API
    // contract instead of failing an otherwise usable review.
    const wrapped = object.reviewSummary;
    const reviewObject =
      object.review && typeof object.review === 'object'
        ? (object.review as Record<string, unknown>)
        : undefined;
    const nestedReview =
      reviewObject ??
      Object.values(object).find((candidate): candidate is Record<string, unknown> =>
        Boolean(
          candidate &&
          typeof candidate === 'object' &&
          Array.isArray((candidate as Record<string, unknown>).issues),
        ),
      );
    const issuesSource = Array.isArray(object.issues)
      ? object.issues
      : Array.isArray(nestedReview?.issues)
        ? nestedReview.issues
        : wrapped && typeof wrapped === 'object'
          ? [wrapped]
          : undefined;
    if (!issuesSource) {
      const hasReviewSignals =
        'review' in object ||
        'reviewSummary' in object ||
        'overallAssessment' in object ||
        'summary' in object ||
        Array.isArray(object.files) ||
        Array.isArray(object.selection);
      if (!hasReviewSignals && !(nestedReview && typeof nestedReview.summary === 'string'))
        throw new Error('AI response must contain issues array');
      return {
        issues: [],
        summary:
          typeof object.summary === 'string'
            ? object.summary
            : typeof nestedReview?.summary === 'string'
              ? nestedReview.summary
              : Array.isArray(object.files) || Array.isArray(object.selection)
                ? 'Модель вернула список выбранных файлов вместо структурированного ревью.'
                : 'Модель вернула обзор без структурированных findings.',
        strengths: [],
        weaknesses: ['Ответ модели не содержит структурированный массив issues.'],
      };
    }
    const summary =
      typeof object.summary === 'string'
        ? object.summary
        : typeof nestedReview?.summary === 'string'
          ? nestedReview.summary
          : wrapped &&
              typeof wrapped === 'object' &&
              typeof (wrapped as Record<string, unknown>).problem === 'string'
            ? String((wrapped as Record<string, unknown>).problem)
            : undefined;
    const assessment =
      (object.overallAssessment && typeof object.overallAssessment === 'object'
        ? object.overallAssessment
        : nestedReview?.overallAssessment) &&
      typeof (object.overallAssessment ?? nestedReview?.overallAssessment) === 'object'
        ? ((object.overallAssessment ?? nestedReview?.overallAssessment) as Record<string, unknown>)
        : undefined;
    const issues = issuesSource.map((issue) => {
      if (!issue || typeof issue !== 'object') throw new Error('AI response has invalid fields');
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
      const rawLineStart = item.startLine ?? item.lineStart ?? item.line;
      const rawLineEnd = item.endLine ?? item.lineEnd ?? item.line ?? rawLineStart;
      const lineStart = rawLineStart === undefined ? undefined : Number(rawLineStart);
      const lineEnd = rawLineEnd === undefined ? undefined : Number(rawLineEnd);
      if (
        !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(severity) ||
        typeof file !== 'string' ||
        typeof problem !== 'string' ||
        typeof recommendation !== 'string' ||
        (lineStart !== undefined &&
          (!Number.isInteger(lineStart) ||
            lineStart < 1 ||
            lineEnd === undefined ||
            !Number.isInteger(lineEnd) ||
            lineEnd < lineStart))
      )
        throw new Error('AI response has invalid fields');
      const rawPatch = item.suggestedPatch ?? item.patch ?? item.codeFix;
      const patch =
        rawPatch && typeof rawPatch === 'object'
          ? (rawPatch as Record<string, unknown>)
          : undefined;
      const suggestedPatch =
        patch && typeof patch.before === 'string' && typeof patch.after === 'string'
          ? {
              before: patch.before,
              after: patch.after,
              ...(typeof patch.startLine === 'number' ? { startLine: patch.startLine } : {}),
              ...(typeof patch.endLine === 'number' ? { endLine: patch.endLine } : {}),
            }
          : undefined;
      return {
        ...item,
        severity,
        file,
        problem,
        recommendation,
        ...(lineStart !== undefined ? { line: lineStart, lineStart, lineEnd } : {}),
        ...(suggestedPatch ? { suggestedPatch } : {}),
        ...(item.category !== undefined && categories.includes(String(item.category).toUpperCase())
          ? { category: String(item.category).toUpperCase() }
          : {}),
      } as unknown as AIReviewResult['issues'][number];
    });
    return {
      issues,
      summary,
      strengths: Array.isArray(object.strengths)
        ? (object.strengths as string[])
        : Array.isArray(assessment?.strengths)
          ? (assessment.strengths as string[])
          : [],
      weaknesses: Array.isArray(object.weaknesses)
        ? (object.weaknesses as string[])
        : Array.isArray(assessment?.weaknesses)
          ? (assessment.weaknesses as string[])
          : [],
    };
  }
}
