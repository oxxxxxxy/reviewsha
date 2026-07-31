import { DEFAULT_API_TIMEOUT_MS } from '@reviewsha/config';
import { ApiClient, createReviewshaSDK } from '@reviewsha/sdk';
import { webEnv } from '../config/env';

export const apiBaseUrl = webEnv.VITE_API_URL;

export const sdkClient = new ApiClient({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const reviewshaSdk = createReviewshaSDK({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const apiClient = sdkClient.http;
