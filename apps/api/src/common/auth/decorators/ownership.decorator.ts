import { SetMetadata } from '@nestjs/common';
import { OWNERSHIP_KEY } from '../constants/ownership.constants';
import type { OwnershipResourceType } from '../interfaces/ownership.interface';

export function Ownership(resource: OwnershipResourceType, paramName = 'id') {
  return SetMetadata(OWNERSHIP_KEY, { resource, paramName });
}
