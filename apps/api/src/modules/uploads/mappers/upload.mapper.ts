import type { UploadedFile } from '@prisma/client';
import type { UploadListResponseDto, UploadResponseDto } from '../dto/upload-response.dto';

export class UploadMapper {
  static toResponse(upload: UploadedFile): UploadResponseDto {
    return {
      id: upload.id,
      fileName: upload.filename,
      storageKey: upload.objectKey,
      status: upload.status,
      version: upload.version,
      size: Number(upload.size),
      mimeType: upload.mimeType,
      checksum: upload.checksum,
      createdAt: upload.createdAt.toISOString(),
    };
  }

  static toListResponse(uploads: UploadedFile[]): UploadListResponseDto {
    return { data: uploads.map((upload) => this.toResponse(upload)) };
  }
}
