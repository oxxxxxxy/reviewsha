import { MessageRole } from '@prisma/client';
import { DEFAULT_DEVELOPER_EMAIL, SEED_IDS, seedChatMessages } from './constants';
import type { SeedContext } from './types';

export async function seedChatsModule(context: SeedContext): Promise<void> {
  const developer = context.usersByEmail.get(DEFAULT_DEVELOPER_EMAIL);
  const report = context.reportsByScanId.get(SEED_IDS.scans.nestCompleted);

  if (!developer) {
    throw new Error(`Seed chat user not found: ${DEFAULT_DEVELOPER_EMAIL}`);
  }

  if (!report) {
    throw new Error(`Seed chat report not found: ${SEED_IDS.scans.nestCompleted}`);
  }

  const chatSession = await context.prisma.chatSession.upsert({
    where: { id: SEED_IDS.chatSession },
    update: {
      projectId: SEED_IDS.projects.nestApi,
      reportId: report.id,
      userId: developer.id,
      title: 'NestJS API report review',
    },
    create: {
      id: SEED_IDS.chatSession,
      projectId: SEED_IDS.projects.nestApi,
      reportId: report.id,
      userId: developer.id,
      title: 'NestJS API report review',
    },
  });

  for (const chatMessageSeed of seedChatMessages) {
    await context.prisma.chatMessage.upsert({
      where: { id: chatMessageSeed.id },
      update: {
        sessionId: chatSession.id,
        userId: chatMessageSeed.role === MessageRole.USER ? developer.id : null,
        role: chatMessageSeed.role,
        content: chatMessageSeed.content,
      },
      create: {
        id: chatMessageSeed.id,
        sessionId: chatSession.id,
        userId: chatMessageSeed.role === MessageRole.USER ? developer.id : null,
        role: chatMessageSeed.role,
        content: chatMessageSeed.content,
      },
    });
  }
}
