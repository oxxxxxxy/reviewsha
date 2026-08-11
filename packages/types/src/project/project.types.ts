import type { ID, ISODateString } from '../common/utility.types.js';

export enum ProjectStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Deleted = 'DELETED',
}

export enum Visibility {
  Private = 'PRIVATE',
  Organization = 'ORGANIZATION',
  Public = 'PUBLIC',
}

export interface Project {
  id: ID;
  ownerId: ID;
  name: string;
  description?: string;
  language?: string;
  githubUrl?: string | null;
  githubBranch?: string | null;
  tags?: string[];
  status: ProjectStatus;
  visibility: Visibility;
  archivedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  stats?: {
    analysesCount: number;
    uploadsCount: number;
    reportsCount?: number;
    lastAnalysisAt: ISODateString | null;
  };
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
