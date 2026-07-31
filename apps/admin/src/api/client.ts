import { DEFAULT_API_TIMEOUT_MS, DEFAULT_URLS } from '@reviewsha/config';
import { ApiClient, createReviewshaSDK } from '@reviewsha/sdk';

export const adminApiBaseUrl = import.meta.env.VITE_API_URL ?? DEFAULT_URLS.api;

export const adminSdkClient = new ApiClient({
  baseURL: adminApiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const adminSdk = createReviewshaSDK({
  baseURL: adminApiBaseUrl,
  timeout: DEFAULT_API_TIMEOUT_MS,
});

export const adminApiClient = adminSdkClient.http;
