import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalysisResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  uploadId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  status!: string | null;

  @ApiProperty({ type: String, nullable: true })
  pipelineStatus!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  currentStep!: string | null;

  @ApiProperty()
  progress!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  errorMessage!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true })
  finishedAt!: Date | null;
}

export class AnalysesListResponseDto {
  @ApiProperty({ type: [AnalysisResponseDto] })
  data!: AnalysisResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number; totalPages: number };
}
