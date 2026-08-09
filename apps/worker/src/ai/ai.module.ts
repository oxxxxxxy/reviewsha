import { Module } from '@nestjs/common';
import { AIProjectParser } from './parser/ai-project.parser';
import { ChunkBuilderService } from './chunks/chunk-builder.service';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptBuilderService } from './prompts/prompt-builder.service';
import { AIResponseValidator } from './services/ai-response.validator';
import { AIService } from './services/ai.service';
import { OmniRouterProvider } from './providers/omni-router.provider';
import type { AIProvider } from './providers/ai-provider.interface';
import { ConfigService } from '@nestjs/config';
import { MockAIProvider } from './providers/mock-ai.provider';
import { SecretRedactorService } from './services/secret-redactor.service';

@Module({
  providers: [
    AIProjectParser,
    ChunkBuilderService,
    ContextBuilderService,
    PromptBuilderService,
    AIResponseValidator,
    SecretRedactorService,
    OmniRouterProvider,
    MockAIProvider,
    {
      provide: 'AI_PROVIDER',
      useFactory: (
        config: ConfigService,
        omniRouter: OmniRouterProvider,
        mock: MockAIProvider,
      ): AIProvider => (config.get<string>('worker.aiProvider') === 'mock' ? mock : omniRouter),
      inject: [ConfigService, OmniRouterProvider, MockAIProvider],
    },
    {
      provide: AIService,
      useFactory: (provider: AIProvider, validator: AIResponseValidator, config: ConfigService) =>
        new AIService(provider, validator, config),
      inject: ['AI_PROVIDER', AIResponseValidator, ConfigService],
    },
  ],
  exports: [
    AIProjectParser,
    ChunkBuilderService,
    ContextBuilderService,
    PromptBuilderService,
    AIResponseValidator,
    AIService,
    SecretRedactorService,
  ],
})
export class AIModule {}
