import { Injectable } from '@nestjs/common';
import type { AnalysisReport } from '../types/report.types';
@Injectable()
export class JsonReportBuilder {
  build(report: AnalysisReport): string {
    return JSON.stringify(report, null, 2);
  }
}
