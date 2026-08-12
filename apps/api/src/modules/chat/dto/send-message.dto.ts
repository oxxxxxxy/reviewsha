import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ type: String, example: 'Почему AI отметил JWT?' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/u, { message: 'message must contain a non-whitespace character' })
  @MaxLength(4000)
  message!: string;

  @ApiProperty({
    required: false,
    description: 'Stable client key used to deduplicate retried submissions.',
    example: '2f8b2f5e-8f1a-4d72-b2c5-5f0e4b3c8b1a',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiProperty({ required: false, enum: ['en', 'ru'] })
  @IsOptional()
  @IsIn(['en', 'ru'])
  language?: 'en' | 'ru';

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Project-relative files explicitly referenced with @path.',
  })
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  fileRefs?: string[];
}
