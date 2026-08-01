import { createHash } from 'node:crypto';
import {
  FindingCategory,
  MessageRole,
  ProjectRole,
  QueueStatus,
  QueueType,
  Role,
  ScanStatus,
  ScanStepStatus,
  ScanStepType,
  Severity,
} from '@prisma/client';

export const SEED_FIXED_DATE = new Date('2026-08-01T00:00:00.000Z');
export const SEED_EXPIRES_AT = new Date('2027-01-01T00:00:00.000Z');
export const DEFAULT_BUCKET = 'projects';
export const DEFAULT_MIME_TYPE = 'application/zip';
export const DEFAULT_PROVIDER = 'deepseek';
export const DEFAULT_MODEL = 'deepseek-chat';

export const DEFAULT_ADMIN_EMAIL = 'admin@reviewsha.local';
export const DEFAULT_DEVELOPER_EMAIL = 'developer@reviewsha.local';
export const DEFAULT_DEMO_EMAIL = 'demo@reviewsha.local';
export const DEFAULT_INVITEE_EMAIL = 'invitee@reviewsha.local';
export const DEFAULT_ORGANIZATION_NAME = 'Reviewsha Demo Organization';
export const DEFAULT_ORGANIZATION_SLUG = 'reviewsha-demo';
export const DEFAULT_SESSION_DEVICE = 'Seed browser';
export const DEFAULT_SESSION_IP = '127.0.0.1';
export const DEVELOPER_SESSION_TOKEN = 'developer-session-refresh-token';
export const DEVELOPER_REFRESH_TOKEN = 'developer-refresh-token';
export const DEFAULT_INVITATION_TOKEN = 'demo-invitation-token';

export const SEED_IDS = {
  organization: '00000000-0000-4000-8000-000000000010',
  projects: {
    nestApi: '00000000-0000-4000-8000-000000000101',
    reactDashboard: '00000000-0000-4000-8000-000000000102',
    linuxScripts: '00000000-0000-4000-8000-000000000103',
  },
  scans: {
    nestCompleted: '00000000-0000-4000-8000-000000000201',
    reactRunning: '00000000-0000-4000-8000-000000000202',
    scriptsFailed: '00000000-0000-4000-8000-000000000203',
  },
  chatSession: '00000000-0000-4000-8000-000000000401',
} as const;

