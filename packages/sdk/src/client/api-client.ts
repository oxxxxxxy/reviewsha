import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { DEFAULT_API_TIMEOUT_MS, DEFAULT_URLS } from '@reviewsha/config';

/** Supplies an access token for SDK requests at call time. */
export type AccessTokenProvider = () => string | null | undefined;

/** Runtime options used to configure the shared Axios-backed API client. */
export interface ApiClientOptions {
  readonly baseURL?: string;
  readonly timeout?: number;
  readonly accessToken?: string;
  readonly getAccessToken?: AccessTokenProvider;
  readonly headers?: Record<string, string>;
}

/**
 * Thin Axios wrapper used by shared domain API services.
 *
 * It centralizes base URL, timeouts, JSON headers and Authorization header
 * handling so applications do not duplicate request wiring.
 */
export class ApiClient {
  readonly http: AxiosInstance;
  private accessToken?: string;
  private readonly getAccessToken?: AccessTokenProvider;

  constructor(options: ApiClientOptions = {}) {
    this.accessToken = options.accessToken;
    this.getAccessToken = options.getAccessToken;

    this.http = axios.create({
      baseURL: options.baseURL ?? DEFAULT_URLS.api,
      timeout: options.timeout ?? DEFAULT_API_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    this.http.interceptors.request.use((config) => {
      const token = this.getAccessToken?.() ?? this.accessToken;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });
  }

  /** Stores a bearer token for subsequent SDK requests. */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /** Removes the stored bearer token from subsequent SDK requests. */
  clearAccessToken(): void {
    this.accessToken = undefined;
  }

  async get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> {
    return this.unwrap(this.http.get<TResponse>(url, config));
  }

  async post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    return this.unwrap(this.http.post<TResponse>(url, body, config));
  }

  async patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<TResponse> {
    return this.unwrap(this.http.patch<TResponse>(url, body, config));
  }

  async delete<TResponse>(url: string, config?: AxiosRequestConfig): Promise<TResponse> {
    return this.unwrap(this.http.delete<TResponse>(url, config));
  }

  private async unwrap<TResponse>(request: Promise<AxiosResponse<TResponse>>): Promise<TResponse> {
    const response = await request;
    return response.data;
  }
}
