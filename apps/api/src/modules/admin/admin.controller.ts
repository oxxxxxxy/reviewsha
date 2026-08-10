import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/authorization/roles/role.constants';
import { ApiStandardErrors } from '../../common/swagger';
import { AdminService } from './admin.service';
import {
  AdminActionResponseDto,
  AdminJobResponseDto,
  AdminAiUsageResponseDto,
  AdminAiUsageQueryDto,
  AdminAiUsageBreakdownResponseDto,
  AdminJobsQueryDto,
  AdminJobsResponseDto,
  AdminLogsQueryDto,
  AdminLogResponseDto,
  AdminLogsResponseDto,
  AdminOverviewResponseDto,
  AdminStatisticsResponseDto,
  AdminStatisticsQueryDto,
  QueueOverviewResponseDto,
} from './dto/admin-response.dto';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@ApiStandardErrors()
@Roles(...ADMIN_ROLES)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get administrative system overview' })
  @ApiOkResponse({ type: AdminOverviewResponseDto })
  overview() {
    return this.admin.overview();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get BullMQ queue metrics' })
  @ApiOkResponse({ type: QueueOverviewResponseDto })
  queues() {
    return this.admin.queueOverview();
  }

  @Get('ai-usage')
  @ApiOperation({ summary: 'Get AI usage metrics' })
  @ApiOkResponse({ type: AdminAiUsageResponseDto })
  aiUsage(@Query() query: AdminAiUsageQueryDto) {
    return this.admin.aiUsage(query);
  }

  @Get('ai-usage/breakdown')
  @ApiOperation({ summary: 'Get AI usage grouped by provider, user and project' })
  @ApiOkResponse({ type: AdminAiUsageBreakdownResponseDto })
  aiUsageBreakdown(@Query() query: AdminAiUsageQueryDto) {
    return this.admin.aiUsageBreakdown(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiOkResponse({ type: AdminStatisticsResponseDto })
  statistics(@Query() query: AdminStatisticsQueryDto) {
    return this.admin.statistics(query);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Search paginated masked system logs' })
  @ApiOkResponse({ type: AdminLogsResponseDto })
  logs(@Query() query: AdminLogsQueryDto) {
    return this.admin.logs(query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get a masked system log entry' })
  @ApiOkResponse({ type: AdminLogResponseDto })
  log(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.log(id);
  }

  @Get('queues/:queueName/jobs')
  @ApiOkResponse({ type: AdminJobsResponseDto })
  jobs(@Param('queueName') queueName: string, @Query() query: AdminJobsQueryDto) {
    return this.admin.queueJobs(queueName, query.page, query.limit, query.state);
  }

  @Get('queues/:queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Get a safe queue job summary' })
  @ApiOkResponse({ type: AdminJobResponseDto })
  job(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    return this.admin.queueJob(queueName, jobId);
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  @ApiOkResponse({ type: AdminActionResponseDto })
  retry(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    return this.admin.retryJob(queueName, jobId);
  }

  @Delete('queues/:queueName/jobs/:jobId')
  remove(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    return this.admin.removeJob(queueName, jobId);
  }
}
