import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIRequestStatus, PipelineStep, ScanStatus, type Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Job } from 'bullmq';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AIProjectParser } from '../ai/parser/ai-project.parser';
import { ChunkBuilderService } from '../ai/chunks/chunk-builder.service';
import { ContextBuilderService } from '../ai/context/context-builder.service';
import { PromptBuilderService } from '../ai/prompts/prompt-builder.service';
import { AIService } from '../ai/services/ai.service';
import { SecretRedactorService } from '../ai/services/secret-redactor.service';
import type { AIFile, AIReviewResult, AITask } from '../ai/types/ai.types';
import { WorkerLoggerService } from '../common/logger/worker-logger.service';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type { QueueJobResult } from '../queue/queue.events';
import { WorkspaceService } from '../services/workspace.service';
import type { JobHandler } from './job-handler.interface';
import { assertPipelineActive, payloadOf, saveJson } from './processing.helpers';

type MergedContext = {
  files?: Array<{ path: string; language?: string; size: number }>;
  structure?: string[];
  languages?: string[];
  statistics?: Record<string, unknown>;
  project?: Record<string, unknown>;
};

// One project-wide review plus one focused review per readable source file.
// Previously every file also triggered five category reviews, so one file
// appeared as six reviews and large projects generated an excessive number
// of slow provider calls.
const TASKS: AITask[] = ['architecture'];
const MAX_SOURCE_FILE_BYTES = 256 * 1024;

@Injectable()
export class AnalyzeProcessor implements JobHandler {
  readonly type = 'analyze';

  constructor(
    @Inject(WorkerDatabaseService) private readonly db: WorkerDatabaseService,
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(AIProjectParser) private readonly projectParser: AIProjectParser,
    @Inject(ChunkBuilderService) private readonly chunks: ChunkBuilderService,
    @Inject(ContextBuilderService) private readonly contexts: ContextBuilderService,
    @Inject(PromptBuilderService) private readonly prompts: PromptBuilderService,
    @Inject(AIService) private readonly ai: AIService,
    @Inject(SecretRedactorService) private readonly secrets: SecretRedactorService,
    @Inject(QueueService) private readonly queue: QueueService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(WorkerLoggerService) private readonly logger: WorkerLoggerService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const paths = await this.workspace.create(payload.pipelineId!);
    const context = JSON.parse(
      await readFile(`${paths.output}/context.json`, 'utf8'),
    ) as MergedContext;
    const scan = await this.db.scan.findUnique({ where: { id: payload.pipelineId } });
    if (!scan) throw new Error(`Analysis not found: ${payload.pipelineId}`);

    await this.db.scan.update({
      where: { id: scan.id },
      data: { status: ScanStatus.ANALYZING, pipelineStep: PipelineStep.ANALYZE, progress: 60 },
    });
    await assertPipelineActive(this.db, scan.id);

    const cacheKey = createHash('sha256')
      .update(JSON.stringify({ files: context.files, statistics: context.statistics }))
      .digest('hex');
    const cached = await this.db.analysisContext.findFirst({ where: { cacheKey } });
    let metadata: ReturnType<AIProjectParser['parse']>;
    let allChunks: ReturnType<ChunkBuilderService['build']>;
    if (cached) {
      metadata = cached.metadata as unknown as ReturnType<AIProjectParser['parse']>;
      allChunks = cached.chunks as unknown as ReturnType<ChunkBuilderService['build']>;
      await this.db.analysisContext.upsert({
        where: { scanId: scan.id },
        create: {
          projectId: payload.projectId,
          scanId: scan.id,
          cacheKey,
          metadata: cached.metadata as Prisma.InputJsonValue,
          chunks: cached.chunks as Prisma.InputJsonValue,
        },
        update: {
          cacheKey,
          metadata: cached.metadata as Prisma.InputJsonValue,
          chunks: cached.chunks as Prisma.InputJsonValue,
        },
      });
    } else {
      const files = await this.loadFiles(paths.extracted, context.files ?? []);
      metadata = this.projectParser.parse({
        projectId: payload.projectId,
        files,
        structure: context.structure ?? [],
        languages: context.languages,
        metadata: context.statistics,
      });
      allChunks = [
        this.chunks.buildArchitecture(metadata, context.structure ?? []),
        ...this.chunks.build(files, { maxTokens: 6000, maxChunks: 100 }),
      ];
      await this.db.analysisContext.upsert({
        where: { scanId: scan.id },
        create: {
          projectId: payload.projectId,
          scanId: scan.id,
          cacheKey,
          metadata: metadata as unknown as Prisma.InputJsonValue,
          chunks: allChunks as unknown as Prisma.InputJsonValue,
        },
        update: {
          cacheKey,
          metadata: metadata as unknown as Prisma.InputJsonValue,
          chunks: allChunks as unknown as Prisma.InputJsonValue,
        },
      });
    }
    const filePaths = [
      ...new Set(
        allChunks
          .filter((chunk) => chunk.type !== 'architecture')
          .flatMap((chunk) => chunk.filePaths),
      ),
    ];
    const reviewTasks = [
      ...TASKS.map((task) => ({ task, filePath: undefined as string | undefined })),
      ...filePaths.map((filePath) => ({ task: 'quality' as AITask, filePath })),
    ];
    if (scan.createdById) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const requestsToday = await this.db.aIRequest.count({
        where: { userId: scan.createdById, createdAt: { gte: startOfDay } },
      });
      const dailyLimit = this.config.get<number>('worker.aiDailyRequestLimit', 500);
      if (requestsToday + reviewTasks.length > dailyLimit) {
        throw new Error('AI_DAILY_REQUEST_LIMIT_EXCEEDED');
      }
    }
    let completedReviews = 0;
    const generatedTasks = await Promise.all(
      reviewTasks.map(async ({ task, filePath }) => {
        await assertPipelineActive(this.db, scan.id);
        const selected = this.contexts.select(allChunks, task, 8000);
        const request = filePath
          ? this.prompts.buildFileReview(
              filePath,
              allChunks,
              metadata as unknown as Record<string, unknown>,
              this.config.get<number>('worker.aiInputMaxTokens', 12_000),
            )
          : this.prompts.buildProjectReview(
              allChunks,
              metadata as unknown as Record<string, unknown>,
              this.config.get<number>('worker.aiInputMaxTokens', 12_000),
            );
        const startedAt = Date.now();
        const requestRecord = await this.db.aIRequest.create({
          data: {
            scanId: scan.id,
            userId: scan.createdById,
            provider: 'omnirouter',
            model: this.config.getOrThrow<string>('worker.aiModel'),
            chunkId: selected
              .map((chunk) => chunk.id)
              .join(',')
              .slice(0, 180),
            prompt: request.prompt,
            status: AIRequestStatus.SENT,
          },
        });
        try {
          const generated = await this.ai.analyze(request);
          await assertPipelineActive(this.db, scan.id);
          await this.db.aIRequest.update({
            where: { id: requestRecord.id },
            data: {
              status: AIRequestStatus.COMPLETED,
              promptTokens: generated.response.promptTokens,
              completionTokens: generated.response.completionTokens,
              totalTokens: generated.response.totalTokens,
              completedAt: new Date(),
            },
          });
          await this.db.aIResponse.create({
            data: {
              requestId: requestRecord.id,
              content: generated.response.content,
              result: generated.result as unknown as Prisma.InputJsonValue,
              promptTokens: generated.response.promptTokens,
              completionTokens: generated.response.completionTokens,
              totalTokens: generated.response.totalTokens,
              durationMs: Date.now() - startedAt,
            },
          });
          completedReviews += 1;
          await this.db.scan.update({
            where: { id: scan.id },
            data: {
              // 60% is parsing complete; 25% is distributed over the
              // project review plus one focused review per source file.
              progress: 60 + Math.floor((completedReviews / reviewTasks.length) * 25),
            },
          });
          return { result: generated.result, tokens: generated.response.totalTokens, filePath };
        } catch (error) {
          await this.db.aIRequest.update({
            where: { id: requestRecord.id },
            data: {
              status: AIRequestStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown AI error',
              completedAt: new Date(),
            },
          });
          throw error;
        }
      }),
    );
    const results: AIReviewResult[] = generatedTasks.map((item) => item.result);
    const fileReviews = generatedTasks
      .filter((item): item is typeof item & { filePath: string } => Boolean(item.filePath))
      .map((item) => ({
        path: item.filePath,
        summary: item.result.summary ?? 'The file was reviewed without a generated summary.',
        strengths: item.result.strengths ?? [],
        weaknesses: item.result.weaknesses ?? [],
      }));
    const totalTokens = generatedTasks.reduce((sum, item) => sum + item.tokens, 0);

