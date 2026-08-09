import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateChatDto {
  @ApiPropertyOptional({ example: 'JWT findings', maxLength: 180 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/u, { message: 'title must contain a non-whitespace character' })
  title?: string;
}
