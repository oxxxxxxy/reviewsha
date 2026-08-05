import { Module } from '@nestjs/common';
import { ApiLoggerService } from '../../common/logger/api-logger.service';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectEvents } from './events/project.events';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [DatabaseModule, RepositoriesModule],
  controllers: [ProjectsController],
  providers: [ApiLoggerService, ProjectEvents, ProjectsService],
  exports: [ProjectsService, ProjectEvents],
})
export class ProjectsModule {}
