import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RefreshTokenRepository } from './auth/refresh-token.repository';
import { ChatMessageRepository } from './chat/chat-message.repository';
import { ChatSessionRepository } from './chat/chat-session.repository';
import { FindingRepository } from './finding/finding.repository';
import { ProjectRepository } from './project/project.repository';
import { QueueJobRepository } from './queue/queue-job.repository';
import { ReportRepository } from './report/report.repository';
import { ScanRepository } from './scan/scan.repository';
import { UploadedFileRepository } from './upload/uploaded-file.repository';
import { UserRepository } from './user/user.repository';

export const REPOSITORY_PROVIDERS = [
  UserRepository,
  ProjectRepository,
  ScanRepository,
  ReportRepository,
  FindingRepository,
  UploadedFileRepository,
  RefreshTokenRepository,
  QueueJobRepository,
  ChatSessionRepository,
  ChatMessageRepository,
] as const;

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [...REPOSITORY_PROVIDERS],
  exports: [...REPOSITORY_PROVIDERS],
})
export class RepositoriesModule {}
