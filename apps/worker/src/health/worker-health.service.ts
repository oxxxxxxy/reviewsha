import { Injectable } from '@nestjs/common';
import { WorkerDatabaseService } from '../database/worker-database.service';
import { QueueService } from '../queue/queue.service';
import { WorkerStorageService } from '../storage/worker-storage.service';

@Injectable()
export class WorkerHealthService {
  constructor(
    private readonly queue: QueueService,
    private readonly database: WorkerDatabaseService,
    private readonly storage: WorkerStorageService,
  ) {}

  async check(): Promise<{ status: 'ok'; redis: 'ok'; database: 'ok'; storage: 'ok' }> {
    await Promise.all([
      this.queue.healthCheck(),
      this.database.healthCheck(),
      this.storage.healthCheck(),
    ]);
    return { status: 'ok', redis: 'ok', database: 'ok', storage: 'ok' };
  }
}
