import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class GithubImportDto {
  @ApiProperty({ example: 'https://github.com/owner/repository' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @ApiProperty({ required: false, example: 'main' })
  @IsOptional()
  @IsString()
  branch?: string;
}
