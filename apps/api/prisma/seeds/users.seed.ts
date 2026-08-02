import type { User } from '@prisma/client';
import { ProjectRole } from '@prisma/client';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_DEVELOPER_EMAIL,
  DEFAULT_INVITEE_EMAIL,
  DEFAULT_INVITATION_TOKEN,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
  DEFAULT_SESSION_DEVICE,
  DEFAULT_SESSION_IP,
  DEVELOPER_REFRESH_TOKEN,
  DEVELOPER_SESSION_TOKEN,
  SEED_EXPIRES_AT,
  SEED_IDS,
  hashSeedValue,
  seedUsers,
} from './constants';
import type { SeedContext } from './types';

export async function seedUsersModule(context: SeedContext): Promise<Map<string, User>> {
  const usersByEmail = new Map<string, User>();

  for (const userSeed of seedUsers) {
    const user = await context.prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        displayName: userSeed.displayName,
        passwordHash: userSeed.passwordHash,
        role: userSeed.role,
        isActive: true,
      },
      create: {
        email: userSeed.email,
        passwordHash: userSeed.passwordHash,
        displayName: userSeed.displayName,
        role: userSeed.role,
        isActive: true,
      },
    });

    usersByEmail.set(user.email, user);
  }

  const admin = usersByEmail.get(DEFAULT_ADMIN_EMAIL);
  const developer = usersByEmail.get(DEFAULT_DEVELOPER_EMAIL);

  if (!admin || !developer) {
    throw new Error('Required seed users were not created');
  }

  await context.prisma.session.upsert({
    where: { refreshTokenHash: hashSeedValue(DEVELOPER_SESSION_TOKEN) },
    update: {
      userId: developer.id,
      revokedAt: null,
      expiresAt: SEED_EXPIRES_AT,
    },
    create: {
      userId: developer.id,
      refreshTokenHash: hashSeedValue(DEVELOPER_SESSION_TOKEN),
      device: DEFAULT_SESSION_DEVICE,
      ip: DEFAULT_SESSION_IP,
      expiresAt: SEED_EXPIRES_AT,
    },
  });

  await context.prisma.refreshToken.upsert({
    where: { tokenHash: hashSeedValue(DEVELOPER_REFRESH_TOKEN) },
    update: {
      userId: developer.id,
      revokedAt: null,
      expiresAt: SEED_EXPIRES_AT,
      jti: 'seed-refresh-token-jti',
    },
    create: {
      userId: developer.id,
      tokenHash: hashSeedValue(DEVELOPER_REFRESH_TOKEN),
      jti: 'seed-refresh-token-jti',
      expiresAt: SEED_EXPIRES_AT,
    },
  });

  await context.prisma.organization.upsert({
    where: { slug: DEFAULT_ORGANIZATION_SLUG },
    update: {
      ownerId: admin.id,
      name: DEFAULT_ORGANIZATION_NAME,
    },
    create: {
      id: SEED_IDS.organization,
      ownerId: admin.id,
      name: DEFAULT_ORGANIZATION_NAME,
      slug: DEFAULT_ORGANIZATION_SLUG,
    },
  });

  await context.prisma.invitation.upsert({
    where: { tokenHash: hashSeedValue(DEFAULT_INVITATION_TOKEN) },
    update: {
      organizationId: SEED_IDS.organization,
      invitedById: admin.id,
      email: DEFAULT_INVITEE_EMAIL,
      role: ProjectRole.VIEWER,
      expiresAt: SEED_EXPIRES_AT,
    },
    create: {
      organizationId: SEED_IDS.organization,
      invitedById: admin.id,
      email: DEFAULT_INVITEE_EMAIL,
      role: ProjectRole.VIEWER,
      tokenHash: hashSeedValue(DEFAULT_INVITATION_TOKEN),
      expiresAt: SEED_EXPIRES_AT,
    },
  });

  context.usersByEmail = usersByEmail;
  return usersByEmail;
}
