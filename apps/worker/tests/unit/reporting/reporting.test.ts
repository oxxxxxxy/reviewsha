import { describe, expect, it } from 'vitest';
import { IssueNormalizerService } from '../../../src/reporting/services/issue-normalizer.service';
import { IssueDeduplicatorService } from '../../../src/reporting/services/issue-deduplicator.service';
import { ResultAggregatorService } from '../../../src/reporting/services/result-aggregator.service';
import { ReportGeneratorService } from '../../../src/reporting/services/report-generator.service';
import { MarkdownReportBuilder } from '../../../src/reporting/builders/markdown.builder';
import { JsonReportBuilder } from '../../../src/reporting/builders/json.builder';
import type { AIReviewIssue, AIReviewResult } from '../../../src/ai/types/ai.types';

const issue = (severity: AIReviewIssue['severity'] = 'HIGH'): AIReviewIssue => ({
  severity,
  file: 'src/auth.ts',
  line: 4,
  problem: 'Security token issue',
  recommendation: 'Rotate the token',
});
const result = (items: AIReviewIssue[] = [issue()]): AIReviewResult => ({
  issues: items,
  summary: 'Review summary',
  strengths: ['Tests'],
  weaknesses: ['Security'],
});

describe('reporting pipeline', () => {
  it('normalizes issues', () => {
    const normalized = new IssueNormalizerService().normalize([issue()]);
    expect(normalized[0]).toMatchObject({
      filePath: 'src/auth.ts',
      category: 'SECURITY',
      title: 'Security token issue',
    });
  });
  it('deduplicates equivalent issues', () => {
    const normalized = new IssueNormalizerService().normalize([issue(), issue()]);
    expect(new IssueDeduplicatorService().deduplicate(normalized)).toHaveLength(1);
  });
  it('keeps different issues', () => {
    const normalizer = new IssueNormalizerService();
    const one = normalizer.normalize([issue()])[0]!;
    const two = normalizer.normalize([{ ...issue(), file: 'src/db.ts' }])[0]!;
    expect(new IssueDeduplicatorService().deduplicate([one, two])).toHaveLength(2);
  });
  it('aggregates responses and unique strengths', () => {
    const service = new ResultAggregatorService(
      new IssueNormalizerService(),
      new IssueDeduplicatorService(),
    );
    const aggregate = service.aggregate([result(), result()]);
    expect(aggregate.issues).toHaveLength(1);
    expect(aggregate.strengths).toEqual(['Tests']);
  });
  it('handles empty results', () => {
    const service = new ResultAggregatorService(
      new IssueNormalizerService(),
      new IssueDeduplicatorService(),
    );
    expect(service.aggregate([]).issues).toEqual([]);
  });
  it.each([
    ['CRITICAL', 80],
    ['HIGH', 90],
    ['MEDIUM', 95],
    ['LOW', 98],
    ['INFO', 100],
  ] as const)('calculates %s score', (severity, score) =>
    expect(
      new ReportGeneratorService({
        aggregate: () => ({ issues: [{ severity }], strengths: [], weaknesses: [], summary: '' }),
      } as never).generate([]).score,
    ).toBe(score),
  );
  it('generates report with recommendations', () => {
    const service = new ReportGeneratorService({
      aggregate: () => ({
        issues: [{ severity: 'HIGH', recommendation: 'Fix it' }],
        strengths: [],
        weaknesses: [],
        summary: 'x',
      }),
    } as never);
    expect(service.generate([]).recommendations).toEqual(['Fix it']);
  });
  it('clamps score at zero', () =>
    expect(
      new ReportGeneratorService({
        aggregate: () => ({
          issues: ['SECURITY', 'ARCHITECTURE', 'BUG', 'QUALITY'].map((category) => ({
            severity: 'CRITICAL',
            category,
          })),
          strengths: [],
          weaknesses: [],
          summary: '',
        }),
      } as never).generate([]).score,
    ).toBe(0));
  it.each([
    ['SECURITY', 70],
    ['ARCHITECTURE', 75],
    ['BUG', 75],
    ['QUALITY', 80],
  ])('applies the documented %s category weight', (category, expected) =>
    expect(
      new ReportGeneratorService({
        aggregate: () => ({
          issues: [{ severity: 'CRITICAL', category }],
          strengths: [],
          weaknesses: [],
          summary: '',
        }),
      } as never).generate([]).score,
    ).toBe(expected),
  );
  it('builds markdown', () => {
    const report = new ReportGeneratorService(
      new ResultAggregatorService(new IssueNormalizerService(), new IssueDeduplicatorService()),
    ).generate([result()]);
    const markdown = new MarkdownReportBuilder().build(report);
    expect(markdown).toContain('# Code Review Report');
    expect(markdown).toContain('src/auth.ts');
  });
  it('builds JSON', () => {
    const report = new ReportGeneratorService(
      new ResultAggregatorService(new IssueNormalizerService(), new IssueDeduplicatorService()),
    ).generate([result()]);
    expect(JSON.parse(new JsonReportBuilder().build(report))).toMatchObject({
      version: '1.0',
      score: 85,
    });
  });
  it('escapes an empty issue list in markdown', () => {
    const report = new ReportGeneratorService(
      new ResultAggregatorService(new IssueNormalizerService(), new IssueDeduplicatorService()),
    ).generate([]);
    expect(new MarkdownReportBuilder().build(report)).toContain('No issues found');
  });
});
