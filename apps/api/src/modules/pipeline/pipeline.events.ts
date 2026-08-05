import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { PipelineStep } from './pipeline.constants';

export const PIPELINE_EVENTS = {
  started: 'pipeline.started',
  stepCompleted: 'pipeline.step.completed',
  failed: 'pipeline.failed',
  completed: 'pipeline.completed',
  cancelled: 'pipeline.cancelled',
} as const;

export interface PipelineEvent {
  readonly pipelineId: string;
  readonly projectId: string;
  readonly uploadId: string;
  readonly step?: PipelineStep;
  readonly occurredAt: string;
  readonly errorCode?: string;
}

@Injectable()
export class PipelineEvents {
  private readonly emitter = new EventEmitter();

  publish(type: string, event: PipelineEvent): void {
    this.emitter.emit(type, event);
  }

  on(type: string, listener: (event: PipelineEvent) => void): void {
    this.emitter.on(type, listener);
  }
}
