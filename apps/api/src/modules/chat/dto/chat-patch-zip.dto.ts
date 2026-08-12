import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatPatchDto {
  @ApiProperty({ example: 'src/auth/service.ts' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  @Matches(/^(?!\/)(?!.*\.\.)[^\\]+$/u, { message: 'filePath must be project-relative' })
  filePath!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20_000)
  before!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20_000)
  after!: string;
}

export class ChatPatchZipDto {
  @ApiProperty({ type: [ChatPatchDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ChatPatchDto)
  patches!: ChatPatchDto[];
}
