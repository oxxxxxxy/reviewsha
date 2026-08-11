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
    const files = report.fileReviews.length
      ? report.fileReviews
          .map(
            (file) =>
              `### \`${file.path}\`\n\n${file.summary}\n\n**Strengths:** ${file.strengths.join('; ') || '—'}\n\n**Risks:** ${file.weaknesses.join('; ') || '—'}`,
          )
          .join('\n\n')
      : 'No file-level reviews available.';
    return `# Code Review Report\n\n## Quality score\n\n${report.score}/100\n\n## Project review\n\n${report.summary}\n\n## File-by-file review\n\n${files}\n\n## Issues\n\n${issues}\n\n## Recommendations\n\n${recommendations}\n`;
  }
}
