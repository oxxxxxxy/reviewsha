import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export const PROJECT_EVENTS = {
  created: 'project.created',
  updated: 'project.updated',
  archived: 'project.archived',
  restored: 'project.restored',
  deleted: 'project.deleted',
  tagAdded: 'project.tag.added',
  tagRemoved: 'project.tag.removed',
} as const;

export type ProjectEventType = (typeof PROJECT_EVENTS)[keyof typeof PROJECT_EVENTS];

export interface ProjectEvent {
  readonly type: ProjectEventType;
  readonly projectId: string;
  readonly ownerId: string;
  readonly occurredAt: string;
  readonly tag?: string;
}

/** Publishes project lifecycle events without coupling the module to subscribers. */
@Injectable()
export class ProjectEvents {
  private readonly emitter = new EventEmitter();

  publish(event: ProjectEvent): void {
    this.emitter.emit(event.type, event);
  }

  on(type: ProjectEventType, listener: (event: ProjectEvent) => void): void {
    this.emitter.on(type, listener);
  }
}
