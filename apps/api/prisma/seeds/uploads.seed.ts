import type { UploadedFile } from '@prisma/client';
import { DEFAULT_BUCKET, DEFAULT_MIME_TYPE, seedUploadedFiles } from './constants';
import type { SeedContext } from './types';

export async function seedUploadsModule(context: SeedContext): Promise<Map<string, UploadedFile>> {
  const uploadedFilesByObjectKey = new Map<string, UploadedFile>();

  for (const uploadedFileSeed of seedUploadedFiles) {
    const uploadedBy = context.usersByEmail.get(uploadedFileSeed.uploadedByEmail);

    if (!uploadedBy) {
      throw new Error(`Seed uploader not found: ${uploadedFileSeed.uploadedByEmail}`);
    }

    const uploadedFile = await context.prisma.uploadedFile.upsert({
      where: {
        bucket_objectKey: {
          bucket: DEFAULT_BUCKET,
          objectKey: uploadedFileSeed.objectKey,
        },
      },
      update: {
        projectId: uploadedFileSeed.projectId,
        uploadedById: uploadedBy.id,
        filename: uploadedFileSeed.filename,
        size: uploadedFileSeed.size,
        mimeType: DEFAULT_MIME_TYPE,
        checksum: uploadedFileSeed.checksum,
      },
      create: {
        projectId: uploadedFileSeed.projectId,
        uploadedById: uploadedBy.id,
        bucket: DEFAULT_BUCKET,
        objectKey: uploadedFileSeed.objectKey,
        filename: uploadedFileSeed.filename,
        size: uploadedFileSeed.size,
        mimeType: DEFAULT_MIME_TYPE,
        checksum: uploadedFileSeed.checksum,
      },
    });

    uploadedFilesByObjectKey.set(uploadedFile.objectKey, uploadedFile);
  }

  context.uploadedFilesByObjectKey = uploadedFilesByObjectKey;
  return uploadedFilesByObjectKey;
}
