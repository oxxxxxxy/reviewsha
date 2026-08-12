import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkerDatabaseService } from '../../database/worker-database.service';
import { decryptSetting } from '../../common/security/settings-cipher';

export const AI_RUNTIME_SETTINGS_KEY = 'ai.runtime';

export type AIRuntimeSettings = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  retryAttempts: number;
  maxConcurrency: number;
  mergeFiles: boolean;
  maxAnalysisFiles: number;
};

@Injectable()
export class AIRuntimeSettingsService {
  constructor(
    @Inject(WorkerDatabaseService) private readonly database: WorkerDatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async get(): Promise<AIRuntimeSettings> {
    const defaults: AIRuntimeSettings = {
      provider: this.config.get<string>('worker.aiProvider', 'deepseek'),
      baseUrl: this.config.get<string>('worker.aiBaseUrl', 'https://openrouter.ai/api/v1'),
      model: this.config.get<string>('worker.aiModel', 'auto/best-coding'),
      apiKey: this.config.get<string>('worker.aiApiKey'),
      maxTokens: this.config.get<number>('worker.aiMaxTokens', 6000),
      temperature: this.config.get<number>('worker.aiTemperature', 0.2),
      timeoutMs: this.config.get<number>('worker.aiTimeoutMs', 60000),
      retryAttempts: this.config.get<number>('worker.aiRetryAttempts', 3),
      maxConcurrency: this.config.get<number>('worker.aiMaxConcurrency', 3),
      mergeFiles: this.config.get<boolean>('worker.aiMergeFiles', true),
      maxAnalysisFiles: this.config.get<number>('worker.aiMaxAnalysisFiles', 3),
    };
    const record = await this.database.systemSetting.findUnique({
      where: { key: AI_RUNTIME_SETTINGS_KEY },
    });
    if (!record) return defaults;
    try {
      const stored = JSON.parse(
        decryptSetting(record.value, this.encryptionKey()),
      ) as Partial<AIRuntimeSettings>;
      return { ...defaults, ...stored };
    } catch {
      return defaults;
    }
  }

  private encryptionKey(): string {
    return (
      this.config.get<string>('worker.settingsEncryptionKey') ??
      'reviewsha-internal-api-key-change-me'
    );
  }
}
