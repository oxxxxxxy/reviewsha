import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AIReviewIssue } from '../../ai/types/ai.types';
import type { ReportIssue } from '../types/report.types';

@Injectable()
export class IssueNormalizerService {
  normalize(issues: AIReviewIssue[]): ReportIssue[] {
    return issues.map((issue) => ({
      ...issue,
      id: randomUUID(),
      category: this.category(issue),
      title: issue.problem,
      description: issue.problem,
      filePath: issue.file,
    }));
  }
  private category(issue: AIReviewIssue): NonNullable<AIReviewIssue['category']> {
    if (issue.category) return issue.category;
    const text = `${issue.problem} ${issue.recommendation}`.toLowerCase();
    return text.includes('security') || text.includes('token') || text.includes('injection')
      ? 'SECURITY'
      : text.includes('performance')
        ? 'PERFORMANCE'
        : text.includes('bug') || text.includes('error')
          ? 'BUG'
          : text.includes('architecture') || text.includes('dependency')
            ? 'ARCHITECTURE'
            : text.includes('documentation') || text.includes('readme')
              ? 'DOCUMENTATION'
              : text.includes('style') || text.includes('format')
                ? 'STYLE'
                : 'QUALITY';
  }
}
