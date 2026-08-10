import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProjectResponseDto } from '../../projects/dto/project-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AdminOverviewResponseDto {
  @ApiProperty({ type: Number, example: 1248 }) users!: number;
  @ApiProperty({ type: Number, example: 142 }) activeUsers!: number;
  @ApiProperty({ type: Number, example: 356 }) projects!: number;
  @ApiProperty({ type: Number, example: 28 }) archivedProjects!: number;
  @ApiProperty({ type: Number, example: 420 }) analyses!: number;
  @ApiProperty({ type: Number, example: 390 }) reports!: number;
  @ApiProperty({ type: Number, example: 12420 }) aiRequests!: number;
  @ApiProperty({ type: Number, example: 3200000 }) aiTokens!: number;
}

export class AdminUserDetailsResponseDto {
  @ApiProperty({ type: () => UserResponseDto }) user!: UserResponseDto;
  @ApiProperty({ type: () => [ProjectResponseDto] }) projects!: ProjectResponseDto[];
  @ApiProperty({ type: [Object] }) activity!: Array<Record<string, unknown>>;
}

export class AdminProjectVersionDto {
  @ApiProperty({ type: Number, example: 3 }) version!: number;
  @ApiProperty({ type: Number, example: 1048576 }) size!: number;
  @ApiProperty({ type: String, example: 'READY' }) status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class AdminProjectAnalysisDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, example: 'COMPLETED' }) status!: string;
  @ApiProperty({ type: Number, example: 87, nullable: true }) score!: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) finishedAt!: string | null;
}

export class AdminProjectDetailsResponseDto {
  @ApiProperty({ type: () => ProjectResponseDto }) project!: ProjectResponseDto;
  @ApiProperty({ type: () => UserResponseDto }) owner!: UserResponseDto;
  @ApiProperty({ type: [AdminProjectVersionDto] }) versions!: AdminProjectVersionDto[];
  @ApiProperty({ type: [AdminProjectAnalysisDto] }) analyses!: AdminProjectAnalysisDto[];
}

export class QueueMetricsResponseDto {
  @ApiProperty({ enum: ['HEALTHY', 'DEGRADED', 'ERROR'] })
  status!: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  @ApiProperty({ type: Number, example: 12 }) waiting!: number;
  @ApiProperty({ type: Number, example: 3 }) active!: number;
  @ApiProperty({ type: Number, example: 145 }) completed!: number;
  @ApiProperty({ type: Number, example: 2 }) failed!: number;
  @ApiProperty({ type: Number, example: 0 }) delayed!: number;
  @ApiProperty({ type: Number, example: 0 }) paused!: number;
}

export class QueueOverviewResponseDto {
  @ApiProperty({ type: QueueMetricsResponseDto }) scan!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) file!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) ai!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) chat!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) report!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) notification!: QueueMetricsResponseDto;
  @ApiProperty({ type: QueueMetricsResponseDto }) deadLetter!: QueueMetricsResponseDto;
}

export class AdminAiUsageResponseDto {
  @ApiProperty({ type: Number, example: 12420 }) requests!: number;
  @ApiProperty({ type: Number, example: 12420 }) usageRecords!: number;
  @ApiProperty({ type: Number, example: 3200000 }) tokens!: number;
  @ApiProperty({ type: Number, example: 142 }) failures!: number;
  @ApiProperty({ type: () => [AdminAiFailureDto] }) failuresList!: AdminAiFailureDto[];
}

export class AdminAiFailureDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, example: 'omniroute' }) provider!: string;
  @ApiProperty({ type: String, example: 'deepseek-chat' }) model!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) error!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 1200 }) latencyMs!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true }) project!: string | null;
}

