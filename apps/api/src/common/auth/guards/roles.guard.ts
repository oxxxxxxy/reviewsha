import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiLoggerService } from '../../logger/api-logger.service';
import type { AppRole } from '../../authorization/roles/role.constants';
import { ROLES_KEY } from '../constants/auth.constants';
import type { AuthenticatedUser } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ApiLoggerService) private readonly logger: ApiLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !roles.includes(user.role)) {
      this.logger.warn('Role authorization failed', 'RolesGuard');
      throw new ForbiddenException('Insufficient role');
    }

    this.logger.log(`Role authorization succeeded for userId=${user.id}`, 'RolesGuard');
    return true;
  }
}
