import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminOverviewResponseDto {
  @ApiProperty({ example: 1248 }) users!: number;
  @ApiProperty({ example: 142 }) activeUsers!: number;
  @ApiProperty({ example: 356 }) projects!: number;
  @ApiProperty({ example: 28 }) archivedProjects!: number;
  @ApiProperty({ example: 420 }) analyses!: number;
  @ApiProperty({ example: 390 }) reports!: number;
  @ApiProperty({ example: 12420 }) aiRequests!: number;
  @ApiProperty({ example: 3200000 }) aiTokens!: number;
}

export class QueueMetricsResponseDto {
  @ApiProperty({ example: 12 }) waiting!: number;
  @ApiProperty({ example: 3 }) active!: number;
  @ApiProperty({ example: 145 }) completed!: number;
  @ApiProperty({ example: 2 }) failed!: number;
  @ApiProperty({ example: 0 }) delayed!: number;
  @ApiProperty({ example: 0 }) paused!: number;
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
  @ApiProperty({ example: 12420 }) requests!: number;
  @ApiProperty({ example: 12420 }) usageRecords!: number;
  @ApiProperty({ example: 3200000 }) tokens!: number;
  @ApiProperty({ example: 142 }) failures!: number;
}

export class AdminAiUsageQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'opencode-zen' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'deepseek-v4-flash-free' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class AdminAiUsageBreakdownItemDto {
  @ApiProperty({ example: 'deepseek-chat' }) key!: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'developer@example.com' }) label?:
    string | null;
  @ApiProperty({ example: 420 }) requests!: number;
  @ApiProperty({ example: 120000 }) tokens!: number;
  @ApiProperty({ example: 1.25 }) cost!: number;
}

export class AdminAiUsageBreakdownResponseDto {
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) providers!: AdminAiUsageBreakdownItemDto[];
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) users!: AdminAiUsageBreakdownItemDto[];
  @ApiProperty({ type: [AdminAiUsageBreakdownItemDto] }) projects!: AdminAiUsageBreakdownItemDto[];
}

export class AdminStatisticsResponseDto {
  @ApiProperty({ example: 1248 }) users!: number;
  @ApiProperty({ example: 356 }) projects!: number;
  @ApiProperty({ example: 420 }) analyses!: number;
  @ApiProperty({ example: 390 }) completedAnalyses!: number;
  @ApiProperty({ example: 30 }) failedAnalyses!: number;
}

export class AdminStatisticsQueryDto {
  @ApiPropertyOptional({ format: 'date-time', example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-08-10T23:59:59.999Z' })
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

  @ApiPropertyOptional({ example: 'ERROR' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: 'API' })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ example: 'timeout' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminLogResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'ERROR' }) level!: string;
  @ApiProperty({ example: 'API' }) service!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) context!: string | null;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) requestId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) traceId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) stack!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class AdminLogsMetaDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 100 }) total!: number;
  @ApiProperty({ example: 5 }) pages!: number;
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
  @ApiProperty({ example: 'job-123' }) id!: string;
  @ApiProperty({ example: 'analyze' }) name!: string;
  @ApiProperty({ example: 'failed' }) state!: string;
  @ApiProperty({ example: 3 }) attemptsMade!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ format: 'date-time' }) processedOn?: string;
  @ApiPropertyOptional({ format: 'date-time' }) finishedOn?: string;
  @ApiPropertyOptional() failedReason?: string;
}

export class AdminJobsMetaDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 100 }) total!: number;
  @ApiProperty({ example: 5 }) pages!: number;
}

export class AdminJobsResponseDto {
  @ApiProperty({ type: [AdminJobResponseDto] }) items!: AdminJobResponseDto[];
  @ApiProperty({ type: AdminJobsMetaDto }) meta!: AdminJobsMetaDto;
}

export class AdminActionResponseDto {
  @ApiProperty({ example: true }) ok!: true;
}
