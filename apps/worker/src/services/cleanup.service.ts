import { Injectable } from '@nestjs/common';
import { TempStorageService } from './temp-storage.service';

@Injectable()
export class CleanupService {
  constructor(private readonly tempStorage: TempStorageService) {}

  cleanup(jobId: string): Promise<void> {
    return this.tempStorage.cleanup(jobId);
  }
}
