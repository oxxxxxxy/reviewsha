import { Inject, Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AnalyzeProcessor } from './analyze.processor';
import { CleanupProcessor } from './cleanup.processor';
import { ChatProcessor } from './chat.processor';
import { DownloadProcessor } from './download.processor';
import { ExtractProcessor } from './extract.processor';
import { MergeProcessor } from './merge.processor';
import { NotifyProcessor } from './notify.processor';
import type { JobHandler } from './job-handler.interface';
import { ParseProcessor } from './parse.processor';
import { ReportProcessor } from './report.processor';

@Injectable()
export class ProcessorRegistry {
  private readonly handlers: ReadonlyMap<string, JobHandler>;

  constructor(
    @Inject(ExtractProcessor) extract: ExtractProcessor,
    @Inject(DownloadProcessor) download: DownloadProcessor,
    @Inject(ParseProcessor) parse: ParseProcessor,
    @Inject(AnalyzeProcessor) analyze: AnalyzeProcessor,
    @Inject(MergeProcessor) merge: MergeProcessor,
    @Inject(ReportProcessor) report: ReportProcessor,
    @Inject(NotifyProcessor) notify: NotifyProcessor,
    @Inject(CleanupProcessor) cleanup: CleanupProcessor,
    @Inject(ChatProcessor) chat: ChatProcessor,
  ) {
    this.handlers = new Map<string, JobHandler>([
      [extract.type, extract],
      [download.type, download],
      [parse.type, parse],
      [analyze.type, analyze],
      [merge.type, merge],
      [report.type, report],
      [notify.type, notify],
      [cleanup.type, cleanup],
      [chat.type, chat],
    ]);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }

  async execute(
    job: Job,
  ): Promise<ReturnType<JobHandler['execute']> extends Promise<infer T> ? T : never> {
    const handler = this.get(job.name);
    if (!handler) throw new Error(`No handler registered for job type: ${job.name}`);
    return handler.execute(job);
  }
}
