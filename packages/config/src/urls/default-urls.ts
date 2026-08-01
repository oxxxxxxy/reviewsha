import { API_BASE_PATH } from '../constants/api.js';

export const DEFAULT_URLS = {
  api: `http://localhost:3000/${API_BASE_PATH}`,
  web: 'http://localhost:5173',
  admin: 'http://localhost:5174',
  minio: 'http://localhost:9000',
  redis: 'redis://localhost:6379',
} as const;
