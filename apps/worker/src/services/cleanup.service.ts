import { Inject, Injectable } from '@nestjs/common';
import { TempStorageService } from './temp-storage.service';

@Injectable()
export class CleanupService {
  private readonly tempStorage: TempStorageService;

  constructor(@Inject(TempStorageService) tempStorage: TempStorageService) {
    this.tempStorage = tempStorage;
  }

  cleanup(jobId: string): Promise<void> {
    return this.tempStorage.cleanup(jobId);
  }

  cleanupWorkspace(jobId: string): Promise<void> {
    return this.cleanup(jobId);
  }
}
