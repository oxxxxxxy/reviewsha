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
      title: issue.problem.slice(0, 120),
      description: issue.problem,
      filePath: issue.file,
    }));
  }
  private category(issue: AIReviewIssue): string {
    const text = `${issue.problem} ${issue.recommendation}`.toLowerCase();
    return text.includes('security') || text.includes('token') || text.includes('injection')
      ? 'SECURITY'
      : text.includes('performance')
        ? 'PERFORMANCE'
        : 'QUALITY';
  }
}
