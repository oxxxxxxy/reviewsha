import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Role, UploadStatus } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { UploadedFileRepository } from '../../../repositories/upload/uploaded-file.repository';
import { StorageService } from '../../storage/services/storage.service';
import { StorageUnavailableException } from '../../storage/exceptions/storage.exceptions';
import { UploadMapper } from '../mappers/upload.mapper';
import { UploadEvents, UPLOAD_EVENTS } from '../events/upload.events';
import { ZipValidator } from '../validators/zip.validator';
import { UploadFailedException } from '../exceptions/upload.exceptions';
import { UploadListResponseDto, UploadResponseDto } from '../dto/upload-response.dto';
import type { GithubImportDto } from '../dto/github-import.dto';
import { parseGithubRepositoryUrl } from '../../../common/github/github-source';

export interface UploadFileInput {
  readonly originalname: string;
  readonly mimetype: string;
  readonly buffer?: Buffer;
  readonly path?: string;
  readonly size?: number;
  readonly sourceType?: string;
  readonly sourceCommit?: string;
  readonly sourceRepo?: string;
  readonly sourceMessage?: string;
  readonly sourceCommittedAt?: Date;
  readonly suppressPipeline?: boolean;
}

@Injectable()
export class UploadsService {
  constructor(
    @Inject(ProjectRepository) private readonly projects: ProjectRepository,
    @Inject(UploadedFileRepository) private readonly uploads: UploadedFileRepository,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ZipValidator) private readonly validator: ZipValidator,
    @Inject(UploadEvents) private readonly events: UploadEvents,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  async create(
    user: AuthenticatedUser,
    projectId: string,
    file: UploadFileInput,
  ): Promise<UploadResponseDto> {
    try {
      return await this.createUpload(user, projectId, file);
    } finally {
      if (file.path) await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  private async createUpload(
    user: AuthenticatedUser,
    projectId: string,
    file: UploadFileInput,
  ): Promise<UploadResponseDto> {
    const size = file.size ?? file.buffer?.length ?? 0;
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('You cannot upload to this project');
    }
    if (project.githubUrl && file.sourceType !== 'GITHUB') {
      throw new ConflictException(
        'Manual uploads are disabled for GitHub-connected projects; sync a commit instead',
      );
    }

    const id = randomUUID();
    const extension = file.originalname.match(/\.[a-z0-9.]+$/i)?.[0]?.toLowerCase() ?? '.bin';
    const objectKey = `users/${user.id}/projects/${projectId}/uploads/${id}${extension}`;
    const upload = await this.uploads.createNextVersion(projectId, {
      id,
      project: { connect: { id: projectId } },
      uploadedBy: { connect: { id: user.id } },
      objectKey,
      bucket: 'projects',
      filename: file.originalname,
      size,
      mimeType: file.mimetype,
      checksum: 'pending',
      status: UploadStatus.PENDING,
      sourceType: file.sourceType ?? 'UPLOAD',
      sourceCommit: file.sourceCommit,
      sourceRepo: file.sourceRepo,
      sourceMessage: file.sourceMessage,
      sourceCommittedAt: file.sourceCommittedAt,
    });
    const version = upload.version;
    this.events.publish(UPLOAD_EVENTS.created, this.event(upload));

    let objectStored = false;
    try {
      await this.uploads.updateStatus(id, UploadStatus.VALIDATING);
      if (file.path) {
        await this.validator.validateFile(file.originalname, file.mimetype, size, file.path);
      } else if (file.buffer) {
        await this.validator.validate(file.originalname, file.mimetype, file.buffer);
      } else {
        throw new UploadFailedException();
      }
      this.events.publish(UPLOAD_EVENTS.validated, this.event(upload));
      await this.uploads.updateStatus(id, UploadStatus.UPLOADING);
      const checksum = `sha256:${await this.checksum(file)}`;
      await this.storage.upload({
        bucket: 'projects',
        key: objectKey,
        body: file.path ? createReadStream(file.path) : file.buffer!,
        size,
        metadata: {
          contentType: file.mimetype,
          checksum,
          ownerId: user.id,
          projectId,
          uploadId: id,
        },
      });
      objectStored = true;
      const completed = await this.uploads.update(id, { checksum, status: UploadStatus.COMPLETED });
      if (!file.suppressPipeline)
        this.events.publish(UPLOAD_EVENTS.completed, this.event(completed));
      this.logger.log(`Upload completed: ${id} version=${version}`, 'UploadsService');
      return UploadMapper.toResponse(completed);
    } catch (error) {
      if (objectStored) {
        await this.storage.delete('projects', objectKey).catch(() => undefined);
      }
      await this.uploads.updateStatus(id, UploadStatus.FAILED).catch(() => undefined);
      this.events.publish(UPLOAD_EVENTS.failed, {
        ...this.event(upload),
        reason: error instanceof Error ? error.message : 'unknown',
      });
      if (error instanceof StorageUnavailableException) throw error;
      if (error instanceof Error && error.name.endsWith('Exception')) throw error;
      throw new UploadFailedException();
    }
  }

  private async checksum(file: UploadFileInput): Promise<string> {
    const hash = createHash('sha256');
    const stream = file.path ? createReadStream(file.path) : file.buffer;
    if (!stream) throw new UploadFailedException();
    if (Buffer.isBuffer(stream)) hash.update(stream);
    else {
      for await (const chunk of stream) hash.update(chunk as Buffer);
    }
    return hash.digest('hex');
  }

  async list(user: AuthenticatedUser, projectId: string): Promise<UploadListResponseDto> {
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && project.ownerId !== user.id) {
      throw new ForbiddenException('You cannot access uploads for this project');
    }
    return UploadMapper.toListResponse(await this.uploads.findByProject(projectId));
  }

