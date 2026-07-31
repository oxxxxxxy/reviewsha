import type { ID, ISODateString } from '../common/utility.types.js';

export enum ProjectStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Deleted = 'DELETED',
}

export interface Project {
  id: ID;
  ownerId: ID;
  name: string;
  description?: string;
  language?: string;
  tags: string[];
  status: ProjectStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface File {
  id: ID;
  projectId: ID;
  originalName: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: ISODateString;
}
