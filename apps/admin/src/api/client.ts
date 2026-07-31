import { DEFAULT_API_TIMEOUT_MS } from '@reviewsha/config';
import { ApiClient, createReviewshaSDK } from '@reviewsha/sdk';
import { adminEnv } from '../config/env';

export const adminApiBaseUrl = adminEnv.VITE_API_URL;

export const adminSdkClient = new ApiClient({
  baseURL: adminApiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const adminSdk = createReviewshaSDK({
  baseURL: adminApiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const adminApiClient = adminSdkClient.http;
