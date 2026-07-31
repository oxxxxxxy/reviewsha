import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Auth token will be attached here after Auth module implementation.
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // API errors will be normalized here after SDK layer implementation.
    return Promise.reject(error);
  },
);
