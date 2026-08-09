import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Почему AI отметил JWT?' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/u, { message: 'message must contain a non-whitespace character' })
  @MaxLength(4000)
  message!: string;
}
