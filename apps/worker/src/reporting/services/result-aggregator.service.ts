import { Inject, Injectable } from '@nestjs/common';
import type { AIReviewResult } from '../../ai/types/ai.types';
import type { ReportIssue } from '../types/report.types';
import { IssueDeduplicatorService } from './issue-deduplicator.service';
import { IssueNormalizerService } from './issue-normalizer.service';

@Injectable()
export class ResultAggregatorService {
  constructor(
    @Inject(IssueNormalizerService) private readonly normalizer: IssueNormalizerService,
    @Inject(IssueDeduplicatorService) private readonly deduplicator: IssueDeduplicatorService,
  ) {}
  aggregate(results: AIReviewResult[]): {
    issues: ReportIssue[];
    strengths: string[];
    weaknesses: string[];
    summary: string;
  } {
    const issues = this.deduplicator.deduplicate(
      this.normalizer.normalize(results.flatMap((result) => result.issues)),
    );
    return {
      issues,
      strengths: [...new Set(results.flatMap((result) => result.strengths ?? []))],
      weaknesses: [...new Set(results.flatMap((result) => result.weaknesses ?? []))],
      summary:
        results
          .map((result) => result.summary)
          .filter(Boolean)
          .join(' ') ||
        'The supplied project files were reviewed across architecture, bugs, security, quality and performance. No confirmed findings were returned by the model; this does not replace a manual review.',
    };
  }
}
