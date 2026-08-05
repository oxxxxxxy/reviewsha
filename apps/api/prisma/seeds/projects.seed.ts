import { SEED_FIXED_DATE, SEED_IDS, seedProjects } from './constants';
import type { SeedContext } from './types';

export async function seedProjectsModule(context: SeedContext): Promise<void> {
  for (const projectSeed of seedProjects) {
    const owner = context.usersByEmail.get(projectSeed.ownerEmail);

    if (!owner) {
      throw new Error(`Seed user not found for project owner: ${projectSeed.ownerEmail}`);
    }

    await context.prisma.project.upsert({
      where: { id: projectSeed.id },
      update: {
        ownerId: owner.id,
        organizationId: SEED_IDS.organization,
        name: projectSeed.name,
        description: projectSeed.description,
        language: projectSeed.language,
      },
      create: {
        id: projectSeed.id,
        ownerId: owner.id,
        organizationId: SEED_IDS.organization,
        name: projectSeed.name,
        description: projectSeed.description,
        language: projectSeed.language,
      },
    });

    await context.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projectSeed.id, userId: owner.id } },
      update: { role: projectSeed.memberRole },
      create: { projectId: projectSeed.id, userId: owner.id, role: projectSeed.memberRole },
    });

    await context.prisma.projectTag.deleteMany({ where: { projectId: projectSeed.id } });
    await context.prisma.projectTag.createMany({
      data: projectSeed.tags.map((name) => ({ projectId: projectSeed.id, name })),
    });
    await context.prisma.projectHistory.upsert({
      where: { id: projectSeed.historyId },
      update: {
        actorId: owner.id,
        action: 'CREATED',
        changedFields: { name: projectSeed.name, tags: projectSeed.tags },
      },
      create: {
        id: projectSeed.historyId,
        projectId: projectSeed.id,
        actorId: owner.id,
        action: 'CREATED',
        changedFields: { name: projectSeed.name, tags: projectSeed.tags },
        createdAt: SEED_FIXED_DATE,
      },
    });
  }
}
