import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { DEFAULT_API_TIMEOUT_MS, DEFAULT_URLS } from '@reviewsha/config';

/** Supplies an access token for SDK requests at call time. */
export type AccessTokenProvider = () => string | null | undefined;
export type RefreshTokenHandler = () => Promise<string | null>;

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
  private refreshHandler?: RefreshTokenHandler;
  private refreshing?: Promise<string | null>;
  private readonly baseURL: string;

  constructor(options: ApiClientOptions = {}) {
    this.accessToken = options.accessToken;
    this.getAccessToken = options.getAccessToken;

    this.baseURL = options.baseURL ?? DEFAULT_URLS.api;
    this.http = axios.create({
      baseURL: this.baseURL,
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
    this.http.interceptors.response.use(undefined, async (error: unknown) => {
      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 401 ||
        !this.refreshHandler ||
        error.config?.url?.includes('/auth/refresh')
      ) {
        throw error;
      }
      const config = error.config;
      if (!config || (config as AxiosRequestConfig & { _retry?: boolean })._retry) throw error;
      (config as AxiosRequestConfig & { _retry?: boolean })._retry = true;
      this.refreshing ??= this.refreshHandler().finally(() => {
        this.refreshing = undefined;
      });
      const token = await this.refreshing;
      if (!token) throw error;
      this.setAccessToken(token);
      return this.http.request(config);
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

  setRefreshTokenHandler(handler?: RefreshTokenHandler): void {
    this.refreshHandler = handler;
  }

  /** Streams an SSE response while preserving the shared auth/refresh policy. */
  async stream(
    url: string,
    body: unknown,
    onEvent: (event: { event: string; data: unknown }) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const request = async (retry = false): Promise<Response> => {
      const token = this.getAccessToken?.() ?? this.accessToken;
      const streamUrl = `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
      if (response.status === 401 && !retry && this.refreshHandler) {
        const refreshed = await this.refreshHandler();
        if (refreshed) {
          this.setAccessToken(refreshed);
          return request(true);
        }
      }
      if (!response.ok) throw new Error(`Streaming request failed with status ${response.status}`);
      return response;
    };

    const response = await request();
    if (!response.body) throw new Error('Streaming response has no body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const raw of events) {
        const event = raw.match(/^event:\s*(.+)$/m)?.[1] ?? 'message';
        const data = raw.match(/^data:\s*(.+)$/m)?.[1];
        if (data !== undefined) {
          try {
            onEvent({ event, data: JSON.parse(data) });
          } catch {
            onEvent({ event, data });
          }
        }
      }
      if (chunk.done) break;
    }
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
