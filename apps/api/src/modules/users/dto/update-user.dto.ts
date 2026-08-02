import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import {
  USER_DISPLAY_NAME_MAX_LENGTH,
  USER_DISPLAY_NAME_MIN_LENGTH,
} from '../constants/users.constants';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Updated Developer',
    minLength: USER_DISPLAY_NAME_MIN_LENGTH,
    maxLength: USER_DISPLAY_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(USER_DISPLAY_NAME_MIN_LENGTH, USER_DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.reviewsha.local/avatars/user.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
