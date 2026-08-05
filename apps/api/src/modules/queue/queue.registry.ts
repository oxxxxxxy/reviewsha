import { Injectable } from '@nestjs/common';
import { QUEUE_NAME_LIST, QUEUE_NAMES, type QueueKey, type QueueName } from './queue.constants';

@Injectable()
export class QueueRegistry {
  getAll(): readonly QueueName[] {
    return QUEUE_NAME_LIST;
  }

  get(key: QueueKey): QueueName {
    return QUEUE_NAMES[key];
  }
}
