import { ApiProperty } from '@nestjs/swagger';
import { UploadStatus } from '@prisma/client';

export class UploadResponseDto {
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'project.zip' })
  fileName!: string;

  @ApiProperty({ example: 'projects/user/project/uploads/upload.zip' })
  storageKey!: string;

  @ApiProperty({ enum: UploadStatus, example: UploadStatus.COMPLETED })
  status!: UploadStatus;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: 5242880 })
  size!: number;

  @ApiProperty({ example: 'application/zip' })
  mimeType!: string;

  @ApiProperty({ example: 'sha256:...' })
  checksum!: string;

  @ApiProperty({ example: '2026-08-05T12:00:00.000Z' })
  createdAt!: string;
}

export class UploadListResponseDto {
  @ApiProperty({ type: [UploadResponseDto] })
  data!: UploadResponseDto[];
}
