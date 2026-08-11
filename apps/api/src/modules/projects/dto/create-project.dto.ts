import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PROJECT_MAX_DESCRIPTION_LENGTH,
  PROJECT_MAX_LANGUAGE_LENGTH,
  PROJECT_MAX_NAME_LENGTH,
  PROJECT_MAX_TAG_LENGTH,
  PROJECT_MAX_TAGS,
} from '../constants/projects.constants';

export class CreateProjectDto {
  @ApiProperty({
    type: String,
    example: 'Reviewsha API',
    minLength: 1,
    maxLength: PROJECT_MAX_NAME_LENGTH,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PROJECT_MAX_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Automated code review backend.',
    maxLength: 5_000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'TypeScript',
    maxLength: PROJECT_MAX_LANGUAGE_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_LANGUAGE_LENGTH)
  language?: string;

  @ApiPropertyOptional({
    enum: Visibility,
    example: Visibility.PRIVATE,
    default: Visibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ example: ['backend', 'mvp'], maxItems: PROJECT_MAX_TAGS, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PROJECT_MAX_TAGS)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(PROJECT_MAX_TAG_LENGTH, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: String,
    example: 'https://github.com/reviewsha/reviewsha',
    description: 'Public GitHub repository URL. Connects the project to commit-based versions.',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  githubUrl?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'main',
    description: 'Branch or ref used for GitHub synchronization.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  githubBranch?: string;
}
