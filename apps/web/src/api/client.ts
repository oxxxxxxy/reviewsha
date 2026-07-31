import { DEFAULT_API_TIMEOUT_MS, DEFAULT_URLS } from '@reviewsha/config';
import { ApiClient, createReviewshaSDK } from '@reviewsha/sdk';

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_URLS.api;

export const sdkClient = new ApiClient({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const reviewshaSdk = createReviewshaSDK({
  baseURL: apiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const apiClient = sdkClient.http;
