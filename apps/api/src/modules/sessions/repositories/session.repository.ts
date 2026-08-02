import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RefreshTokenRepository } from '../../../repositories/auth/refresh-token.repository';

/**
 * SessionRepository is the session-domain alias for RefreshToken persistence.
 * Sessions are currently stored in the refresh_tokens table, so the repository
 * reuses the shared RefreshTokenRepository implementation while keeping the
 * Sessions module contract explicit.
 */
@Injectable()
export class SessionRepository extends RefreshTokenRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
