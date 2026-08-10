import { DEFAULT_API_TIMEOUT_MS } from '@reviewsha/config';
import { createReviewshaSDK } from '@reviewsha/sdk';
import { webEnv } from '../config/env';

export const apiBaseUrl = webEnv.VITE_API_URL;

export const reviewshaSdk = createReviewshaSDK({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const sdkClient = reviewshaSdk.client;
export const apiClient = reviewshaSdk.client.http;
