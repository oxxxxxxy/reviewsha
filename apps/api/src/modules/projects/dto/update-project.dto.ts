import { ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
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
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_DESCRIPTION_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'TypeScript',
    maxLength: PROJECT_MAX_LANGUAGE_LENGTH,
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
}