  async remove(user: AuthenticatedUser, projectId: string, uploadId: string): Promise<void> {
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && project.ownerId !== user.id)
      throw new ForbiddenException('You cannot modify uploads for this project');
    const upload = await this.uploads.findById(uploadId);
    if (!upload || upload.projectId !== projectId) throw new NotFoundException('Version not found');
    const activeScan = await this.uploads.hasActiveScan(uploadId);
    if (activeScan)
      throw new ForbiddenException('Cannot delete a version while it is being analyzed');
    if (upload.sourceType === 'GITHUB')
      throw new ForbiddenException('GitHub commit versions cannot be deleted');
    await this.storage.delete(upload.bucket as 'projects', upload.objectKey).catch(() => undefined);
    await this.uploads.delete(upload.id);
  }

  async importGithub(
    user: AuthenticatedUser,
    projectId: string,
    dto: GithubImportDto,
  ): Promise<UploadListResponseDto> {
    const project = await this.projects.findActiveById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== user.id && user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)
      throw new ForbiddenException('You cannot connect GitHub to this project');
    const repository = parseGithubRepositoryUrl(dto.url);
    if (!repository) throw new UnprocessableEntityException('Invalid public GitHub repository URL');
    const owner = repository.owner;
    const repo = repository.repo;
    const branch = dto.branch?.trim() || project.githubBranch || 'HEAD';
    if (project.githubUrl && project.githubUrl !== repository.url) {
      throw new ConflictException(
        'This project is already connected to another GitHub repository; create a new project to switch sources',
      );
    }
    if (project.githubUrl && project.githubBranch && project.githubBranch !== branch) {
      throw new ConflictException(
        'This project is already connected to another GitHub branch; create a new project to switch sources',
      );
    }
    const hasExistingVersions = project._count.uploadedFiles > 0;
    const hasGithubVersions = this.uploads.hasSourceType
      ? await this.uploads.hasSourceType(projectId, 'GITHUB')
      : false;
    if (hasExistingVersions && !hasGithubVersions && !project.githubUrl) {
      throw new ConflictException(
        'GitHub repositories can only be connected to a project without manual versions',
      );
    }
    await this.projects.update(projectId, {
      githubUrl: repository.url,
      githubBranch: branch,
    });

    const commits = await this.fetchGithubCommits(owner, repo, branch, !hasGithubVersions);
    for (const commit of commits.reverse()) {
      if (!commit.sha || (await this.uploads.findBySourceCommit(projectId, commit.sha))) continue;
      const archive = await fetch(
        commit.zipball_url ?? `https://api.github.com/repos/${owner}/${repo}/zipball/${commit.sha}`,
        {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Reviewsha' },
        },
      );
      if (!archive.ok) continue;
      const buffer = Buffer.from(await archive.arrayBuffer());
      await this.create(user, projectId, {
        originalname: `${repo}-${commit.sha.slice(0, 8)}.zip`,
        mimetype: 'application/zip',
        buffer,
        size: buffer.length,
        sourceType: 'GITHUB',
        sourceCommit: commit.sha,
        sourceRepo: repository.url,
        sourceMessage: commit.commit?.message,
        sourceCommittedAt: this.commitDate(commit),
        suppressPipeline: true,
      });
    }
    return this.list(user, projectId);
  }

  private async fetchGithubCommits(
    owner: string,
    repo: string,
    branch: string,
    includeHistory: boolean,
  ): Promise<GithubCommit[]> {
    const commits: GithubCommit[] = [];
    const pages = includeHistory ? Number.POSITIVE_INFINITY : 1;
    for (let page = 1; page <= pages; page += 1) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
        {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Reviewsha' },
        },
      );
      if (!response.ok) throw new NotFoundException('Unable to load GitHub commits');
      const batch = (await response.json()) as GithubCommit[];
      commits.push(...batch);
      if (!includeHistory || batch.length < 100) break;
    }
    return commits;
  }

  private commitDate(commit: GithubCommit): Date | undefined {
    const value = commit.commit?.committer?.date ?? commit.commit?.author?.date;
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private event(upload: {
    id: string;
    projectId: string;
    uploadedById: string | null;
    version: number;
  }) {
    return {
      uploadId: upload.id,
      projectId: upload.projectId,
      userId: upload.uploadedById ?? '',
      version: upload.version,
      occurredAt: new Date().toISOString(),
    };
  }
}

interface GithubCommit {
  readonly sha: string;
  readonly commit?: {
    readonly message?: string;
    readonly author?: { readonly date?: string };
    readonly committer?: { readonly date?: string };
  };
  readonly zipball_url?: string;
}
