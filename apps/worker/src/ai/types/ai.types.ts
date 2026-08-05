export type AIFileRole =
  | 'controller'
  | 'service'
  | 'repository'
  | 'component'
  | 'config'
  | 'test'
  | 'migration'
  | 'source'
  | 'documentation';
export type AIFile = {
  path: string;
  language?: string;
  size: number;
  content?: string;
  role: AIFileRole;
};
export type AIProjectMetadata = {
  projectId: string;
  name?: string;
  type: string;
  languages: string[];
  filesCount: number;
  totalBytes: number;
  categories: string[];
};
export type AIProject = {
  projectId: string;
  name?: string;
  files: AIFile[];
  structure: string[];
  languages?: string[];
  metadata?: Record<string, unknown>;
};
export type AIChunkType = 'file' | 'module' | 'architecture';
export type AIChunk = {
  id: string;
  type: AIChunkType;
  path: string;
  language?: string;
  content: string;
  tokens: number;
  filePaths: string[];
};
export type AITask = 'architecture' | 'bugs' | 'security' | 'quality' | 'performance';
export type LLMRequest = {
  system: string;
  prompt: string;
  outputFormat: 'json';
  chunks: AIChunk[];
  task: AITask;
};
export type AIReviewIssue = {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  file: string;
  line?: number;
  problem: string;
  recommendation: string;
};
export type AIReviewResult = {
  issues: AIReviewIssue[];
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
};
