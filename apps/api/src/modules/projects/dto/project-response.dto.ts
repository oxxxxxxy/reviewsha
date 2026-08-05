import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, Visibility } from '@prisma/client';

export class ProjectResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000002' })
  ownerId!: string;

  @ApiProperty({ example: 'Reviewsha API' })
  name!: string;

  @ApiPropertyOptional({ example: 'Automated code review backend.', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ example: 'TypeScript', nullable: true })
  language!: string | null;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @ApiProperty({ enum: Visibility, example: Visibility.PRIVATE })
  visibility!: Visibility;

  @ApiPropertyOptional({ example: null, nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  updatedAt!: string;
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
