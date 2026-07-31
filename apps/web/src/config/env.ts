import { validateWebEnv } from './env.schema';

export const webEnv = validateWebEnv(import.meta.env);
