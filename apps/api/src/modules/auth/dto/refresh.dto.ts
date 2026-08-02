import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsJWT()
  refreshToken!: string;
}
