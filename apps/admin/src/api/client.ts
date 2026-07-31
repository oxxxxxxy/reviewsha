import axios from 'axios';

export const adminApiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const adminApiClient = axios.create({
  baseURL: adminApiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

adminApiClient.interceptors.request.use((config) => {
  // Admin access token will be attached here after Auth module implementation.
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Admin API errors will be normalized here after SDK layer implementation.
    return Promise.reject(error);
  },
);
