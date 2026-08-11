import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../../common/auth/types/auth.types';
import { decryptSetting, encryptSetting } from '../../common/security/settings-cipher';
import {
  AdminAiConnectionResponseDto,
  AdminAiSettingsResponseDto,
  UpdateAdminAiSettingsDto,
} from './dto/admin-ai-settings.dto';

const AI_SETTINGS_KEY = 'ai.runtime';

type StoredAiSettings = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  retryAttempts: number;
  maxConcurrency: number;
};

@Injectable()
export class AdminAiSettingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async get(): Promise<AdminAiSettingsResponseDto> {
    const [settings, availableModels] = await Promise.all([
      this.load(),
      this.models().catch(() => []),
    ]);
    return this.response(settings, availableModels);
  }

  async update(
    actor: AuthenticatedUser,
    dto: UpdateAdminAiSettingsDto,
  ): Promise<AdminAiSettingsResponseDto> {
    const current = await this.load();
    const next: StoredAiSettings = {
      ...current,
      ...(dto.provider === undefined ? {} : { provider: dto.provider.trim() }),
      ...(dto.baseUrl === undefined ? {} : { baseUrl: dto.baseUrl.replace(/\/+$/u, '') }),
      ...(dto.model === undefined ? {} : { model: dto.model.trim() }),
      ...(dto.maxTokens === undefined ? {} : { maxTokens: dto.maxTokens }),
      ...(dto.temperature === undefined ? {} : { temperature: dto.temperature }),
      ...(dto.timeoutMs === undefined ? {} : { timeoutMs: dto.timeoutMs }),
      ...(dto.retryAttempts === undefined ? {} : { retryAttempts: dto.retryAttempts }),
      ...(dto.maxConcurrency === undefined ? {} : { maxConcurrency: dto.maxConcurrency }),
    };
    if (dto.clearApiKey) delete next.apiKey;
    if (dto.apiKey !== undefined && dto.apiKey.trim()) next.apiKey = dto.apiKey.trim();

    const encryptionKey = this.encryptionKey();
    const saved = await this.prisma.systemSetting.upsert({
      where: { key: AI_SETTINGS_KEY },
      create: {
        key: AI_SETTINGS_KEY,
        value: encryptSetting(JSON.stringify(next), encryptionKey),
        updatedById: actor.id,
      },
      update: {
        value: encryptSetting(JSON.stringify(next), encryptionKey),
        updatedById: actor.id,
      },
    });
    const availableModels = await this.models(next).catch(() => []);
    return { ...this.response(next, availableModels), updatedAt: saved.updatedAt.toISOString() };
  }

  async testConnection(): Promise<AdminAiConnectionResponseDto> {
    const settings = await this.load();
    const started = Date.now();
    try {
      const models = await this.models(settings);
      return {
        ok: true,
        message: 'OmniRoute is reachable and returned its model catalog.',
        modelsCount: models.length,
        latencyMs: Date.now() - started,
        model: settings.model,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'OmniRoute connection failed.',
        modelsCount: 0,
        latencyMs: Date.now() - started,
        model: settings.model,
      };
    }
  }

  async models(settings?: StoredAiSettings): Promise<string[]> {
    const current = settings ?? (await this.load());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(`${current.baseUrl.replace(/\/+$/u, '')}/models`, {
        headers: current.apiKey ? { authorization: `Bearer ${current.apiKey}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OmniRoute returned HTTP ${response.status}`);
      const payload = (await response.json()) as { data?: Array<{ id?: string }> };
      return (payload.data ?? []).flatMap((model) => (model.id ? [model.id] : []));
    } finally {
      clearTimeout(timer);
    }
  }

  private async load(): Promise<StoredAiSettings> {
    const record = await this.prisma.systemSetting.findUnique({ where: { key: AI_SETTINGS_KEY } });
    const defaults: StoredAiSettings = {
      provider: process.env.AI_PROVIDER ?? 'deepseek',
      baseUrl: process.env.OMNIROUTER_BASE_URL ?? 'http://localhost:20128/v1',
      model: process.env.AI_MODEL ?? 'auto/best-coding',
      apiKey: process.env.OMNIROUTER_API_KEY,
      maxTokens: Number(process.env.AI_MAX_TOKENS ?? 6000),
      temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
      timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 60000),
      retryAttempts: Number(process.env.AI_RETRY_ATTEMPTS ?? 3),
      maxConcurrency: Number(process.env.AI_MAX_CONCURRENCY ?? 3),
    };
    if (!record) return defaults;
    try {
      const parsed = JSON.parse(
        decryptSetting(record.value, this.encryptionKey()),
      ) as Partial<StoredAiSettings>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  private response(
    settings: StoredAiSettings,
    availableModels: string[],
  ): AdminAiSettingsResponseDto {
    return {
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      dashboardUrl: process.env.OMNIROUTE_DASHBOARD_URL ?? this.dashboardUrl(settings.baseUrl),
      model: settings.model,
      apiKeyConfigured: Boolean(settings.apiKey),
      apiKeyMasked: settings.apiKey ? this.mask(settings.apiKey) : null,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      timeoutMs: settings.timeoutMs,
      retryAttempts: settings.retryAttempts,
      maxConcurrency: settings.maxConcurrency,
      availableModels,
      updatedAt: null,
    };
  }

  private mask(value: string): string {
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
  }

  private dashboardUrl(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      return `${url.origin}`;
    } catch {
      return baseUrl.replace(/\/v1\/?$/u, '');
    }
  }

  private encryptionKey(): string {
    return (
      this.config.get<string>('security.internalApiKey') ?? 'reviewsha-internal-api-key-change-me'
    );
  }
}
