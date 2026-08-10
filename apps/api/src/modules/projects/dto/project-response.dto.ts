import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, Visibility } from '@prisma/client';
import { ProjectHistoryAction } from '@prisma/client';

export class ProjectStatsDto {
  @ApiProperty({ example: 3 })
  analysesCount!: number;

  @ApiProperty({ example: 2 })
  uploadsCount!: number;

  @ApiProperty({ example: 2 })
  reportsCount!: number;

  @ApiPropertyOptional({ type: String, example: '2026-08-05T12:00:00.000Z', nullable: true })
  lastAnalysisAt!: string | null;
}

export class ProjectResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000002' })
  ownerId!: string;

  @ApiProperty({ example: 'Reviewsha API' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'Automated code review backend.', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, example: 'TypeScript', nullable: true })
  language!: string | null;

  @ApiProperty({ type: [String], example: ['backend', 'mvp'] })
  tags!: string[];

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @ApiProperty({ enum: Visibility, example: Visibility.PRIVATE })
  visibility!: Visibility;

  @ApiPropertyOptional({ type: String, example: null, nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: () => ProjectStatsDto })
  stats!: ProjectStatsDto;
}

export class ProjectsListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  pages!: number;
}

export class ProjectResponseEnvelopeDto {
  @ApiProperty({ type: ProjectResponseDto })
  data!: ProjectResponseDto;
}

export class ProjectsListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data!: ProjectResponseDto[];

  @ApiProperty({ type: ProjectsListMetaDto })
  meta!: ProjectsListMetaDto;
}

export class ProjectHistoryResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000020' })
  id!: string;

  @ApiProperty({ enum: ProjectHistoryAction, example: ProjectHistoryAction.UPDATED })
  action!: ProjectHistoryAction;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  actorId!: string;

  @ApiProperty({ example: 'developer@reviewsha.local' })
  actorEmail!: string;

  @ApiPropertyOptional({ example: { name: { from: 'Old', to: 'New' } }, nullable: true })
  changedFields!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  createdAt!: string;
}

export class ProjectHistoryListResponseDto {
  @ApiProperty({ type: [ProjectHistoryResponseDto] })
  data!: ProjectHistoryResponseDto[];
}
