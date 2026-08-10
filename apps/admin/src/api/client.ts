import { DEFAULT_API_TIMEOUT_MS } from '@reviewsha/config';
import { createReviewshaSDK } from '@reviewsha/sdk';
import { adminEnv } from '../config/env';

export const adminApiBaseUrl = adminEnv.VITE_API_URL;

export const adminSdk = createReviewshaSDK({
  baseURL: adminApiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const adminSdkClient = adminSdk.client;
export const adminApiClient = adminSdk.client.http;
