import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineStatusDto {
  @ApiProperty({ type: String, example: 'scan-uuid' })
  id!: string;

  @ApiProperty({ type: String, example: 'project-uuid' })
  projectId!: string;

  @ApiProperty({ type: String, example: 'upload-uuid' })
  uploadId!: string;

  @ApiProperty({ type: String, example: 'ANALYZE', nullable: true })
  currentStep!: string | null;

  @ApiProperty({ type: String, example: 'RUNNING', nullable: true })
  status!: string | null;

  @ApiProperty({ type: Number, example: 70 })
  progress!: number;

  @ApiPropertyOptional({ type: String, example: 'AI_TIMEOUT', nullable: true })
  errorCode?: string | null;

  @ApiPropertyOptional({ type: String, example: 'AI provider timed out', nullable: true })
  errorMessage?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-08-06T00:00:00.000Z', nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ type: String, example: '2026-08-06T00:05:00.000Z', nullable: true })
  finishedAt?: Date | null;
}
