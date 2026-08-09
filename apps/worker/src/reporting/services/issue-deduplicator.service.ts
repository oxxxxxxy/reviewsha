import { Injectable } from '@nestjs/common';
import type { ReportIssue } from '../types/report.types';

@Injectable()
export class IssueDeduplicatorService {
  deduplicate(issues: ReportIssue[]): ReportIssue[] {
    const result: ReportIssue[] = [];
    const buckets = new Map<string, ReportIssue[]>();
    for (const issue of issues) {
      const bucketKey = `${issue.filePath.toLowerCase()}|${issue.category}`;
      const bucket = buckets.get(bucketKey) ?? [];
      if (
        bucket.some(
          (candidate) => this.similarity(candidate.description, issue.description) >= 0.85,
        )
      ) {
        continue;
      }
      bucket.push(issue);
      buckets.set(bucketKey, bucket);
      result.push(issue);
    }
    return result;
  }

  similarity(left: string, right: string): number {
    const leftTokens = this.tokens(left);
    const rightTokens = this.tokens(right);
    if (!leftTokens.size && !rightTokens.size) return 1;
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const union = new Set([...leftTokens, ...rightTokens]).size;
    return intersection / union;
  }

  private tokens(value: string): Set<string> {
    return new Set(value.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []);
  }
}
