import type { Project } from '@prisma/client';
import type { ProjectResponseDto } from '../dto/project-response.dto';
import { ProjectEntity } from '../entities/project.entity';
import type {
  ProjectDetails,
  ProjectHistoryWithActor,
} from '../../../repositories/project/project.repository.interface';

export class ProjectMapper {
  static toEntity(project: Project | ProjectDetails): ProjectEntity {
    const details = project as ProjectDetails;
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
      details.tags?.map((tag) => tag.name) ?? [],
      {
        analysesCount: details._count?.scans ?? 0,
        uploadsCount: details._count?.uploadedFiles ?? 0,
        lastAnalysisAt: details.scans?.[0]?.createdAt ?? null,
      },
    );
  }

  static toResponse(project: ProjectEntity): ProjectResponseDto {
    return {
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      description: project.description,
      language: project.language,
      tags: project.tags,
      status: project.status,
      visibility: project.visibility,
      archivedAt: project.archivedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      stats: {
        analysesCount: project.stats.analysesCount,
        uploadsCount: project.stats.uploadsCount,
        lastAnalysisAt: project.stats.lastAnalysisAt?.toISOString() ?? null,
      },
    };
  }

  static toResponseList(projects: Array<Project | ProjectDetails>): ProjectResponseDto[] {
    return projects.map((project) => ProjectMapper.toResponse(ProjectMapper.toEntity(project)));
  }

  static toHistoryResponse(history: ProjectHistoryWithActor[]) {
    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorId: entry.actorId,
      actorEmail: entry.actor.email,
      changedFields: (entry.changedFields as Record<string, unknown> | null) ?? null,
      createdAt: entry.createdAt.toISOString(),
    }));
  }
}
