import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalysisResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  uploadId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  pipelineStatus!: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentStep!: string | null;

  @ApiProperty()
  progress!: number;

  @ApiPropertyOptional({ nullable: true })
  errorMessage!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: Date | null;
}

export class AnalysesListResponseDto {
  @ApiProperty({ type: [AnalysisResponseDto] })
  data!: AnalysisResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number; totalPages: number };
}
