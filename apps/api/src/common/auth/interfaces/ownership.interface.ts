export type OwnershipResourceType = 'project' | 'scan' | 'report' | 'file' | 'organization';

export interface OwnershipMetadata {
  resource: OwnershipResourceType;
  paramName: string;
}
