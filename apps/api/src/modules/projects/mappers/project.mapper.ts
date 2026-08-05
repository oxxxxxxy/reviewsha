import type { Project } from '@prisma/client';
import type { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectEntity } from '../entities/project.entity';

export class ProjectMapper {
  static toEntity(project: Project): ProjectEntity {
    return new ProjectEntity(
      project.id,
      project.ownerId,
      project.name,
      project.description,
      project.language,
      project.status,
      project.visibility,
      project.archivedAt,
      project.createdAt,
      project.updatedAt,
    );
  }

  static toResponse(project: ProjectEntity): ProjectResponseDto {
    return {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      language: project.language,
      status: project.status,
      visibility: project.visibility,
      archivedAt: project.archivedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  static toResponseList(projects: Project[]): ProjectResponseDto[] {
    return projects.map((project) => ProjectMapper.toResponse(ProjectMapper.toEntity(project)));
  }
}
