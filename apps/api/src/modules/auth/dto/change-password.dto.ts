import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import {
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '../../users/constants/users.constants';

export class ChangePasswordDto {
  @ApiProperty({ example: 'old-strong-password' })
  @IsString()
  @Length(USER_PASSWORD_MIN_LENGTH, USER_PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({ example: 'new-strong-password' })
  @IsString()
  @Length(USER_PASSWORD_MIN_LENGTH, USER_PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
