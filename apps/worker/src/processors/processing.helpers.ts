import type { Job } from 'bullmq';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { WorkerDatabaseService } from '../database/worker-database.service';

export type ProcessingPayload = {
  uploadId: string;
  projectId: string;
  pipelineId?: string;
  jobId?: string;
};

export function payloadOf(job: Job): ProcessingPayload {
  const value =
    job.data && typeof job.data === 'object' && 'payload' in job.data ? job.data.payload : job.data;
  if (!value || typeof value !== 'object') throw new Error('Processing job payload is required');
  const payload = value as Partial<ProcessingPayload>;
  if (!payload.uploadId || !payload.projectId)
    throw new Error('uploadId and projectId are required');
  return {
    ...payload,
    pipelineId: payload.pipelineId ?? String(job.id ?? 'unknown'),
  } as ProcessingPayload;
}

export async function assertPipelineActive(
  db: WorkerDatabaseService | undefined,
  pipelineId: string | undefined,
): Promise<void> {
  if (!db || !pipelineId) return;
  const scan = await db.scan.findUnique({ where: { id: pipelineId }, select: { status: true } });
  if (!scan) throw new Error(`Analysis not found: ${pipelineId}`);
  if (scan.status === 'CANCELLED') throw new Error('PIPELINE_CANCELLED');
}

export async function saveJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
}
