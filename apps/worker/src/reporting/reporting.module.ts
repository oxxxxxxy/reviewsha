import { Module } from '@nestjs/common';
import { MarkdownReportBuilder } from './builders/markdown.builder';
import { JsonReportBuilder } from './builders/json.builder';
import { IssueDeduplicatorService } from './services/issue-deduplicator.service';
import { IssueNormalizerService } from './services/issue-normalizer.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { ResultAggregatorService } from './services/result-aggregator.service';
@Module({
  providers: [
    MarkdownReportBuilder,
    JsonReportBuilder,
    IssueDeduplicatorService,
    IssueNormalizerService,
    ResultAggregatorService,
    ReportGeneratorService,
  ],
  exports: [MarkdownReportBuilder, JsonReportBuilder, ReportGeneratorService],
})
export class ReportingModule {}
