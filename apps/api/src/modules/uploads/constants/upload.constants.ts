export const UPLOAD_MAX_SIZE_BYTES = 100 * 1024 * 1024;
export const UPLOAD_MIN_SIZE_BYTES = 22;
export const UPLOAD_MAX_UNCOMPRESSED_BYTES = 1 * 1024 * 1024 * 1024;
export const UPLOAD_MAX_ENTRIES = 10_000;
export const UPLOAD_MAX_COMPRESSION_RATIO = 100;
export const UPLOAD_MIME_TYPE = 'application/zip';
export const UPLOAD_ALLOWED_EXTENSION = '.zip';
export const UPLOAD_SUPPORTED_EXTENSIONS = [
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.tgz',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.py',
  '.rb',
  '.php',
  '.java',
  '.kt',
  '.kts',
  '.go',
  '.rs',
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.cs',
  '.swift',
  '.dart',
  '.sh',
  '.bash',
  '.sql',
  '.graphql',
  '.vue',
  '.svelte',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.xml',
  '.toml',
  '.ini',
  '.env.example',
  '.yaml',
  '.yml',
  '.md',
  '.mdx',
  '.txt',
  '.rst',
  '.csv',
  '.log',
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.rtf',
  '.xls',
  '.xlsx',
  '.ods',
  '.ppt',
  '.pptx',
  '.odp',
];
// These directories are intentionally retained in the uploaded object but are
// ignored by the parser and AI context builder. Rejecting an otherwise valid
// project archive just because a user zipped its working tree made common
// exports (for example, a repository containing `.git` or `node_modules`)
// impossible to upload. Security-sensitive files and traversal paths remain
// rejected by the validator.
export const UPLOAD_IGNORED_PATHS = ['.git/', 'node_modules/', 'dist/', 'build/'];
export const UPLOAD_FORBIDDEN_FILES = ['.env'];
