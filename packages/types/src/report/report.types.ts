import type { ID, ISODateString } from '../common/utility.types.js';

export enum ScanStatus {
  Created = 'CREATED',
  Queued = 'QUEUED',
  Extracting = 'EXTRACTING',
  Parsing = 'PARSING',
  Analyzing = 'ANALYZING',
  Aggregating = 'AGGREGATING',
  Reporting = 'REPORTING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export enum ReportFormat {
  Markdown = 'md',
  Pdf = 'pdf',
  Json = 'json',
}

export interface Scan {
  id: ID;
  projectId: ID;
  status: ScanStatus;
  progress: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Report {
  id: ID;
  projectId: ID;
  scanId: ID;
  score?: number;
  summary?: string;
  createdAt: ISODateString;
}