export function hashSeedValue(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export const seedUsers = [
  {
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash: hashSeedValue('admin-password'),
    displayName: 'Reviewsha Admin',
    role: Role.ADMIN,
  },
  {
    email: DEFAULT_DEVELOPER_EMAIL,
    passwordHash: hashSeedValue('developer-password'),
    displayName: 'Developer User',
    role: Role.USER,
  },
  {
    email: DEFAULT_DEMO_EMAIL,
    passwordHash: hashSeedValue('demo-password'),
    displayName: 'Demo User',
    role: Role.USER,
  },
] as const;

export const seedProjects = [
  {
    id: SEED_IDS.projects.nestApi,
    ownerEmail: DEFAULT_DEVELOPER_EMAIL,
    memberRole: ProjectRole.OWNER,
    name: 'NestJS API',
    description: 'Demo backend service for API, Prisma and worker integration checks.',
    language: 'TypeScript',
  },
  {
    id: SEED_IDS.projects.reactDashboard,
    ownerEmail: DEFAULT_DEMO_EMAIL,
    memberRole: ProjectRole.OWNER,
    name: 'React Dashboard',
    description: 'Demo frontend dashboard used for UI and report screens.',
    language: 'TypeScript',
  },
  {
    id: SEED_IDS.projects.linuxScripts,
    ownerEmail: DEFAULT_DEVELOPER_EMAIL,
    memberRole: ProjectRole.MAINTAINER,
    name: 'Linux Scripts',
    description: 'Demo shell scripts repository with intentionally mixed quality checks.',
    language: 'Shell',
  },
] as const;

export const seedUploadedFiles = [
  {
    projectId: SEED_IDS.projects.nestApi,
    uploadedByEmail: DEFAULT_DEVELOPER_EMAIL,
    objectKey: 'projects/developer/nestjs-api/uploads/nestjs-api.zip',
    filename: 'nestjs-api.zip',
    size: 248_832n,
    checksum: 'sha256-nestjs-api-demo',
  },
  {
    projectId: SEED_IDS.projects.reactDashboard,
    uploadedByEmail: DEFAULT_DEMO_EMAIL,
    objectKey: 'projects/demo/react-dashboard/uploads/react-dashboard.zip',
    filename: 'react-dashboard.zip',
    size: 411_648n,
    checksum: 'sha256-react-dashboard-demo',
  },
  {
    projectId: SEED_IDS.projects.linuxScripts,
    uploadedByEmail: DEFAULT_DEVELOPER_EMAIL,
    objectKey: 'projects/developer/linux-scripts/uploads/linux-scripts.zip',
    filename: 'linux-scripts.zip',
    size: 97_280n,
    checksum: 'sha256-linux-scripts-demo',
  },
] as const;

export const seedScans = [
  {
    id: SEED_IDS.scans.nestCompleted,
    projectId: SEED_IDS.projects.nestApi,
    sourceObjectKey: 'projects/developer/nestjs-api/uploads/nestjs-api.zip',
    createdByEmail: DEFAULT_DEVELOPER_EMAIL,
    status: ScanStatus.COMPLETED,
    progress: 100,
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    finishedAt: new Date('2026-08-01T00:12:00.000Z'),
  },
  {
    id: SEED_IDS.scans.reactRunning,
    projectId: SEED_IDS.projects.reactDashboard,
    sourceObjectKey: 'projects/demo/react-dashboard/uploads/react-dashboard.zip',
    createdByEmail: DEFAULT_DEMO_EMAIL,
    status: ScanStatus.ANALYZING,
    progress: 64,
    startedAt: new Date('2026-08-01T00:20:00.000Z'),
    finishedAt: null,
  },
  {
    id: SEED_IDS.scans.scriptsFailed,
    projectId: SEED_IDS.projects.linuxScripts,
    sourceObjectKey: 'projects/developer/linux-scripts/uploads/linux-scripts.zip',
    createdByEmail: DEFAULT_DEVELOPER_EMAIL,
    status: ScanStatus.FAILED,
    progress: 42,
    startedAt: new Date('2026-08-01T00:40:00.000Z'),
    finishedAt: new Date('2026-08-01T00:44:00.000Z'),
  },
] as const;

export const seedScanSteps = [
  {
    scanId: SEED_IDS.scans.nestCompleted,
    type: ScanStepType.UPLOAD,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.nestCompleted,
    type: ScanStepType.EXTRACT,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.nestCompleted,
    type: ScanStepType.PARSE,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.nestCompleted,
    type: ScanStepType.ANALYZE,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.nestCompleted,
    type: ScanStepType.REPORT,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.reactRunning,
    type: ScanStepType.UPLOAD,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.reactRunning,
    type: ScanStepType.EXTRACT,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.reactRunning,
    type: ScanStepType.PARSE,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.reactRunning,
    type: ScanStepType.ANALYZE,
    status: ScanStepStatus.RUNNING,
  },
  {
    scanId: SEED_IDS.scans.scriptsFailed,
    type: ScanStepType.UPLOAD,
    status: ScanStepStatus.COMPLETED,
  },
  {
    scanId: SEED_IDS.scans.scriptsFailed,
    type: ScanStepType.EXTRACT,
    status: ScanStepStatus.FAILED,
  },
] as const;

export const seedReports = [
  {
    scanId: SEED_IDS.scans.nestCompleted,
    projectId: SEED_IDS.projects.nestApi,
    summary:
      'The NestJS API is generally well structured. The main improvements are around validation consistency, module boundaries and error handling.',
    score: 82,
    tokensUsed: 18_450,
    cost: '1.245000',
    filePath: 'reports/nestjs-api/2026-08-01/report.md',
  },
] as const;

const findingTemplates = [
  [
    'src/auth/auth.service.ts',
    Severity.HIGH,
    FindingCategory.SECURITY,
    'Token expiry validation is inconsistent',
  ],
  [
    'src/auth/jwt.strategy.ts',
    Severity.MEDIUM,
    FindingCategory.SECURITY,
    'JWT payload is not normalized',
  ],
  [
    'src/projects/projects.service.ts',
    Severity.MEDIUM,
    FindingCategory.MAINTAINABILITY,
    'Service mixes persistence and orchestration',
  ],
  [
    'src/projects/projects.controller.ts',
    Severity.LOW,
    FindingCategory.STYLE,
    'Controller response shape should use shared DTOs',
  ],
  [
    'src/files/upload.service.ts',
    Severity.HIGH,
    FindingCategory.SECURITY,
    'Archive file type validation needs stricter checks',
  ],
  [
    'src/files/storage.service.ts',
    Severity.MEDIUM,
    FindingCategory.PERFORMANCE,
    'Repeated storage metadata calls can be batched',
  ],
  [
    'src/scans/scan.service.ts',
    Severity.CRITICAL,
    FindingCategory.BUG,
    'Failed scan can remain in running state',
  ],
  [
    'src/scans/pipeline.ts',
    Severity.MEDIUM,
    FindingCategory.ARCHITECTURE,
    'Pipeline step transitions are not explicit enough',
  ],
  [
    'src/ai/ai.service.ts',
    Severity.HIGH,
    FindingCategory.SECURITY,
    'Prompt payload can include unredacted secrets',
  ],
  [
    'src/ai/token-budget.ts',
    Severity.MEDIUM,
    FindingCategory.PERFORMANCE,
    'Token budget calculation repeats file traversal',
  ],
  [
    'src/reports/report.service.ts',
    Severity.LOW,
    FindingCategory.MAINTAINABILITY,
    'Report generation needs smaller pure functions',
  ],
  [
    'src/reports/markdown.ts',
    Severity.LOW,
    FindingCategory.STYLE,
    'Markdown sections use inconsistent heading levels',
  ],
  [
    'src/chat/chat.service.ts',
    Severity.MEDIUM,
    FindingCategory.SECURITY,
    'Chat context needs project ownership verification',
  ],
  [
    'src/chat/history.ts',
    Severity.LOW,
    FindingCategory.PERFORMANCE,
    'Chat history window can be truncated earlier',
  ],
  [
    'src/admin/admin.service.ts',
    Severity.MEDIUM,
    FindingCategory.ARCHITECTURE,
    'Admin module should not depend on project internals',
  ],
  [
    'src/database/prisma.service.ts',
    Severity.LOW,
    FindingCategory.MAINTAINABILITY,
    'Database lifecycle hooks need explicit tests',
  ],
  [
    'src/common/errors/filter.ts',
    Severity.MEDIUM,
    FindingCategory.BUG,
    'Validation errors lose field path metadata',
  ],
  [
    'src/common/logger/logger.ts',
    Severity.LOW,
    FindingCategory.STYLE,
    'Logger context naming is inconsistent',
  ],
  [
    'src/queue/queue.service.ts',
    Severity.HIGH,
    FindingCategory.BUG,
    'Retry metadata is not persisted for failed jobs',
  ],
  [
    'src/queue/constants.ts',
    Severity.LOW,
    FindingCategory.MAINTAINABILITY,
    'Queue names should come from shared config',
  ],
  [
    'src/config/env.schema.ts',
    Severity.MEDIUM,
    FindingCategory.SECURITY,
    'Sensitive env values can appear in debug output',
  ],
  [
    'src/modules/module-registry.ts',
    Severity.MEDIUM,
    FindingCategory.ARCHITECTURE,
    'Module registry should be explicit and documented',
  ],
  [
    'test/scans/scan.e2e.ts',
    Severity.LOW,
    FindingCategory.TESTING,
    'Scan E2E does not cover failure transitions',
  ],
  [
    'test/reports/report.e2e.ts',
    Severity.LOW,
    FindingCategory.TESTING,
    'Report E2E needs snapshot-free assertions',
  ],
] as const;

export const seedFindings = findingTemplates.map(
  ([filePath, severity, category, title], index) => ({
    id: `00000000-0000-4000-8000-0000000003${String(index + 1).padStart(2, '0')}`,
    scanId: SEED_IDS.scans.nestCompleted,
    reportScanId: SEED_IDS.scans.nestCompleted,
    sourceObjectKey: 'projects/developer/nestjs-api/uploads/nestjs-api.zip',
    filePath,
    line: 10 + index * 3,
    column: 3 + (index % 5),
    lineStart: 10 + index * 3,
    lineEnd: 11 + index * 3,
    severity,
    category,
    title,
    description: `Seed finding ${index + 1}: ${title}. This deterministic record is used for local UI, report and QA workflows.`,
    recommendation:
      'Review the affected module, add focused tests and keep the fix aligned with architecture docs.',
  }),
);

export const seedChatMessages = [
  {
    id: '00000000-0000-4000-8000-000000000501',
    role: MessageRole.USER,
    content: 'Summarize the highest priority findings in this report.',
  },
  {
    id: '00000000-0000-4000-8000-000000000502',
    role: MessageRole.ASSISTANT,
    content:
      'The highest priority items are scan state consistency, prompt secret redaction and upload validation.',
  },
  {
    id: '00000000-0000-4000-8000-000000000503',
    role: MessageRole.USER,
    content: 'Which issue should be fixed before release?',
  },
  {
    id: '00000000-0000-4000-8000-000000000504',
    role: MessageRole.ASSISTANT,
    content:
      'Fix the failed scan state transition first because it can block report completion and confuse users.',
  },
] as const;

export const seedQueueJobs = [
  {
    id: '00000000-0000-4000-8000-000000000601',
    projectId: SEED_IDS.projects.nestApi,
    scanId: SEED_IDS.scans.nestCompleted,
    type: QueueType.SCAN,
    status: QueueStatus.COMPLETED,
    attempts: 1,
    workerId: 'worker-seed-1',
  },
  {
    id: '00000000-0000-4000-8000-000000000602',
    projectId: SEED_IDS.projects.reactDashboard,
    scanId: SEED_IDS.scans.reactRunning,
    type: QueueType.AI,
    status: QueueStatus.ACTIVE,
    attempts: 1,
    workerId: 'worker-seed-2',
  },
  {
    id: '00000000-0000-4000-8000-000000000603',
    projectId: SEED_IDS.projects.linuxScripts,
    scanId: SEED_IDS.scans.scriptsFailed,
    type: QueueType.FILE,
    status: QueueStatus.FAILED,
    attempts: 3,
    workerId: 'worker-seed-3',
  },
  {
    id: '00000000-0000-4000-8000-000000000604',
    projectId: SEED_IDS.projects.reactDashboard,
    scanId: SEED_IDS.scans.reactRunning,
    type: QueueType.REPORT,
    status: QueueStatus.WAITING,
    attempts: 0,
    workerId: null,
  },
] as const;
