import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, Visibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  PROJECT_DEFAULT_LIMIT,
  PROJECT_DEFAULT_PAGE,
  PROJECT_MAX_LIMIT,
} from '../constants/projects.constants';

export class ProjectFilterDto {
  @ApiPropertyOptional({ default: PROJECT_DEFAULT_PAGE, minimum: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? PROJECT_DEFAULT_PAGE))
  @IsInt()
  @Min(1)
  page: number = PROJECT_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PROJECT_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PROJECT_MAX_LIMIT,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? PROJECT_DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  @Max(PROJECT_MAX_LIMIT)
  limit: number = PROJECT_DEFAULT_LIMIT;

  @ApiPropertyOptional({ example: 'typescript' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'TypeScript' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'backend,mvp', description: 'Comma-separated tag names.' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : value,
  )
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: Visibility, example: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'name', 'lastAnalysisAt', 'analysesCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name', 'lastAnalysisAt', 'analysesCount'])
  sort: 'createdAt' | 'updatedAt' | 'name' | 'lastAnalysisAt' | 'analysesCount' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
