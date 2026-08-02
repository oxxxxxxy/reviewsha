import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '../../users/constants/users.constants';

export class LoginDto {
  @ApiProperty({ example: 'developer@reviewsha.local', maxLength: USER_EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(USER_EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({
    example: 'strong-password-123',
    minLength: USER_PASSWORD_MIN_LENGTH,
    maxLength: USER_PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @Length(USER_PASSWORD_MIN_LENGTH, USER_PASSWORD_MAX_LENGTH)
  password!: string;
}
