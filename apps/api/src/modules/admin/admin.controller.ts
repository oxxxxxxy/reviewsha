import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/authorization/roles/role.constants';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(...ADMIN_ROLES)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get administrative system overview' })
  overview() {
    return this.admin.overview();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get BullMQ queue metrics' })
  queues() {
    return this.admin.queueOverview();
  }

  @Get('queues/:queueName/jobs')
  jobs(
    @Param('queueName') queueName: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.admin.queueJobs(queueName, Math.max(1, page), Math.min(100, Math.max(1, limit)));
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  retry(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    return this.admin.retryJob(queueName, jobId);
  }

  @Delete('queues/:queueName/jobs/:jobId')
  remove(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    return this.admin.removeJob(queueName, jobId);
  }
}
