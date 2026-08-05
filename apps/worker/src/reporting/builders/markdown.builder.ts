import { Injectable } from '@nestjs/common';
import type { AnalysisReport } from '../types/report.types';

@Injectable()
export class MarkdownReportBuilder {
  build(report: AnalysisReport): string {
    const issues = report.issues.length
      ? report.issues
          .map(
            (issue, index) =>
              `${index + 1}. **${issue.severity}** \`${issue.filePath}\`${issue.line ? `:${issue.line}` : ''} — ${issue.description}\n   - Recommendation: ${issue.recommendation}`,
          )
          .join('\n')
      : 'No issues found.';
    const recommendations =
      report.recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n') || 'None.';
    return `# Code Review Report\n\n## Score\n\n${report.score}/100\n\n## Summary\n\n${report.summary}\n\n## Issues\n\n${issues}\n\n## Recommendations\n\n${recommendations}\n`;
  }
}
