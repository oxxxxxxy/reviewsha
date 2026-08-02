import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth.constants';
import type { AppRole } from '../../authorization/roles/role.constants';

export const Roles = (...roles: readonly AppRole[]) => SetMetadata(ROLES_KEY, roles);
