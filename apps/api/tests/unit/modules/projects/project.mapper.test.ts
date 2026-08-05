import { ProjectStatus, Visibility, type Project } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ProjectMapper } from '../../../../src/modules/projects/mappers/project.mapper';

describe('ProjectMapper', () => {
  it('maps Prisma dates and fields to a response DTO without exposing persistence details', () => {
    const now = new Date('2026-08-05T12:00:00.000Z');
    const project: Project = {
      id: 'project-id',
      ownerId: 'owner-id',
      organizationId: null,
      name: 'Reviewsha',
      description: null,
      language: 'TypeScript',
      visibility: Visibility.PRIVATE,
      status: ProjectStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
    };

    expect(ProjectMapper.toResponse(ProjectMapper.toEntity(project))).toEqual({
      id: 'project-id',
      ownerId: 'owner-id',
      name: 'Reviewsha',
      description: null,
      language: 'TypeScript',
      status: ProjectStatus.ACTIVE,
      visibility: Visibility.PRIVATE,
      archivedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags: [],
      stats: { analysesCount: 0, uploadsCount: 0, lastAnalysisAt: null },
    });
  });
});
