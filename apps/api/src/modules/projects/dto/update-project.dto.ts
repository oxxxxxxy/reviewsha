import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Reviewsha API',
    minLength: 1,
    maxLength: PROJECT_MAX_NAME_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(PROJECT_MAX_NAME_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated project description.',
    maxLength: 5_000,
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_DESCRIPTION_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'TypeScript',
    maxLength: PROJECT_MAX_LANGUAGE_LENGTH,
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_LANGUAGE_LENGTH)
  language?: string | null;

  @ApiPropertyOptional({ enum: Visibility, example: Visibility.PRIVATE })
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
    description: 'Public GitHub repository URL. Set to null to disconnect an empty project.',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  githubUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'main',
    description: 'Branch or ref used for GitHub synchronization.',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  githubBranch?: string | null;
}
