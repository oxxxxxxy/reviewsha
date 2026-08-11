import { Inject, Injectable } from '@nestjs/common';
import type { AIReviewResult } from '../../ai/types/ai.types';
import type { AnalysisReport } from '../types/report.types';
import { ResultAggregatorService } from './result-aggregator.service';

@Injectable()
export class ReportGeneratorService {
  constructor(
    @Inject(ResultAggregatorService) private readonly aggregator: ResultAggregatorService,
  ) {}
  generate(
    results: AIReviewResult[],
    fileReviews: AnalysisReport['fileReviews'] = [],
  ): AnalysisReport {
    const aggregate = this.aggregator.aggregate(results);
    return {
      version: '1.0',
      score: this.score(aggregate.issues),
      summary: aggregate.summary,
      issues: aggregate.issues,
      recommendations: aggregate.issues.map((issue) => issue.recommendation),
      strengths: aggregate.strengths,
      weaknesses: aggregate.weaknesses,
      fileReviews,
    };
  }
  score(issues: Array<{ severity: string; category?: string }>): number {
    const severityPenalty = { CRITICAL: 100, HIGH: 50, MEDIUM: 25, LOW: 10, INFO: 2 } as Record<
      string,
      number
    >;
    const groups = {
      security: { weight: 0.3, categories: ['SECURITY'] },
      architecture: { weight: 0.25, categories: ['ARCHITECTURE'] },
      bugs: { weight: 0.25, categories: ['BUG'] },
      quality: {
        weight: 0.2,
        categories: [
          'PERFORMANCE',
          'QUALITY',
          'STYLE',
          'DOCUMENTATION',
          'MAINTAINABILITY',
          'TESTING',
        ],
      },
    };
    let score = 100;
    for (const group of Object.values(groups)) {
      const groupPenalty = issues
        .filter((issue) => group.categories.includes(issue.category ?? 'QUALITY'))
        .reduce((sum, issue) => sum + (severityPenalty[issue.severity] ?? 0), 0);
      score -= Math.min(100, groupPenalty) * group.weight;
    }
    return Math.round(Math.max(0, Math.min(100, score)));
  }
}
