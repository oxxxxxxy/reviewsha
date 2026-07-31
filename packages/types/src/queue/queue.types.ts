import type { Dictionary, ID, ISODateString } from '../common/utility.types.js';

export enum QueueStatus {
  Waiting = 'WAITING',
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Delayed = 'DELAYED',
}

export interface QueueJob<TPayload extends Dictionary = Dictionary> {
  id: ID;
  queue: string;
  name: string;
  status: QueueStatus;
  payload: TPayload;
  createdAt: ISODateString;
}
