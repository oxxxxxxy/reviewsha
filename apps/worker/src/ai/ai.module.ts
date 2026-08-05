import { Module } from '@nestjs/common';
import { AIProjectParser } from './parser/ai-project.parser';
import { ChunkBuilderService } from './chunks/chunk-builder.service';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptBuilderService } from './prompts/prompt-builder.service';
import { AIResponseValidator } from './services/ai-response.validator';
import { AIService } from './services/ai.service';
import { OmniRouterProvider } from './providers/omni-router.provider';
import type { AIProvider } from './providers/ai-provider.interface';

@Module({
  providers: [
    AIProjectParser,
    ChunkBuilderService,
    ContextBuilderService,
    PromptBuilderService,
    AIResponseValidator,
    { provide: 'AI_PROVIDER', useClass: OmniRouterProvider },
    {
      provide: AIService,
      useFactory: (provider: AIProvider, validator: AIResponseValidator) =>
        new AIService(provider, validator),
      inject: ['AI_PROVIDER', AIResponseValidator],
    },
  ],
  exports: [
    AIProjectParser,
    ChunkBuilderService,
    ContextBuilderService,
    PromptBuilderService,
    AIResponseValidator,
    AIService,
  ],
})
export class AIModule {}
