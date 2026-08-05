import { Injectable } from '@nestjs/common';
import type { AIReviewResult } from '../../ai/types/ai.types';
import type { AnalysisReport } from '../types/report.types';
import { ResultAggregatorService } from './result-aggregator.service';

@Injectable()
export class ReportGeneratorService {
  constructor(private readonly aggregator: ResultAggregatorService) {}
  generate(results: AIReviewResult[]): AnalysisReport {
    const aggregate = this.aggregator.aggregate(results);
    return {
      version: '1.0',
      score: this.score(aggregate.issues),
      summary: aggregate.summary,
      issues: aggregate.issues,
      recommendations: aggregate.issues.map((issue) => issue.recommendation),
      strengths: aggregate.strengths,
      weaknesses: aggregate.weaknesses,
    };
  }
  score(issues: Array<{ severity: string }>): number {
    const penalties = { CRITICAL: 25, HIGH: 15, MEDIUM: 7, LOW: 3, INFO: 1 } as Record<
      string,
      number
    >;
    return Math.max(
      0,
      Math.min(100, 100 - issues.reduce((sum, issue) => sum + (penalties[issue.severity] ?? 0), 0)),
    );
  }
}
