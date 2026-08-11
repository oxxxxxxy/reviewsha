import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProjectHistoryAction, ProjectStatus, Role } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectFilterDto } from '../dto/project-filter.dto';
import {
  ProjectHistoryListResponseDto,
  ProjectResponseEnvelopeDto,
  ProjectsListResponseDto,
} from '../dto/project-response.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectEvents, PROJECT_EVENTS } from '../events/project.events';
import { ProjectMapper } from '../mappers/project.mapper';
import { PROJECT_DEFAULT_LIMIT, PROJECT_DEFAULT_PAGE } from '../constants/projects.constants';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(ProjectRepository) private readonly projectRepository: ProjectRepository,
    @Inject(ProjectEvents) private readonly projectEvents: ProjectEvents,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  async findAll(
    user: AuthenticatedUser,
    filter: ProjectFilterDto,
  ): Promise<ProjectsListResponseDto> {
    // Requests can arrive as plain query objects in development/test adapters;
    // normalize them here instead of relying only on class-transformer.
    const page = Math.max(1, Number(filter.page) || PROJECT_DEFAULT_PAGE);
    const limit = Math.max(1, Number(filter.limit) || PROJECT_DEFAULT_LIMIT);
    const result = await this.projectRepository.findMany({
      ownerId: this.ownerScope(user),
      search: filter.search?.trim() || undefined,
      status: filter.status ?? ProjectStatus.ACTIVE,
      visibility: filter.visibility,
      tags: filter.tags,
      language: filter.language?.trim() || undefined,
      createdFrom: filter.createdFrom ? new Date(filter.createdFrom) : undefined,
      createdTo: filter.createdTo ? new Date(filter.createdTo) : undefined,
      sort: filter.sort,
      order: filter.order,
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = Number(result.total) || 0;
    return {
      data: ProjectMapper.toResponseList(result.items),
      meta: {
        page,
        limit,
        total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findById(user: AuthenticatedUser, id: string): Promise<ProjectResponseEnvelopeDto> {
    const project = await this.findProject(user, id);
    return { data: ProjectMapper.toResponse(ProjectMapper.toEntity(project)) };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseEnvelopeDto> {
    const name = this.requiredText(dto.name, 'Project name');
    const tags = this.normalizeTags(dto.tags);
    const existing = await this.projectRepository.findByOwnerAndName(user.id, name);
    if (existing) {
      throw new ConflictException('A project with this name already exists');
    }

    const project = await this.projectRepository.create({
      owner: { connect: { id: user.id } },
      name,
      description: dto.description?.trim() || null,
      language: dto.language?.trim() || null,
      visibility: dto.visibility,
    });
    await this.projectRepository.syncTags(project.id, tags);
    await this.projectRepository.createHistory(project.id, user.id, ProjectHistoryAction.CREATED, {
      name,
      tags,
    });

    this.publish(PROJECT_EVENTS.created, project.id, project.ownerId);
    this.logger.log(`Project created: ${project.id}`, 'ProjectsService');
    return this.findById(user, project.id);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseEnvelopeDto> {
    const previous = await this.findProject(user, id);
    const data: Prisma.ProjectUpdateInput = {};
    const changedFields: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      const name = this.requiredText(dto.name, 'Project name');
      if (name !== previous.name) changedFields.name = { from: previous.name, to: name };
      data.name = name;
    }
    if (dto.description !== undefined) {
      const description = dto.description?.trim() || null;
      if (description !== previous.description) {
        changedFields.description = { from: previous.description, to: description };
      }
      data.description = description;
    }
    if (dto.language !== undefined) {
      const language = dto.language?.trim() || null;
      if (language !== previous.language)
        changedFields.language = { from: previous.language, to: language };
      data.language = language;
    }
    if (dto.visibility !== undefined) {
      if (dto.visibility !== previous.visibility) {
        changedFields.visibility = { from: previous.visibility, to: dto.visibility };
      }
      data.visibility = dto.visibility;
    }

    const tags = dto.tags === undefined ? undefined : this.normalizeTags(dto.tags);
    if (tags !== undefined) {
      const previousTags = previous.tags.map((tag) => tag.name);
      if (JSON.stringify(previousTags) !== JSON.stringify(tags)) {
        changedFields.tags = { from: previousTags, to: tags };
      }
    }

    if (Object.keys(data).length === 0 && tags === undefined) {
      throw new UnprocessableEntityException('At least one project field must be provided');
    }
    if (data.name && data.name !== previous.name) {
      const duplicate = await this.projectRepository.findByOwnerAndName(
        previous.ownerId,
        String(data.name),
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('A project with this name already exists');
      }
    }

    const project = await this.projectRepository.update(id, data);
    if (tags !== undefined) {
      await this.projectRepository.syncTags(id, tags);
      const previousTags = previous.tags.map((tag) => tag.name);
      for (const tag of tags.filter((item) => !previousTags.includes(item))) {
        await this.projectRepository.createHistory(id, user.id, ProjectHistoryAction.TAG_ADDED, {
          tag,
        });
      }
      for (const tag of previousTags.filter((item) => !tags.includes(item))) {
        await this.projectRepository.createHistory(id, user.id, ProjectHistoryAction.TAG_REMOVED, {
          tag,
        });
      }
      this.publishTagEvents(previousTags, tags, id, project.ownerId);
    }
    await this.projectRepository.createHistory(
      id,
      user.id,
      ProjectHistoryAction.UPDATED,
      changedFields as Prisma.InputJsonObject,
    );
    this.publish(PROJECT_EVENTS.updated, project.id, project.ownerId);
    this.logger.log(`Project updated: ${project.id}`, 'ProjectsService');
    return this.findById(user, id);
  }

  async archive(user: AuthenticatedUser, id: string): Promise<ProjectResponseEnvelopeDto> {
    const previous = await this.findProject(user, id);
    const project = await this.projectRepository.archive(id);
    await this.projectRepository.createHistory(id, user.id, ProjectHistoryAction.ARCHIVED, {
      status: { from: previous.status, to: ProjectStatus.ARCHIVED },
    });
    this.publish(PROJECT_EVENTS.archived, project.id, project.ownerId);
    this.logger.log(`Project archived: ${project.id}`, 'ProjectsService');
    return this.findById(user, id);
  }

  async restore(user: AuthenticatedUser, id: string): Promise<ProjectResponseEnvelopeDto> {
    const previous = await this.findProject(user, id);
    if (previous.status !== ProjectStatus.ARCHIVED) {
      throw new UnprocessableEntityException('Only archived projects can be restored');
    }
    const project = await this.projectRepository.restore(id);
    await this.projectRepository.createHistory(id, user.id, ProjectHistoryAction.RESTORED, {
      status: { from: previous.status, to: ProjectStatus.ACTIVE },
    });
    this.publish(PROJECT_EVENTS.restored, project.id, project.ownerId);
    this.logger.log(`Project restored: ${project.id}`, 'ProjectsService');
    return this.findById(user, id);
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    const previous = await this.findProject(user, id);
    await this.projectRepository.delete(id);
    await this.projectRepository.createHistory(id, user.id, ProjectHistoryAction.DELETED, {
      status: { from: previous.status, to: ProjectStatus.DELETED },
    });
    this.publish(PROJECT_EVENTS.deleted, id, previous.ownerId);
    this.logger.log(`Project deleted: ${id}`, 'ProjectsService');
  }

  async history(user: AuthenticatedUser, id: string): Promise<ProjectHistoryListResponseDto> {
    const project = await this.projectRepository.findByIdForOwnerIncludingDeleted(
      id,
      user.role === Role.ADMIN ? undefined : user.id,
    );
    if (!project) throw new NotFoundException('Project not found');
    return { data: ProjectMapper.toHistoryResponse(await this.projectRepository.findHistory(id)) };
  }

  private async findProject(user: AuthenticatedUser, id: string) {
    const project =
      user.role === Role.ADMIN
        ? await this.projectRepository.findActiveById(id)
        : await this.projectRepository.findActiveByIdForOwner(id, user.id);

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private ownerScope(user: AuthenticatedUser): string | undefined {
    return user.role === Role.ADMIN ? undefined : user.id;
  }

  private requiredText(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) throw new UnprocessableEntityException(`${field} cannot be empty`);
    return normalized;
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) return [];
    const normalized = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
    if (normalized.some((tag) => tag.length === 0)) {
      throw new UnprocessableEntityException('Tags cannot be empty');
    }
    return normalized;
  }

  private publish(
    type: (typeof PROJECT_EVENTS)[keyof typeof PROJECT_EVENTS],
    projectId: string,
    ownerId: string,
    tag?: string,
  ): void {
    this.projectEvents.publish({
      type,
      projectId,
      ownerId,
      occurredAt: new Date().toISOString(),
      ...(tag ? { tag } : {}),
    });
  }

  private publishTagEvents(
    previous: string[],
    current: string[],
    projectId: string,
    ownerId: string,
  ): void {
    for (const tag of current.filter((item) => !previous.includes(item))) {
      this.publish(PROJECT_EVENTS.tagAdded, projectId, ownerId, tag);
    }
    for (const tag of previous.filter((item) => !current.includes(item))) {
      this.publish(PROJECT_EVENTS.tagRemoved, projectId, ownerId, tag);
    }
  }
}
