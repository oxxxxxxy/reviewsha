import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000101' })
  userId!: string;

  @ApiPropertyOptional({ example: 'Chrome on Linux' })
  device?: string | null;

  @ApiPropertyOptional({ example: '127.0.0.1' })
  ip?: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 ...' })
  userAgent?: string | null;

  @ApiPropertyOptional({ example: 'Chrome' })
  browser?: string | null;

  @ApiPropertyOptional({ example: 'Linux' })
  os?: string | null;

  @ApiProperty({ example: '2026-08-02T19:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-08-02T19:30:00.000Z' })
  lastUsedAt?: Date | null;

  @ApiProperty({ example: '2026-09-01T19:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: false })
  current!: boolean;
}
