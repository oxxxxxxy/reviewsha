import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiLoggerService } from '../../logger/api-logger.service';
import { OWNERSHIP_KEY } from '../constants/ownership.constants';
import type { AuthenticatedUser } from '../types/auth.types';
import type { OwnershipMetadata } from '../interfaces/ownership.interface';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: ApiLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<OwnershipMetadata>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    const resourceId = request.params?.[metadata.paramName];

    if (!user || !resourceId) {
      this.logger.warn(`Ownership denied: missing user or resource`, 'OwnershipGuard');
      throw new ForbiddenException('Access to resource is forbidden');
    }

    this.logger.warn(
      `Ownership checker not configured resource=${metadata.resource} userId=${user.id}`,
      'OwnershipGuard',
    );
    throw new ForbiddenException('Access to resource is forbidden');
  }
}
