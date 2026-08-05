import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ApiLoggerService } from '../../../common/logger/api-logger.service';
import type { AuthenticatedUser } from '../../../common/auth/types/auth.types';
import { ProjectRepository } from '../../../repositories/project/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectFilterDto } from '../dto/project-filter.dto';
import { ProjectResponseEnvelopeDto, ProjectsListResponseDto } from '../dto/project-response.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectEvents, PROJECT_EVENTS } from '../events/project.events';
import { ProjectMapper } from '../mappers/project.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectEvents: ProjectEvents,
    private readonly logger: ApiLoggerService,
  ) {}

  async findAll(
    user: AuthenticatedUser,
    filter: ProjectFilterDto,
  ): Promise<ProjectsListResponseDto> {
    const result = await this.projectRepository.findMany({
      ownerId: this.ownerScope(user),
      search: filter.search?.trim() || undefined,
      status: filter.status,
      visibility: filter.visibility,
      sort: filter.sort,
      order: filter.order,
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });

    return {
      data: ProjectMapper.toResponseList(result.items),
      meta: {
        page: filter.page,
        limit: filter.limit,
        total: result.total,
        pages: Math.ceil(result.total / filter.limit),
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
    const name = dto.name.trim();
    if (!name) {
      throw new UnprocessableEntityException('Project name cannot be empty');
    }

    const project = await this.projectRepository.create({
      owner: { connect: { id: user.id } },
      name,
      description: dto.description?.trim() || null,
      language: dto.language?.trim() || null,
      visibility: dto.visibility,
    });

    this.publish(PROJECT_EVENTS.created, project.id, project.ownerId);
    this.logger.log(`Project created: ${project.id}`, 'ProjectsService');
    return { data: ProjectMapper.toResponse(ProjectMapper.toEntity(project)) };
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseEnvelopeDto> {
    await this.findProject(user, id);

    const data: Prisma.ProjectUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new UnprocessableEntityException('Project name cannot be empty');
      }
      data.name = name;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.language !== undefined) data.language = dto.language?.trim() || null;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;

    if (Object.keys(data).length === 0) {
      throw new UnprocessableEntityException('At least one project field must be provided');
    }

    const project = await this.projectRepository.update(id, data);
    this.publish(PROJECT_EVENTS.updated, project.id, project.ownerId);
    this.logger.log(`Project updated: ${project.id}`, 'ProjectsService');
    return { data: ProjectMapper.toResponse(ProjectMapper.toEntity(project)) };
  }

  async archive(user: AuthenticatedUser, id: string): Promise<ProjectResponseEnvelopeDto> {
    await this.findProject(user, id);
    const project = await this.projectRepository.archive(id);
    this.publish(PROJECT_EVENTS.archived, project.id, project.ownerId);
    this.logger.log(`Project archived: ${project.id}`, 'ProjectsService');
    return { data: ProjectMapper.toResponse(ProjectMapper.toEntity(project)) };
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    const project = await this.findProject(user, id);
    await this.projectRepository.delete(id);
    this.publish(PROJECT_EVENTS.deleted, project.id, project.ownerId);
    this.logger.log(`Project deleted: ${project.id}`, 'ProjectsService');
  }

  private async findProject(user: AuthenticatedUser, id: string) {
    const project =
      user.role === Role.ADMIN
        ? await this.projectRepository.findActiveById(id)
        : await this.projectRepository.findActiveByIdForOwner(id, user.id);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private ownerScope(user: AuthenticatedUser): string | undefined {
    return user.role === Role.ADMIN ? undefined : user.id;
  }

  private publish(
    type: (typeof PROJECT_EVENTS)[keyof typeof PROJECT_EVENTS],
    projectId: string,
    ownerId: string,
  ): void {
    this.projectEvents.publish({
      type,
      projectId,
      ownerId,
      occurredAt: new Date().toISOString(),
    });
  }
}
