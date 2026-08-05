import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineStatusDto {
  @ApiProperty({ example: 'scan-uuid' })
  id!: string;

  @ApiProperty({ example: 'project-uuid' })
  projectId!: string;

  @ApiProperty({ example: 'upload-uuid' })
  uploadId!: string;

  @ApiProperty({ example: 'ANALYZE', nullable: true })
  currentStep!: string | null;

  @ApiProperty({ example: 'RUNNING', nullable: true })
  status!: string | null;

  @ApiProperty({ example: 70 })
  progress!: number;

  @ApiPropertyOptional({ example: 'AI_TIMEOUT' })
  errorCode?: string | null;

  @ApiPropertyOptional({ example: 'AI provider timed out' })
  errorMessage?: string | null;

  @ApiPropertyOptional({ example: '2026-08-06T00:00:00.000Z' })
  startedAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-08-06T00:05:00.000Z' })
  finishedAt?: Date | null;
}
