import type { ProjectStatus, Visibility } from '@prisma/client';

/** Domain representation of a project, independent from HTTP response DTOs. */
export class ProjectEntity {
  constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly name: string,
    readonly description: string | null,
    readonly language: string | null,
    readonly githubUrl: string | null,
    readonly githubBranch: string | null,
    readonly status: ProjectStatus,
    readonly visibility: Visibility,
    readonly archivedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly tags: string[],
    readonly stats: {
      analysesCount: number;
      uploadsCount: number;
      reportsCount?: number;
      lastAnalysisAt: Date | null;
    },
  ) {}
}
