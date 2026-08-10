import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ type: String, example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ type: String, example: '00000000-0000-4000-8000-000000000101' })
  userId!: string;

  @ApiPropertyOptional({ type: String, example: 'Chrome on Linux' })
  device?: string | null;

  @ApiPropertyOptional({ type: String, example: '127.0.0.1' })
  ip?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Mozilla/5.0 ...' })
  userAgent?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Chrome' })
  browser?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Linux' })
  os?: string | null;

  @ApiProperty({ type: String, example: '2026-08-02T19:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, example: '2026-08-02T19:30:00.000Z' })
  lastUsedAt?: Date | null;

  @ApiProperty({ type: String, example: '2026-09-01T19:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ type: Boolean, example: false })
  current!: boolean;
}
