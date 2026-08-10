import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  USER_DEFAULT_LIMIT,
  USER_DEFAULT_PAGE,
  USER_MAX_LIMIT,
} from '../constants/users.constants';

export class UserQueryDto {
  @ApiPropertyOptional({ example: USER_DEFAULT_PAGE, default: USER_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? USER_DEFAULT_PAGE))
  @IsInt()
  @Min(1)
  page: number = USER_DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: USER_DEFAULT_LIMIT,
    default: USER_DEFAULT_LIMIT,
    minimum: 1,
    maximum: USER_MAX_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value ?? USER_DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  @Max(USER_MAX_LIMIT)
  limit: number = USER_DEFAULT_LIMIT;

  @ApiPropertyOptional({ type: String, example: 'developer' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    default: 'createdAt',
    enum: ['createdAt', 'displayName', 'email'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'displayName', 'email'])
  sort: 'createdAt' | 'displayName' | 'email' = 'createdAt';

  @ApiPropertyOptional({ type: String, example: 'desc', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
