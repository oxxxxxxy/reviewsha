import { validateAdminEnv } from './env.schema';

export const adminEnv = validateAdminEnv(import.meta.env);
