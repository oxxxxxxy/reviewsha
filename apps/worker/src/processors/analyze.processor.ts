import { Inject, Injectable, Optional } from '@nestjs/common';
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
import { AIRuntimeSettingsService } from '../ai/services/ai-runtime-settings.service';
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
    @Optional()
    @Inject(AIRuntimeSettingsService)
    private readonly runtimeSettings?: AIRuntimeSettingsService,
  ) {}

  async execute(job: Job): Promise<QueueJobResult> {
    const payload = payloadOf(job);
    const paths = await this.workspace.create(payload.pipelineId!);
    const context = JSON.parse(
      await readFile(`${paths.output}/context.json`, 'utf8'),
    ) as MergedContext;
    const scan = await this.db.scan.findUnique({ where: { id: payload.pipelineId } });
    if (!scan) throw new Error(`Analysis not found: ${payload.pipelineId}`);
    await assertPipelineActive(this.db, scan.id);

    await this.db.scan.update({
      where: { id: scan.id },
      data: { status: ScanStatus.ANALYZING, pipelineStep: PipelineStep.ANALYZE, progress: 60 },
    });

    const cacheKey = createHash('sha256')
      .update(JSON.stringify({ files: context.files, statistics: context.statistics }))
      .digest('hex');
    const cached = await this.db.analysisContext.findFirst({ where: { cacheKey } });
    let metadata: ReturnType<AIProjectParser['parse']>;
    let metadataForStorage: Record<string, unknown>;
    let allChunks: ReturnType<ChunkBuilderService['build']>;
    let sourceFiles: AIFile[];
    if (cached) {
      metadata = cached.metadata as unknown as ReturnType<AIProjectParser['parse']>;
      allChunks = cached.chunks as unknown as ReturnType<ChunkBuilderService['build']>;
      sourceFiles = await this.loadFiles(paths.extracted, context.files ?? []);
      metadataForStorage = {
        ...(cached.metadata as Record<string, unknown>),
        sourceFiles: this.sourceSnapshots(sourceFiles),
      };
      await this.db.analysisContext.upsert({
        where: { scanId: scan.id },
        create: {
          projectId: payload.projectId,
          scanId: scan.id,
          cacheKey,
          metadata: metadataForStorage as Prisma.InputJsonValue,
          chunks: cached.chunks as Prisma.InputJsonValue,
        },
        update: {
          cacheKey,
          metadata: metadataForStorage as Prisma.InputJsonValue,
          chunks: cached.chunks as Prisma.InputJsonValue,
        },
      });
    } else {
      const files = await this.loadFiles(paths.extracted, context.files ?? []);
      sourceFiles = files;
      metadata = this.projectParser.parse({
        projectId: payload.projectId,
        files,
        structure: context.structure ?? [],
        languages: context.languages,
        metadata: context.statistics,
      });
      metadataForStorage = {
        ...(metadata as unknown as Record<string, unknown>),
        sourceFiles: this.sourceSnapshots(sourceFiles),
      };
      allChunks = [
        this.chunks.buildArchitecture(metadata, context.structure ?? []),
        ...this.chunks.build(files, { maxTokens: 2500, maxChunks: 100 }),
      ];
      await this.db.analysisContext.upsert({
        where: { scanId: scan.id },
        create: {
          projectId: payload.projectId,
          scanId: scan.id,
          cacheKey,
          metadata: metadataForStorage as Prisma.InputJsonValue,
          chunks: allChunks as unknown as Prisma.InputJsonValue,
        },
        update: {
          cacheKey,
          metadata: metadataForStorage as Prisma.InputJsonValue,
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
    const runtime = this.runtimeSettings ? await this.runtimeSettings.get() : undefined;
    const mergeFiles = runtime?.mergeFiles ?? this.config.get<boolean>('worker.aiMergeFiles', true);
    const maxAnalysisFiles = Math.min(
      10,
      Math.max(
        1,
        runtime?.maxAnalysisFiles ?? this.config.get<number>('worker.aiMaxAnalysisFiles', 3),
      ),
    );
    let selectedPaths = filePaths.slice(0, maxAnalysisFiles);
    if (mergeFiles) {
      await this.db.scan.update({ where: { id: scan.id }, data: { progress: 61 } });
      const selectionKey = 'file-selection';
      const selectionPrompt = this.prompts.buildFileSelection(
        (context.structure ?? filePaths).map((path) => ({
          path,
          preview: sourceFiles.find((file) => file.path === path)?.content?.slice(0, 100),
        })),
        maxAnalysisFiles,
        scan.reviewLanguage === 'en' ? 'en' : 'ru',
      );
      let selectionRequest = await this.db.aIRequest.findFirst({
        where: { scanId: scan.id, chunkId: selectionKey },
        orderBy: { createdAt: 'desc' },
      });
      try {
        if (selectionRequest?.status === AIRequestStatus.COMPLETED) {
          const saved = await this.db.aIResponse.findUnique({
            where: { requestId: selectionRequest.id },
          });
          const savedResult = saved?.result as { files?: unknown } | null;
          const savedFiles = Array.isArray(savedResult?.files)
            ? savedResult.files.filter((path): path is string => typeof path === 'string')
            : [];
          if (savedFiles.length) selectedPaths = savedFiles.slice(0, maxAnalysisFiles);
        } else {
          selectionRequest = selectionRequest
            ? await this.db.aIRequest.update({
                where: { id: selectionRequest.id },
                data: {
                  provider: 'omnirouter',
                  model: this.config.getOrThrow<string>('worker.aiModel'),
                  prompt: selectionPrompt.prompt,
                  status: AIRequestStatus.SENT,
                  error: null,
                  completedAt: null,
                },
              })
            : await this.db.aIRequest.create({
                data: {
                  scanId: scan.id,
                  userId: scan.createdById,
                  provider: 'omnirouter',
                  model: this.config.getOrThrow<string>('worker.aiModel'),
                  chunkId: selectionKey,
                  prompt: selectionPrompt.prompt,
                  status: AIRequestStatus.SENT,
                },
              });
          const selection = await this.ai.selectFiles(selectionPrompt, maxAnalysisFiles);
          await this.db.aIRequest.update({
            where: { id: selectionRequest.id },
            data: {
              status: AIRequestStatus.COMPLETED,
              promptTokens: selection.response.promptTokens,
              completionTokens: selection.response.completionTokens,
              totalTokens: selection.response.totalTokens,
              completedAt: new Date(),
            },
          });
          await this.db.aIResponse.upsert({
            where: { requestId: selectionRequest.id },
            create: {
              requestId: selectionRequest.id,
              content: selection.response.content,
              result: selection.result as unknown as Prisma.InputJsonValue,
              promptTokens: selection.response.promptTokens,
              completionTokens: selection.response.completionTokens,
              totalTokens: selection.response.totalTokens,
            },
            update: {
              content: selection.response.content,
              result: selection.result as unknown as Prisma.InputJsonValue,
              promptTokens: selection.response.promptTokens,
              completionTokens: selection.response.completionTokens,
              totalTokens: selection.response.totalTokens,
            },
          });
          selectedPaths = selection.result.files.slice(0, maxAnalysisFiles);
          await this.db.scan.update({ where: { id: scan.id }, data: { progress: 65 } });
        }
        const allowed = new Set(filePaths);
        const selected = selectedPaths.filter((path) => allowed.has(path));
        // A malformed model response must never erase the deterministic
        // fallback selection. Keep only paths that are present in the
        // extracted project and fall back when the model returned none.
        selectedPaths = selected.length ? selected : filePaths.slice(0, maxAnalysisFiles);
      } catch (error) {
        if (selectionRequest) {
          await this.db.aIRequest.update({
            where: { id: selectionRequest.id },
            data: {
              status: AIRequestStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown file selection error',
              completedAt: new Date(),
            },
          });
        }
        this.logger.warn(
          `File selection failed; using deterministic top files: ${error instanceof Error ? error.message : 'unknown'}`,
          'AnalyzeProcessor',
        );
      }
    }
    // Always include the root README when it exists: it is project-level
    // context, not merely another candidate file for the selector.
    const rootReadme = sourceFiles.find((file) => file.path.toLowerCase() === 'readme.md');
    const selectedPathsWithReadme =
      rootReadme && !selectedPaths.includes(rootReadme.path)
        ? [...selectedPaths, rootReadme.path]
        : selectedPaths;
    const selectedFiles = sourceFiles.filter((file) => selectedPathsWithReadme.includes(file.path));
    const selectedChunks = [
      allChunks.find((chunk) => chunk.type === 'architecture') ??
        this.chunks.buildArchitecture(metadata, context.structure ?? []),
      ...this.chunks.build(selectedFiles, {
        maxTokens: 2_500,
        maxChunks: Math.min(maxAnalysisFiles + 1, selectedFiles.length),
      }),
    ];
    const reviewTasks = mergeFiles
      ? [{ task: 'architecture' as AITask, filePath: undefined as string | undefined }]
      : [
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
      if (requestsToday + reviewTasks.length + (mergeFiles ? 1 : 0) > dailyLimit) {
        throw new Error('AI_DAILY_REQUEST_LIMIT_EXCEEDED');
      }
    }
    let completedReviews = 0;
    const generatedTasks = await Promise.all(
      reviewTasks.map(async ({ task, filePath }) => {
        await assertPipelineActive(this.db, scan.id);
        // Keep the database row stable across BullMQ retries. The previous
        // implementation created a new AIRequest on every stage attempt,
        // which inflated review progress and charged duplicate requests.
        const reviewKey = filePath ? `file:${filePath}` : `project:${task}`;
        const request = filePath
          ? this.prompts.buildFileReview(
              filePath,
              allChunks,
              metadata as unknown as Record<string, unknown>,
              this.config.get<number>('worker.aiInputMaxTokens', 2_500),
              scan.reviewLanguage === 'en' ? 'en' : 'ru',
            )
          : mergeFiles
            ? this.prompts.buildMergedProjectReview(
                selectedChunks,
                metadata as unknown as Record<string, unknown>,
                this.config.get<number>('worker.aiInputMaxTokens', 2_500),
                scan.reviewLanguage === 'en' ? 'en' : 'ru',
              )
            : this.prompts.buildProjectReview(
                allChunks,
                metadata as unknown as Record<string, unknown>,
                this.config.get<number>('worker.aiInputMaxTokens', 2_500),
                scan.reviewLanguage === 'en' ? 'en' : 'ru',
              );
        const startedAt = Date.now();
        const existingRequest = await this.db.aIRequest.findFirst({
          where: { scanId: scan.id, chunkId: reviewKey },
          orderBy: { createdAt: 'desc' },
        });
        if (existingRequest?.status === AIRequestStatus.COMPLETED) {
          const existingResponse = await this.db.aIResponse.findUnique({
            where: { requestId: existingRequest.id },
          });
          if (existingResponse?.result && typeof existingResponse.result === 'object') {
            completedReviews += 1;
            await this.db.scan.update({
              where: { id: scan.id },
              data: {
                progress: 65 + Math.floor((completedReviews / reviewTasks.length) * 20),
              },
            });
            return {
              result: existingResponse.result as unknown as AIReviewResult,
              tokens: existingResponse.totalTokens,
              filePath,
            };
          }
        }
        const requestRecord = existingRequest
          ? await this.db.aIRequest.update({
              where: { id: existingRequest.id },
              data: {
                provider: 'omnirouter',
                model: this.config.getOrThrow<string>('worker.aiModel'),
                chunkId: reviewKey,
                prompt: request.prompt,
                status: AIRequestStatus.SENT,
                error: null,
                completedAt: null,
              },
            })
          : await this.db.aIRequest.create({
              data: {
                scanId: scan.id,
                userId: scan.createdById,
                provider: 'omnirouter',
                model: this.config.getOrThrow<string>('worker.aiModel'),
                chunkId: reviewKey,
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
          const responseData = {
            content: generated.response.content,
            result: generated.result as unknown as Prisma.InputJsonValue,
            promptTokens: generated.response.promptTokens,
            completionTokens: generated.response.completionTokens,
            totalTokens: generated.response.totalTokens,
            durationMs: Date.now() - startedAt,
          };
          // A BullMQ retry can finish a provider call after the previous
          // attempt already persisted its response. Upsert the one-to-one
          // response instead of turning that harmless race into a failure.
          await this.db.aIResponse.upsert({
            where: { requestId: requestRecord.id },
            create: { requestId: requestRecord.id, ...responseData },
            update: responseData,
          });
          completedReviews += 1;
          await this.db.scan.update({
            where: { id: scan.id },
            data: {
              // 65% is reached after file selection; 20% is distributed over
              // the merged project review.
              progress: 65 + Math.floor((completedReviews / reviewTasks.length) * 20),
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
          content: this.numberLines(this.secrets.redact(content)),
          sourceContent: this.secrets.redact(content),
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

  private numberLines(content: string): string {
    const lines = content.split(/\r?\n/);
    const width = String(lines.length).length;
    return lines
      .map((line, index) => `${String(index + 1).padStart(width, ' ')} | ${line}`)
      .join('\n');
  }

  private sourceSnapshots(files: AIFile[]) {
    return files.map((file) => ({
      path: file.path,
      language: file.language,
      size: file.size,
      role: file.role,
      content: file.sourceContent ?? '',
    }));
  }
}