export class AdminAiUsageQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ type: String, example: 'opencode-zen' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ type: String, example: 'deepseek-v4-flash-free' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class AdminAiUsageBreakdownItemDto {
  @ApiProperty({ type: String, example: 'deepseek-chat' }) key!: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'developer@example.com' }) label?:
    string | null;
  @ApiProperty({ type: Number, example: 420 }) requests!: number;
  @ApiProperty({ type: Number, example: 120000 }) tokens!: number;
  @ApiProperty({ type: Number, example: 1.25 }) cost!: number;
}

export class AdminAiUsageBreakdownResponseDto {
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) providers!: AdminAiUsageBreakdownItemDto[];
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) users!: AdminAiUsageBreakdownItemDto[];
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) projects!: AdminAiUsageBreakdownItemDto[];
}

export class AdminStatisticsResponseDto {
  @ApiProperty({ type: Number, example: 1248 }) users!: number;
  @ApiProperty({ type: Number, example: 356 }) projects!: number;
  @ApiProperty({ type: Number, example: 420 }) analyses!: number;
  @ApiProperty({ type: Number, example: 390 }) completedAnalyses!: number;
  @ApiProperty({ type: Number, example: 30 }) failedAnalyses!: number;
  @ApiProperty({ type: Number, example: 92.8 }) successRate!: number;
  @ApiProperty({ type: Number, example: 48000 }) averageDurationMs!: number;
  @ApiProperty({ type: () => [AdminProcessingStatisticDto] })
  processing!: AdminProcessingStatisticDto[];
}

export class AdminProcessingStatisticDto {
  @ApiProperty({ type: String, example: 'PARSE' }) type!: string;
  @ApiProperty({ type: Number, example: 100 }) total!: number;
  @ApiProperty({ type: Number, example: 95 }) completed!: number;
  @ApiProperty({ type: Number, example: 3 }) failed!: number;
  @ApiProperty({ type: Number, example: 2 }) running!: number;
}

export class AdminStatisticsQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-08-10T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminLogsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ type: String, example: 'ERROR' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ type: String, example: 'API' })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ type: String, example: 'timeout' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminLogResponseDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, example: 'ERROR' }) level!: string;
  @ApiProperty({ type: String, example: 'API' }) service!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) context!: string | null;
  @ApiProperty({ type: String }) message!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) requestId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) traceId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) stack!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminLogsMetaDto {
  @ApiProperty({ type: Number, example: 1 }) page!: number;
  @ApiProperty({ type: Number, example: 20 }) limit!: number;
  @ApiProperty({ type: Number, example: 100 }) total!: number;
  @ApiProperty({ type: Number, example: 5 }) pages!: number;
}

export class AdminLogsResponseDto {
  @ApiProperty({ type: [AdminLogResponseDto] }) items!: AdminLogResponseDto[];
  @ApiProperty({ type: AdminLogsMetaDto }) meta!: AdminLogsMetaDto;
}

export class AdminJobsQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] })
  @IsOptional()
  @IsIn(['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'])
  state?: string;
}

export class AdminJobResponseDto {
  @ApiProperty({ type: String, example: 'job-123' }) id!: string;
  @ApiProperty({ type: String, example: 'analyze' }) name!: string;
  @ApiProperty({ type: String, example: 'failed' }) state!: string;
  @ApiProperty({ type: Number, example: 3 }) attemptsMade!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) processedOn?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) finishedOn?: string;
  @ApiPropertyOptional({ type: String }) failedReason?: string;
}

export class AdminJobsMetaDto {
  @ApiProperty({ type: Number, example: 1 }) page!: number;
  @ApiProperty({ type: Number, example: 20 }) limit!: number;
  @ApiProperty({ type: Number, example: 100 }) total!: number;
  @ApiProperty({ type: Number, example: 5 }) pages!: number;
}

export class AdminJobsResponseDto {
  @ApiProperty({ type: [AdminJobResponseDto] }) items!: AdminJobResponseDto[];
  @ApiProperty({ type: AdminJobsMetaDto }) meta!: AdminJobsMetaDto;
}

export class AdminActionResponseDto {
  @ApiProperty({ type: Boolean, example: true }) ok!: true;
}
