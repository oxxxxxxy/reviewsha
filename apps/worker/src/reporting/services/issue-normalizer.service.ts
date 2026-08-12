import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AIReviewIssue } from '../../ai/types/ai.types';
import type { ReportIssue } from '../types/report.types';

const FINDING_TITLE_MAX_LENGTH = 240;

@Injectable()
export class IssueNormalizerService {
  normalize(issues: AIReviewIssue[]): ReportIssue[] {
    return issues.map((issue) => ({
      ...issue,
      id: randomUUID(),
      category: this.category(issue),
      // Finding titles are stored in VARCHAR(240). AI providers occasionally
      // return a full explanation in `problem`, so keep the persisted title
      // within the database contract while retaining the full text below.
      title: this.limit(issue.problem, FINDING_TITLE_MAX_LENGTH),
      description: issue.problem,
      filePath: issue.file,
    }));
  }

  private limit(value: string, maxLength: number): string {
    return Array.from(value).slice(0, maxLength).join('');
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