    const model = this.config.getOrThrow<string>('worker.aiModel');
    await this.db.aIUsage.upsert({
      where: { scanId_model: { scanId: scan.id, model } },
      create: {
        scanId: scan.id,
        projectId: payload.projectId,
        userId: scan.createdById,
        model,
        tokensUsed: totalTokens,
        requestCount: results.length,
      },
      update: { tokensUsed: totalTokens, requestCount: results.length },
    });

    const data = { metadata, results, totalTokens, fileReviews };
    await assertPipelineActive(this.db, scan.id);
    await saveJson(`${paths.output}/ai-results.json`, data);
    await this.queue.enqueueJob(QUEUE_NAMES.report, 'report', payload);
    this.logger.log(
      `AI analysis completed pipelineId=${scan.id} requests=${results.length} tokens=${totalTokens}`,
      'AnalyzeProcessor',
    );
    return { status: 'completed', queue: job.queueName, jobId: String(job.id), data };
  }

  private async loadFiles(
    root: string,
    sourceFiles: Array<{ path: string; language?: string; size: number }>,
  ): Promise<AIFile[]> {
    const files: AIFile[] = [];
    for (const file of sourceFiles) {
      if (this.projectParser.isExcluded(file.path) || file.size > MAX_SOURCE_FILE_BYTES) continue;
      try {
        const content = await readFile(join(root, file.path), 'utf8');
        if (content.includes('\u0000')) continue;
        files.push({
          path: file.path,
          language: file.language,
          size: file.size,
          role: this.projectParser.classifyFile(file.path),
          content: this.secrets.redact(content),
        });
      } catch (error) {
        this.logger.warn(
          `Skipping unreadable source path=${file.path} reason=${error instanceof Error ? error.message : 'unknown'}`,
          'AnalyzeProcessor',
        );
      }
    }
    return files;
  }
}
