import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PROJECT_MAX_DESCRIPTION_LENGTH,
  PROJECT_MAX_LANGUAGE_LENGTH,
  PROJECT_MAX_NAME_LENGTH,
} from '../constants/projects.constants';

export class CreateProjectDto {
  @ApiProperty({ example: 'Reviewsha API', minLength: 1, maxLength: PROJECT_MAX_NAME_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(PROJECT_MAX_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({ example: 'Automated code review backend.', maxLength: 5_000 })
  @IsOptional()
  @IsString()
  @MaxLength(PROJECT_MAX_DESCRIPTION_LENGTH)
  description?: string;

  @ApiPropertyOptional({ example: 'TypeScript', maxLength: PROJECT_MAX_LANGUAGE_LENGTH })
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
}
