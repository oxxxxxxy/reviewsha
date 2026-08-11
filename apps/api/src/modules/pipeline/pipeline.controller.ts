import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/types/auth.types';
import { PipelineMapper } from './pipeline.mapper';
import { PipelineStatusDto } from './dto/pipeline-status.dto';
import { PipelineService } from './pipeline.service';

@ApiTags('Pipelines')
@ApiBearerAuth('bearer')
@Controller('pipelines')
export class PipelineController {
  constructor(@Inject(PipelineService) private readonly pipelines: PipelineService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get analysis pipeline status and progress' })
  @ApiResponse({ status: 200, type: PipelineStatusDto })
  async getStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { data: PipelineMapper.toStatus(await this.pipelines.getProgressForUser(user, id)) };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a failed or cancelled pipeline' })
  async resume(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.pipelines.resumeForUser(user, id);
    return { data: PipelineMapper.toStatus(await this.pipelines.getProgressForUser(user, id)) };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a running pipeline' })
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.pipelines.cancelForUser(user, id);
    return { data: PipelineMapper.toStatus(await this.pipelines.getProgressForUser(user, id)) };
  }
}
