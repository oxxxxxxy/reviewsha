import { Injectable } from '@nestjs/common';
import type { ReportIssue } from '../types/report.types';

@Injectable()
export class IssueDeduplicatorService {
  deduplicate(issues: ReportIssue[]): ReportIssue[] {
    const seen = new Set<string>();
    return issues.filter((issue) => {
      const key = `${issue.filePath}|${issue.category}|${issue.description.toLowerCase().replace(/\s+/g, ' ').trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
