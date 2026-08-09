import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiLoggerService } from '../../logger/api-logger.service';
import { OWNERSHIP_KEY } from '../constants/ownership.constants';
import type { AuthenticatedUser } from '../types/auth.types';
import type { OwnershipMetadata } from '../interfaces/ownership.interface';
import { ProjectRepository } from '../../../repositories/project/project.repository';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ApiLoggerService,
    private readonly projects: ProjectRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OwnershipMetadata>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    const rawResourceId = request.params?.[metadata.paramName];
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;

    if (!user || !resourceId) {
      this.logger.warn(`Ownership denied: missing user or resource`, 'OwnershipGuard');
      throw new ForbiddenException('Access to resource is forbidden');
    }
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) return true;
    if (metadata.resource === 'project') {
      const project = await this.projects.findByIdForOwnerIncludingDeleted(resourceId, user.id);
      if (project) return true;
    }
    this.logger.warn(
      `Ownership denied resource=${metadata.resource} userId=${user.id}`,
      'OwnershipGuard',
    );
    throw new ForbiddenException('Access to resource is forbidden');
  }
}
