import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export const UPLOAD_EVENTS = {
  created: 'upload.created',
  validated: 'upload.validated',
  completed: 'upload.completed',
  failed: 'upload.failed',
  deleted: 'upload.deleted',
} as const;

export interface UploadEvent {
  readonly uploadId: string;
  readonly projectId: string;
  readonly userId: string;
  readonly version: number;
  readonly occurredAt: string;
  readonly language?: 'en' | 'ru';
  readonly reason?: string;
}

@Injectable()
export class UploadEvents {
  private readonly emitter = new EventEmitter();

  publish(type: string, event: UploadEvent): void {
    this.emitter.emit(type, event);
  }

  on(type: string, listener: (event: UploadEvent) => void): void {
    this.emitter.on(type, listener);
  }
}
