import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadStatus } from '@prisma/client';

export class UploadResponseDto {
  @ApiProperty({ type: String, example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ type: String, example: 'project.zip' })
  fileName!: string;

  @ApiProperty({ type: String, example: 'projects/user/project/uploads/upload.zip' })
  storageKey!: string;

  @ApiProperty({ enum: UploadStatus, example: UploadStatus.COMPLETED })
  status!: UploadStatus;

  @ApiProperty({ type: Number, example: 1 })
  version!: number;

  @ApiProperty({ type: Number, example: 5242880 })
  size!: number;

  @ApiProperty({ type: String, example: 'application/zip' })
  mimeType!: string;

  @ApiProperty({ type: String, example: 'sha256:...' })
  checksum!: string;

  @ApiProperty({ type: String, example: 'GITHUB', enum: ['UPLOAD', 'GITHUB'] })
  sourceType!: string;

  @ApiPropertyOptional({ type: String, example: '8f3a1c2', nullable: true })
  sourceCommit!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'https://github.com/reviewsha/reviewsha',
    nullable: true,
  })
  sourceRepo!: string | null;

  @ApiPropertyOptional({ type: String, example: 'Fix authentication edge case', nullable: true })
  sourceMessage!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  sourceCommittedAt!: string | null;

  @ApiProperty({ type: String, example: '2026-08-05T12:00:00.000Z' })
  createdAt!: string;
}

export class UploadListResponseDto {
  @ApiProperty({ type: [UploadResponseDto] })
  data!: UploadResponseDto[];
}
